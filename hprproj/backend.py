"""
Causality-Aware Knowledge Tracing System - Backend
Educational Hackathon Demo

This system demonstrates:
- Concept-level latent mastery estimation
- Explicit prerequisite dependencies via directed concept graph
- Causal performance model separating mastery from confounders
- Counterfactual reasoning without retraining
"""

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from typing import Dict, List, Tuple, Optional
import json
import csv
import io
from datetime import datetime


# ============================================================================
# SECTION 1: CONCEPT GRAPH
# ============================================================================

class ConceptGraph:
    """Represents curriculum as a directed graph with prerequisite relationships."""
    
    def __init__(self, concepts: List[str]):
        self.concepts = concepts
        self.n_concepts = len(concepts)
        self.concept_to_idx = {c: i for i, c in enumerate(concepts)}
        # Adjacency matrix: adj[i][j] = 1 if concept i is prerequisite for concept j
        self.adjacency = np.zeros((self.n_concepts, self.n_concepts), dtype=int)
    
    def add_prerequisite(self, prerequisite: str, dependent: str):
        """Add edge: prerequisite -> dependent"""
        pre_idx = self.concept_to_idx[prerequisite]
        dep_idx = self.concept_to_idx[dependent]
        self.adjacency[pre_idx][dep_idx] = 1
    
    def get_prerequisites(self, concept: str) -> List[str]:
        """Get all direct prerequisites for a concept"""
        concept_idx = self.concept_to_idx[concept]
        prereq_indices = np.where(self.adjacency[:, concept_idx] == 1)[0]
        return [self.concepts[i] for i in prereq_indices]
    
    def get_dependents(self, concept: str) -> List[str]:
        """Get all concepts that depend on this concept"""
        concept_idx = self.concept_to_idx[concept]
        dep_indices = np.where(self.adjacency[concept_idx, :] == 1)[0]
        return [self.concepts[i] for i in dep_indices]
    
    def to_dict(self) -> Dict:
        """Export graph structure for visualization"""
        edges = []
        for i in range(self.n_concepts):
            for j in range(self.n_concepts):
                if self.adjacency[i][j] == 1:
                    edges.append({
                        'source': self.concepts[i],
                        'target': self.concepts[j]
                    })
        return {
            'nodes': [{'id': c, 'label': c} for c in self.concepts],
            'edges': edges
        }


# ============================================================================
# SECTION 2: STUDENT MODEL / MASTERY STATE
# ============================================================================

class StudentModel:
    """Maintains latent mastery state for each student across all concepts."""
    
    def __init__(self, student_id: str, n_concepts: int, metadata: Optional[Dict] = None):
        self.student_id = student_id
        self.n_concepts = n_concepts
        # Student metadata with sensible defaults
        self.metadata = metadata or {
            'school': 'Unknown School',
            'age': None,
            'grade': 'Unknown Grade',
            'class': None,
            'uploaded_at': datetime.now().isoformat()
        }
        # Latent mastery values M[c] ∈ [0,1] for each concept c
        self.mastery = np.random.uniform(0.2, 0.5, n_concepts)
        self.practice_counts = np.zeros(n_concepts, dtype=int)
    
    def get_mastery(self, concept_idx: int) -> float:
        """Get current mastery level for a concept"""
        return float(self.mastery[concept_idx])
    
    def set_mastery(self, concept_idx: int, value: float):
        """Set mastery level (used for interventions)"""
        self.mastery[concept_idx] = np.clip(value, 0.0, 1.0)
    
    def update_mastery(self, concept_idx: int, is_correct: bool, learning_rate: float = 0.1):
        """Update mastery based on practice outcome"""
        self.practice_counts[concept_idx] += 1
        if is_correct:
            # Learning gain
            gain = learning_rate * (1 - self.mastery[concept_idx])
            self.mastery[concept_idx] += gain
        else:
            # Small forgetting/adjustment
            self.mastery[concept_idx] *= 0.95
        
        # Natural forgetting over time for all concepts
        forgetting = 0.01
        self.mastery = np.maximum(0, self.mastery - forgetting)
    
    def to_dict(self) -> Dict:
        """Export mastery state"""
        return {
            'student_id': self.student_id,
            'mastery': self.mastery.tolist(),
            'practice_counts': self.practice_counts.tolist(),
            'metadata': self.metadata
        }


