"""
Synthetic Data Generator for Testing Advanced Causal System
Generates realistic student populations with varying characteristics.
"""

import numpy as np
import json
import csv
from typing import List, Dict


class SyntheticStudentGenerator:
    """Generate realistic synthetic student data for testing."""
    
    def __init__(self, seed: int = 42):
        np.random.seed(seed)
        
        self.concepts = [
            'Numbers', 'Addition', 'Subtraction', 'Multiplication',
            'Division', 'Fractions', 'Decimals', 'Algebra', 'Equations'
        ]
        
        self.schools = [
            'Lincoln High', 'Washington Middle', 'Jefferson Academy',
            'Roosevelt Elementary', 'Kennedy Charter', 'Madison Prep',
            'Hamilton School', 'Adams High', 'Tech Academy', 'STEM Academy'
        ]
        
        self.learning_styles = ['visual', 'auditory', 'kinesthetic', 'reading/writing']
    
    def generate_student(self, student_id: str, grade_level: int) -> Dict:
        """
        Generate single student with realistic mastery profile.
        
        Mastery follows prerequisite structure:
        - Early concepts (Numbers, Addition) → higher mastery
        - Later concepts (Algebra, Equations) → lower mastery
        - Some noise for individual variation
        """
        # Base mastery decreases with concept difficulty
        base_masteries = np.array([0.9, 0.85, 0.8, 0.7, 0.55, 0.6, 0.45, 0.3, 0.2])
        
        # Add student-specific ability offset
        ability = np.random.normal(0, 0.15)
        
        # Add prerequisite-aware correlations
        masteries = []
        for i, concept in enumerate(self.concepts):
            base = base_masteries[i] + ability
            
            # Concepts depend on prerequisites (simplification)
            if i > 0:
                avg_prereq = np.mean(masteries[:i])
                base = 0.6 * base + 0.4 * avg_prereq
            
            # Add noise
            mastery = base + np.random.normal(0, 0.08)
            mastery = np.clip(mastery, 0.05, 0.98)
            
            masteries.append(mastery)
        
        # Generate demographics
        age = 10 + grade_level + np.random.randint(-1, 2)
        
        student = {
            'student_id': student_id,
            'school': np.random.choice(self.schools),
            'age': int(age),
            'grade': f"{grade_level}th",
            'gender': np.random.choice(['M', 'F']),
            'learning_style': np.random.choice(self.learning_styles),
            'study_hours_per_week': int(np.clip(np.random.normal(10, 3), 3, 20)),
            'mastery': {
                concept: float(mastery)
                for concept, mastery in zip(self.concepts, masteries)
            }
        }
        
        return student
    
    def generate_population(
        self, 
        n_students: int = 50,
        grade_distribution: Dict[int, float] = None
    ) -> List[Dict]:
        """
        Generate heterogeneous student population.
        
        Args:
            n_students: Number of students to generate
            grade_distribution: Dict mapping grade → proportion (defaults to uniform 6-12)
        """
        if grade_distribution is None:
            grade_distribution = {g: 1/7 for g in range(6, 13)}
        
        students = []
        for i in range(n_students):
            # Sample grade level
            grade = np.random.choice(
                list(grade_distribution.keys()),
                p=list(grade_distribution.values())
            )
            
            student_id = f"SYN{i+1:04d}"
            students.append(self.generate_student(student_id, grade))
        
        return students
    
    def save_to_csv(self, students: List[Dict], filename: str):
        """Save students to CSV format"""
        with open(filename, 'w', newline='') as f:
            # Get all concept names for headers
            base_fields = ['student_id', 'school', 'age', 'grade', 'gender']
            concept_fields = self.concepts
            
            fieldnames = base_fields + concept_fields
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            
            writer.writeheader()
            for student in students:
                row = {k: student[k] for k in base_fields}
                # Convert mastery to 0-100 scale for CSV
                for concept in self.concepts:
                    row[concept] = int(student['mastery'][concept] * 100)
                writer.writerow(row)
        
        print(f"✓ Saved {len(students)} students to {filename}")
    
    def save_to_json(self, students: List[Dict], filename: str):
        """Save students to JSON format"""
        with open(filename, 'w') as f:
            json.dump(students, f, indent=2)
        
        print(f"✓ Saved {len(students)} students to {filename}")
    
    def generate_scenario(self, scenario_type: str, n_students: int = 30) -> List[Dict]:
        """
        Generate specific testing scenarios.
        
        Scenarios:
        - 'struggling': Population with generally low mastery
        - 'advanced': Population with high mastery
        - 'mixed': Mixed ability levels (realistic)
        - 'bottleneck': Students weak in key bottleneck concepts
        """
        students = []
        
        for i in range(n_students):
            grade = np.random.randint(6, 13)
            student_id = f"{scenario_type.upper()}{i+1:03d}"
            
            if scenario_type == 'struggling':
                # Shift masteries down
                student = self.generate_student(student_id, grade)
                for concept in self.concepts:
                    student['mastery'][concept] *= 0.7
                    student['mastery'][concept] = max(0.05, student['mastery'][concept])
            
            elif scenario_type == 'advanced':
                # Shift masteries up
                student = self.generate_student(student_id, grade)
                for concept in self.concepts:
                    student['mastery'][concept] = student['mastery'][concept] * 0.3 + 0.7
                    student['mastery'][concept] = min(0.98, student['mastery'][concept])
            
            elif scenario_type == 'bottleneck':
                # Weak in Multiplication (bottleneck concept)
                student = self.generate_student(student_id, grade)
                student['mastery']['Multiplication'] *= 0.5
                # Propagate to dependents
                for concept in ['Division', 'Algebra', 'Equations']:
                    student['mastery'][concept] *= 0.7
            
            else:  # mixed
                student = self.generate_student(student_id, grade)
            
            students.append(student)
        
        return students


