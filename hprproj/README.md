# Causality-Aware Knowledge Tracing System

**Educational AI Hackathon Demo**

A minimal but complete implementation demonstrating:
- 🧠 **Concept-level latent mastery estimation**
- 🔗 **Explicit prerequisite dependencies** via directed concept graph
- ⚡ **Causal performance model** separating mastery from confounders
- 🔮 **Counterfactual reasoning** without retraining

## System Architecture

### Backend (Python/Flask)
- **ConceptGraph**: Directed graph representing curriculum prerequisites
- **StudentModel**: Latent mastery state for each student-concept pair
- **PerformanceModel**: Causal model P(correct | mastery, prerequisites, confounders)
- **CounterfactualEngine**: What-if interventions with graph propagation

### Frontend (HTML/CSS/JS)
- Interactive concept graph visualization
- Real-time mastery dashboard
- Performance prediction interface
- Counterfactual intervention controls

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start Backend Server

```bash
python backend.py
```

The Flask API will start on `http://localhost:5500`

### 3. Open Frontend

Open `index.html` in your browser (any modern browser works).

## How to Use

### 1️⃣ Explore the Concept Graph
View the prerequisite structure of the math curriculum. Click on nodes to see dependencies.

### 2️⃣ View Student Mastery
Check the student's current latent mastery levels across all concepts (0-100%).

### 3️⃣ Predict Performance
- Select a test concept
- Adjust confounders (difficulty, time pressure, language complexity)
- Click "Predict Performance"
- View causal breakdown showing contributions from mastery vs confounders

### 4️⃣ Apply Counterfactual Intervention
- Select a concept to intervene on
- Set a hypothetical new mastery level
- Click "Apply Intervention"
- See before/after performance comparison WITHOUT retraining the model

### 5️⃣ Upload Student Data (NEW!)
- Click "📁 Upload CSV/JSON"
- Select a file with student data (see sample files included)
- Students are automatically added to the database
- Use the dropdown to switch between students
- View demographics: school, age, grade, etc.

**Supported formats:**
- **CSV**: With columns for `student_id`, demographics, and concept masteries
- **JSON**: Nested format with metadata and mastery objects

See [`DATA_UPLOAD_GUIDE.md`](DATA_UPLOAD_GUIDE.md) for detailed file format specifications.

## Key Features

### Causal Performance Model

```
P(correct) = sigmoid(
    α × mastery_target +
    β × avg_mastery_prerequisites +
    γ × confounders
)
```

Where:
- **α = 3.0**: Weight for target concept mastery
- **β = 1.5**: Weight for prerequisite mastery
- **γ = 0.5**: Weight for confounders (difficulty, time, language)

### Counterfactual Propagation

When you intervene on a concept:
1. Direct mastery change is applied
2. Dependent concepts improve by 30% of the change
3. New performance predictions computed instantly
4. NO model retraining required

## Demo Curriculum

The system includes a math curriculum with 9 concepts:

```
Numbers → Addition → Multiplication → Division
       ↘ Subtraction ↗              ↘ Algebra → Equations
                     ↘ Fractions → Decimals ↗
```

## API Endpoints

- `GET /api/graph` - Get concept graph structure
- `GET /api/student` - Get current student mastery
- `GET /api/concepts` - List all concepts
- `POST /api/predict` - Predict performance on a concept
- `POST /api/intervene` - Apply counterfactual intervention

## Why This Matters

Traditional ML models are black boxes that:
- Don't separate mastery from difficulty
- Can't explain *why* a prediction was made
- Require retraining for what-if scenarios

This causal approach:
- ✅ Explicitly models prerequisite relationships
- ✅ Separates true mastery from confounders
- ✅ Supports instant counterfactual reasoning
- ✅ Provides interpretable causal explanations

Perfect for educational systems where **explainability** and **fairness** matter!

## Domain Adaptation & Robustness

**Key Insight:** This model generalizes across contexts because it models **concepts, not questions**.

### Why It Transfers to New Schools/Exams

✅ **Concept definitions are universal** - "Addition" means the same everywhere  
✅ **Prerequisite structure is pedagogical** - Based on domain knowledge, not data  
✅ **Mastery is separated from difficulty** - Can handle different exam distributions  
✅ **No retraining needed** - Just adjust confounder values for new context  

**Example:** Student transfers from easy school to hard school
- Mastery (α, β terms): **STAYS SAME** ← Student's actual knowledge
- Difficulty (γ term): **CHANGES** ← New exam context
- Prediction updates instantly without retraining!

See [`ROBUSTNESS.md`](ROBUSTNESS.md) for detailed explanation of domain invariance properties.

## Technologies

- **Backend**: Python 3.x, Flask, NumPy
- **Frontend**: HTML5, CSS3 (Modern Dark Theme), Vanilla JavaScript
- **API**: RESTful with CORS support

## License

MIT - Built for Educational Hackathon Demo