# ============================================================================
# SECTION 3: CAUSAL PERFORMANCE MODEL
# ============================================================================

class PerformanceModel:
    """
    Causal model for predicting student performance.
    
    P(correct) = sigmoid(α*mastery_target + β*avg_mastery_prereqs - γ_d*Difficulty - γ_t*Time - γ_l*Language)
    
    Separates true mastery from confounding factors.
    """
    
    def __init__(
        self, 
        alpha: float = 4.0, 
        beta: float = 2.0, 
        gamma_d: float = 3.0,
        gamma_t: float = 1.5,
        gamma_l: float = 1.0,
        # Legacy support for old calls (gamma maps to gamma_d/t/l roughly)
        gamma: Optional[float] = None 
    ):
        # Calibrated parameters (logit space)
        self.alpha = alpha
        self.beta = beta
        
        if gamma is not None:
            # If simplistic gamma provided, use it for all keys or distribute it
            self.gamma_d = gamma * 2.0 # Difficulty is heavily weighted
            self.gamma_t = gamma 
            self.gamma_l = gamma
        else:
            self.gamma_d = gamma_d
            self.gamma_t = gamma_t
            self.gamma_l = gamma_l

    @staticmethod
    def sigmoid(x: float) -> float:
        """Stable sigmoid function"""
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))
    
    def predict_performance(
        self,
        target_mastery: float,
        prereq_mastery: List[float],
        difficulty: float = 0.5,
        time_pressure: float = 0.5,
        language_complexity: float = 0.5
    ) -> float:
        """
        Predict probability of correct answer based on mastery and explicit confounders.
        """
        # Average prerequisite mastery
        avg_prereq = np.mean(prereq_mastery) if prereq_mastery else 0.0
        
        # Causal Equation:
        # P = sigmoid( α*M + β*P - (γ_d*D + γ_t*T + γ_l*L) )
        logit = (
            self.alpha * target_mastery +
            self.beta * avg_prereq - 
            (self.gamma_d * difficulty + 
             self.gamma_t * time_pressure + 
             self.gamma_l * language_complexity)
        )
        
        return self.sigmoid(logit)
    
    def explain_prediction(
        self,
        target_mastery: float,
        prereq_mastery: List[float],
        difficulty: float,
        time_pressure: float,
        language_complexity: float
    ) -> Dict:
        """Provide causal explanation of prediction"""
        avg_prereq = np.mean(prereq_mastery) if prereq_mastery else 0.0
        
        # Calculate confounder contribution for explanation
        confounder_loss = -(
            self.gamma_d * difficulty + 
            self.gamma_t * time_pressure + 
            self.gamma_l * language_complexity
        )
        
        prob = self.predict_performance(
            target_mastery, prereq_mastery,
            difficulty, time_pressure, language_complexity
        )
        
        return {
            'probability': float(prob),
            'components': {
                'target_mastery_contribution': float(self.alpha * target_mastery),
                'prerequisite_contribution': float(self.beta * avg_prereq),
                'confounder_contribution': float(confounder_loss)
            },
            'factors': {
                'target_mastery': float(target_mastery),
                'avg_prerequisite_mastery': float(avg_prereq),
                'difficulty': float(difficulty),
                'time_pressure': float(time_pressure),
                'language_complexity': float(language_complexity)
            },
            'breakdown': {
                 'difficulty_impact': float(-self.gamma_d * difficulty),
                 'time_pressure_impact': float(-self.gamma_t * time_pressure),
                 'language_complexity_impact': float(-self.gamma_l * language_complexity)
            }
        }