def main():
    """Generate demo datasets"""
    print("Generating Synthetic Student Data for Testing...")
    print("=" * 60)
    
    generator = SyntheticStudentGenerator(seed=42)
    
    # 1. Small diverse population (CSV)
    print("\n1. Generating small diverse population (CSV)...")
    small_pop = generator.generate_population(n_students=20)
    generator.save_to_csv(small_pop, 'demo_small_population.csv')
    
    # 2. Medium population with rich metadata (JSON)
    print("\n2. Generating medium population with metadata (JSON)...")
    medium_pop = generator.generate_population(n_students=50)
    generator.save_to_json(medium_pop, 'demo_medium_population.json')
    
    # 3. Struggling students scenario
    print("\n3. Generating 'struggling students' scenario...")
    struggling = generator.generate_scenario('struggling', n_students=15)
    generator.save_to_json(struggling, 'demo_scenario_struggling.json')
    
    # 4. Advanced students scenario
    print("\n4. Generating 'advanced students' scenario...")
    advanced = generator.generate_scenario('advanced', n_students=15)
    generator.save_to_json(advanced, 'demo_scenario_advanced.json')
    
    # 5. Bottleneck scenario
    print("\n5. Generating 'bottleneck' scenario...")
    bottleneck = generator.generate_scenario('bottleneck', n_students=20)
    generator.save_to_json(bottleneck, 'demo_scenario_bottleneck.json')
    
    print("\n" + "=" * 60)
    print("✓ All demo datasets generated successfully!")
    print("\nGenerated files:")
    print("  - demo_small_population.csv (20 students)")
    print("  - demo_medium_population.json (50 students)")
    print("  - demo_scenario_struggling.json (15 struggling students)")
    print("  - demo_scenario_advanced.json (15 advanced students)")
    print("  - demo_scenario_bottleneck.json (20 students with bottlenecks)")
    
    print("\nUsage:")
    print("  • Upload to web interface via 'Upload CSV/JSON' button")
    print("  • Use with demo_advanced.py for testing all features")
    print("  • Analyze different scenarios to test robustness")


if __name__ == '__main__':
    main()