# ============================================================================
# SECTION 4: COUNTERFACTUAL ENGINE
# ============================================================================

class CounterfactualEngine:
    """
    Enables counterfactual reasoning: "What if student had mastery X in concept Y?"
    
    Interventions propagate through the concept graph without retraining.
    """
    
    def __init__(self, concept_graph: ConceptGraph, performance_model: PerformanceModel):
        self.graph = concept_graph
        self.perf_model = performance_model
    
    def intervene(
        self,
        student: StudentModel,
        concept: str,
        new_mastery: float
    ) -> Dict:
        """
        Apply counterfactual intervention.
        
        Args:
            student: Student model to intervene on (creates copy)
            concept: Concept to intervene on
            new_mastery: Hypothetical mastery value [0,1]
        
        Returns:
            Dictionary with before/after analysis
        """
        concept_idx = self.graph.concept_to_idx[concept]
        
        # Capture before state
        before_mastery = student.get_mastery(concept_idx)
        
        # Create counterfactual student (clone)
        cf_student = StudentModel(f"{student.student_id}_counterfactual", student.n_concepts)
        cf_student.mastery = student.mastery.copy()
        
        # Apply intervention
        cf_student.set_mastery(concept_idx, new_mastery)
        
        # Propagate effects to dependent concepts
        # (simplified: boost dependents proportionally)
        dependents = self.graph.get_dependents(concept)
        mastery_delta = new_mastery - before_mastery
        
        for dep in dependents:
            dep_idx = self.graph.concept_to_idx[dep]
            # Dependents improve by 30% of the intervention effect
            propagation_factor = 0.3
            new_dep_mastery = cf_student.get_mastery(dep_idx) + (mastery_delta * propagation_factor)
            cf_student.set_mastery(dep_idx, new_dep_mastery)
        
        return {
            'intervention': {
                'concept': concept,
                'before_mastery': float(before_mastery),
                'after_mastery': float(new_mastery),
                'delta': float(new_mastery - before_mastery)
            },
            'original_student': student.to_dict(),
            'counterfactual_student': cf_student.to_dict(),
            'affected_concepts': [concept] + dependents
        }
    
    def compare_performance(
        self,
        original_student: StudentModel,
        cf_student: StudentModel,
        test_concept: str,
        difficulty: float = 0.5,
        time_pressure: float = 0.5,
        language_complexity: float = 0.5
    ) -> Dict:
        """Compare predicted performance before and after intervention"""
        test_idx = self.graph.concept_to_idx[test_concept]
        prereqs = self.graph.get_prerequisites(test_concept)
        
        # Original prediction
        orig_target = original_student.get_mastery(test_idx)
        orig_prereq = [original_student.get_mastery(self.graph.concept_to_idx[p]) for p in prereqs]
        orig_prob = self.perf_model.predict_performance(
            orig_target, orig_prereq, difficulty, time_pressure, language_complexity
        )
        
        # Counterfactual prediction
        cf_target = cf_student.get_mastery(test_idx)
        cf_prereq = [cf_student.get_mastery(self.graph.concept_to_idx[p]) for p in prereqs]
        cf_prob = self.perf_model.predict_performance(
            cf_target, cf_prereq, difficulty, time_pressure, language_complexity
        )
        
        return {
            'test_concept': test_concept,
            'original_probability': float(orig_prob),
            'counterfactual_probability': float(cf_prob),
            'improvement': float(cf_prob - orig_prob),
            'original_explanation': self.perf_model.explain_prediction(
                orig_target, orig_prereq, difficulty, time_pressure, language_complexity
            ),
            'counterfactual_explanation': self.perf_model.explain_prediction(
                cf_target, cf_prereq, difficulty, time_pressure, language_complexity
            )
        }


# ============================================================================
# SECTION 5: SYNTHETIC DATA GENERATOR
# ============================================================================

def create_demo_system():
    """Create a demonstration system with synthetic curriculum and student"""
    
    # Define a simple math curriculum
    concepts = [
        'Numbers',
        'Addition',
        'Subtraction',
        'Multiplication',
        'Division',
        'Fractions',
        'Decimals',
        'Algebra',
        'Equations'
    ]
    
    # Build concept graph
    graph = ConceptGraph(concepts)
    
    # Define prerequisite relationships
    graph.add_prerequisite('Numbers', 'Addition')
    graph.add_prerequisite('Numbers', 'Subtraction')
    graph.add_prerequisite('Addition', 'Multiplication')
    graph.add_prerequisite('Addition', 'Fractions')
    graph.add_prerequisite('Subtraction', 'Fractions')
    graph.add_prerequisite('Multiplication', 'Division')
    graph.add_prerequisite('Multiplication', 'Algebra')
    graph.add_prerequisite('Fractions', 'Decimals')
    graph.add_prerequisite('Decimals', 'Algebra')
    graph.add_prerequisite('Algebra', 'Equations')
    
    
    # Create student with proper metadata
    demo_metadata = {
        'school': 'Demo Academy',
        'age': 15,
        'grade': '10th',
        'class': 'A',
        'uploaded_at': datetime.now().isoformat()
    }
    student = StudentModel('student_001', len(concepts), demo_metadata)
    
    # Set realistic mastery distribution
    student.set_mastery(graph.concept_to_idx['Numbers'], 0.9)
    student.set_mastery(graph.concept_to_idx['Addition'], 0.85)
    student.set_mastery(graph.concept_to_idx['Subtraction'], 0.8)
    student.set_mastery(graph.concept_to_idx['Multiplication'], 0.6)
    student.set_mastery(graph.concept_to_idx['Division'], 0.4)
    student.set_mastery(graph.concept_to_idx['Fractions'], 0.5)
    student.set_mastery(graph.concept_to_idx['Decimals'], 0.3)
    student.set_mastery(graph.concept_to_idx['Algebra'], 0.2)
    student.set_mastery(graph.concept_to_idx['Equations'], 0.1)
    
    # Create performance model
    perf_model = PerformanceModel(alpha=3.0, beta=1.5, gamma=0.5)
    
    # Create counterfactual engine
    cf_engine = CounterfactualEngine(graph, perf_model)
    
    return graph, student, perf_model, cf_engine


# ============================================================================
# SECTION 6: FLASK API
# ============================================================================

app = Flask(__name__)
# Configure CORS to allow file:// protocol access (null origin)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Global system state
from intervention import InterventionOptimizer, FragilityAnalyzer

# Global system state
GRAPH, STUDENT, PERF_MODEL, CF_ENGINE = create_demo_system()

# Helper wrapper for InterventionOptimizer compatibility with CausalPerformanceModel
def _optimizer_predictor(masteries, concept, difficulty=0.5):
    prereqs = GRAPH.get_prerequisites(concept)
    prereq_vals = [masteries[p] for p in prereqs]
    return PERF_MODEL.predict_performance(
        masteries.get(concept, 0.5), 
        prereq_vals, 
        difficulty=difficulty
    )

OPTIMIZER = InterventionOptimizer(GRAPH, _optimizer_predictor)
FRAGILITY_ANALYZER = FragilityAnalyzer(GRAPH)

# Partial Answer Analysis
from inference.partial_answer_handler import PartialAnswerAnalyzer
ANALYZER = PartialAnswerAnalyzer()

# Multi-student database
STUDENT_DATABASE = {
    'student_001': STUDENT  # Start with demo student
}
CURRENT_STUDENT_ID = 'student_001'


@app.route('/api/graph', methods=['GET'])
def get_graph():
    """Get concept graph structure"""
    return jsonify(GRAPH.to_dict())


@app.route('/api/student', methods=['GET'])
def get_student():
    """Get current student mastery state"""
    student = STUDENT_DATABASE.get(CURRENT_STUDENT_ID, STUDENT)
    data = student.to_dict()
    data['concepts'] = GRAPH.concepts
    return jsonify(data)


@app.route('/api/predict', methods=['POST'])
def predict_performance():
    """Predict performance on a concept"""
    data = request.json
    concept = data['concept']
    difficulty = data.get('difficulty', 0.5)
    time_pressure = data.get('time_pressure', 0.5)
    language_complexity = data.get('language_complexity', 0.5)
    
    student = STUDENT_DATABASE.get(CURRENT_STUDENT_ID, STUDENT)
    concept_idx = GRAPH.concept_to_idx[concept]
    target_mastery = student.get_mastery(concept_idx)
    
    prereqs = GRAPH.get_prerequisites(concept)
    prereq_mastery = [student.get_mastery(GRAPH.concept_to_idx[p]) for p in prereqs]
    
    explanation = PERF_MODEL.explain_prediction(
        target_mastery, prereq_mastery,
        difficulty, time_pressure, language_complexity
    )
    
    explanation['concept'] = concept
    explanation['prerequisites'] = prereqs
    
    return jsonify(explanation)


@app.route('/api/intervene', methods=['POST'])
def apply_intervention():
    """Apply counterfactual intervention"""
    data = request.json
    concept = data['concept']
    new_mastery = data['new_mastery']
    test_concept = data.get('test_concept', concept)
    
    student = STUDENT_DATABASE.get(CURRENT_STUDENT_ID, STUDENT)
    # Apply intervention
    intervention_result = CF_ENGINE.intervene(student, concept, new_mastery)
    
    # Get counterfactual student from result
    cf_student = StudentModel('cf', STUDENT.n_concepts)
    cf_student.mastery = np.array(intervention_result['counterfactual_student']['mastery'])
    
    # Compare performance
    comparison = CF_ENGINE.compare_performance(
        STUDENT, cf_student, test_concept,
        difficulty=data.get('difficulty', 0.5),
        time_pressure=data.get('time_pressure', 0.5),
        language_complexity=data.get('language_complexity', 0.5)
    )
    
    return jsonify({
        'intervention': intervention_result,
        'performance_comparison': comparison
    })


@app.route('/api/recommend_interventions', methods=['POST'])
def recommend_interventions():
    """Recommend minimal intervention set to reduce failure risk"""
    data = request.json
    target_concepts = data.get('target_concepts', [])
    risk_threshold = data.get('risk_threshold', 0.1)
    
    student = STUDENT_DATABASE.get(CURRENT_STUDENT_ID, STUDENT)
    
    # Extract current mastery state as dict
    current_masteries = {
        GRAPH.concepts[i]: student.get_mastery(i) 
        for i in range(GRAPH.n_concepts)
    }
    
    # Run optimizer
    plan, risk, explanation = OPTIMIZER.greedy_minimal_set(
        current_masteries, target_concepts, risk_threshold
    )
    
    return jsonify({
        'intervention_set': plan,
        'projected_risk': risk,
        'explanation': explanation
    })


@app.route('/api/analyze_bottlenecks', methods=['GET'])
def analyze_bottlenecks():
    """Analyze concept fragility and identify bottlenecks"""
    student = STUDENT_DATABASE.get(CURRENT_STUDENT_ID, STUDENT)
    
    # Extract current mastery state as dict
    current_masteries = {
        GRAPH.concepts[i]: student.get_mastery(i) 
        for i in range(GRAPH.n_concepts)
    }
    
    # Run analysis
    bottlenecks = FRAGILITY_ANALYZER.rank_bottlenecks(current_masteries)
    
    # Format for frontend
    results = []
    for concept, score, details in bottlenecks:
        results.append({
            'concept': concept,
            'fragility_score': score,
            'details': details
        })
        
    return jsonify({
        'bottlenecks': results
    })


@app.route('/api/concepts', methods=['GET'])
def get_concepts():
    """Get list of all concepts"""
    return jsonify({'concepts': GRAPH.concepts})


@app.route('/api/students', methods=['GET'])
def get_all_students():
    """Get list of all students with metadata"""
    students = []
    for student_id, student in STUDENT_DATABASE.items():
        students.append({
            'id': student_id,
            'metadata': student.metadata
        })
    return jsonify({'students': students, 'current': CURRENT_STUDENT_ID})


@app.route('/api/student/<student_id>', methods=['GET'])
def get_specific_student(student_id):
    """Get specific student data"""
    global CURRENT_STUDENT_ID
    if student_id not in STUDENT_DATABASE:
        return jsonify({'error': 'Student not found'}), 404
    
    CURRENT_STUDENT_ID = student_id
    student = STUDENT_DATABASE[student_id]
    data = student.to_dict()
    data['concepts'] = GRAPH.concepts
    return jsonify(data)


@app.route('/api/submit_answer', methods=['POST'])
def submit_answer():
    """Analyze partial answer and update mastery"""
    data = request.json
    answer = data.get('answer', '')
    concepts = data.get('concepts', [])
    student_id = data.get('student_id', CURRENT_STUDENT_ID)
    
    if not answer or not concepts:
        return jsonify({'error': 'Answer and concepts required'}), 400
        
    # Analyze answer
    evidence = ANALYZER.analyze(answer, concepts)
    
    # Update student mastery (soft update)
    student = STUDENT_DATABASE.get(student_id, STUDENT)
    
    updated_concepts = []
    
    for concept, strength in evidence.items():
        if concept in GRAPH.concept_to_idx:
            idx = GRAPH.concept_to_idx[concept]
            old_mastery = student.get_mastery(idx)
            
            # Soft update formula: M_new = M_old + α * (Strength - M_old)
            # This moves mastery towards the evidence strength
            alpha = 0.3 # Update rate
            new_mastery = old_mastery + alpha * (strength - old_mastery)
            
            student.set_mastery(idx, new_mastery)
            updated_concepts.append({
                'concept': concept,
                'old': float(old_mastery),
                'new': float(new_mastery),
                'evidence': float(strength)
            })
            
    return jsonify({
        'evidence': evidence,
        'updates': updated_concepts
    })


@app.route('/api/upload', methods=['POST'])
def upload_student_data():
    """Upload CSV or JSON file with student data"""
    global STUDENT_DATABASE
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    filename = file.filename.lower()
    
    try:
        if filename.endswith('.csv'):
            students = parse_csv_data(file)
        elif filename.endswith('.json'):
            students = parse_json_data(file)
        else:
            return jsonify({'error': 'Unsupported file format. Use CSV or JSON'}), 400
        
        # Add students to database
        count = 0
        for student in students:
            STUDENT_DATABASE[student.student_id] = student
            count += 1
        
        return jsonify({
            'success': True,
            'students_added': count,
            'total_students': len(STUDENT_DATABASE)
        })
    
    except Exception as e:
        return jsonify({'error': f'Failed to parse file: {str(e)}'}), 400


def parse_csv_data(file) -> List[StudentModel]:
    """
    Parse CSV file with student data.
    
    Expected columns (case-insensitive):
    - student_id / Student ID (required)
    - school / School (optional)
    - age / Age (optional)
    - grade / Grade (optional)
    - Any concept names with mastery values (0-1 or 0-100)
    """
    students = []
    content = file.read().decode('utf-8')
    reader = csv.DictReader(io.StringIO(content))
    
    # Create case-insensitive column name mapping
    # Maps lowercase versions to actual column names
    def get_value(row, *possible_names):
        """Get value from row, trying multiple possible column names (case-insensitive)"""
        row_lower = {k.lower().strip().replace(' ', '_'): v for k, v in row.items()}
        for name in possible_names:
            normalized = name.lower().strip().replace(' ', '_')
            if normalized in row_lower:
                return row_lower[normalized]
        return ''
    
    for row in reader:
        # Extract student_id (try multiple formats)
        student_id = get_value(row, 'student_id', 'Student ID', 'StudentID', 'id', 'ID')
        if not student_id.strip():
            student_id = f'student_{len(students)+1}'
        
        # Extract metadata with flexible column name matching
        school_val = get_value(row, 'school', 'School').strip()
        age_val = get_value(row, 'age', 'Age').strip()
        grade_val = get_value(row, 'grade', 'Grade').strip()
        class_val = get_value(row, 'class', 'Class', 'section', 'Section').strip()
        
        metadata = {
            'school': school_val if school_val else 'Unknown School',
            'age': int(age_val) if age_val and age_val.isdigit() else None,
            'grade': grade_val if grade_val else 'Unknown Grade',
            'class': class_val if class_val else None,
            'uploaded_at': datetime.now().isoformat()
        }
        
        # Create student model
        student = StudentModel(student_id.strip(), GRAPH.n_concepts, metadata)
        
        # Parse mastery values for known concepts (also case-insensitive)
        row_lower = {k.lower().strip(): v for k, v in row.items()}
        for concept_idx, concept in enumerate(GRAPH.concepts):
            concept_lower = concept.lower()
            if concept_lower in row_lower:
                try:
                    mastery_val = float(row_lower[concept_lower])
                    # Normalize if values are in 0-100 range
                    if mastery_val > 1:
                        mastery_val /= 100.0
                    student.set_mastery(concept_idx, mastery_val)
                except (ValueError, TypeError):
                    pass  # Skip invalid mastery values
        
        students.append(student)
    
    return students


def parse_json_data(file) -> List[StudentModel]:
    """
    Parse JSON file with student data.
    
    Expected format:
    [
      {
        "student_id": "S001",
        "school": "Lincoln High",
        "age": 15,
        "grade": "10th",
        "mastery": {
          "Numbers": 0.9,
          "Addition": 0.85,
          ...
        }
      },
      ...
    ]
    """
    students = []
    content = file.read().decode('utf-8')
    data = json.loads(content)
    
    # Handle both list and single object
    if isinstance(data, dict):
        data = [data]
    
    for record in data:
        student_id = record.get('student_id', f'student_{len(students)+1}')
        
        # Extract metadata with better handling of empty/missing fields
        school = record.get('school', '').strip() if isinstance(record.get('school'), str) else str(record.get('school', ''))
        grade = record.get('grade', '').strip() if isinstance(record.get('grade'), str) else str(record.get('grade', ''))
        cls = record.get('class', '').strip() if isinstance(record.get('class'), str) else record.get('section', '').strip() if isinstance(record.get('section'), str) else None
        
        metadata = {
            'school': school or 'Unknown School',
            'age': record.get('age'),
            'grade': grade or 'Unknown Grade',
            'class': cls,
            'uploaded_at': datetime.now().isoformat()
        }
        
        # Add any extra fields as metadata
        for key, value in record.items():
            if key not in ['student_id', 'school', 'age', 'grade', 'mastery']:
                metadata[key] = value
        
        # Create student model
        student = StudentModel(student_id, GRAPH.n_concepts, metadata)
        
        # Parse mastery values
        mastery_data = record.get('mastery', {})
        for concept_idx, concept in enumerate(GRAPH.concepts):
            if concept in mastery_data:
                mastery_val = float(mastery_data[concept])
                if mastery_val > 1:
                    mastery_val /= 100.0
                student.set_mastery(concept_idx, mastery_val)
        
        students.append(student)
    
    return students


if __name__ == '__main__':
    print("=" * 70)
    print("Causality-Aware Knowledge Tracing System - Backend")
    print("=" * 70)
    print("\nStarting Flask server on http://localhost:5001")
    print("\nAPI Endpoints:")
    print("  GET  /api/graph     - Get concept graph structure")
    print("  GET  /api/student   - Get student mastery state")
    print("  GET  /api/concepts  - Get all concepts")
    print("  POST /api/predict   - Predict performance")
    print("  POST /api/intervene - Apply counterfactual intervention")
    print("\n" + "=" * 70)
    
    app.run(debug=True, port=5001)
