# Domain Adaptation & Robustness

## Why This Model Generalizes Across Contexts

### The Problem with Traditional ML
Most knowledge tracing models learn **question-specific patterns**:
- "Question #47 is hard" ❌
- "Students from School A perform worse" ❌
- "Morning exams have lower scores" ❌

These patterns **don't transfer** to new schools, exams, or contexts.

### The Causal Approach Solution

Our model separates **stable** from **changing** factors:

| Factor | Stability | Transferable? |
|--------|-----------|---------------|
| Concept mastery | **Stable** | ✅ Yes |
| Prerequisite structure | **Stable** | ✅ Yes |
| Question difficulty | **Context-dependent** | ❌ No |
| Exam format | **Context-dependent** | ❌ No |
| School resources | **Context-dependent** | ❌ No |

## How It Works

### Scenario: Student transfers from School A to School B

**School A** (easy exams):
```
P(correct on Algebra) = sigmoid(
    3.0 × 0.6 (mastery) +
    1.5 × 0.7 (prereqs) +
    0.5 × (-0.3) (easy difficulty)
) ≈ 85%
```

**School B** (hard exams):
```
P(correct on Algebra) = sigmoid(
    3.0 × 0.6 (SAME mastery) +
    1.5 × 0.7 (SAME prereqs) +
    0.5 × (-0.8) (hard difficulty)
) ≈ 72%
```

**What changed?** Only the difficulty term!  
**What stayed the same?** The student's actual understanding!

## Domain Invariance Properties

### 1. Concept Definitions Are Universal
```python
concepts = ['Numbers', 'Addition', 'Algebra']  # Same everywhere
```

"Addition" means the same thing at Lincoln High and Washington Middle.

### 2. Prerequisite Structure Is Pedagogical
```python
graph.add_prerequisite('Addition', 'Multiplication')
```

This relationship holds in any educational context.

### 3. Mastery Is Latent (Hidden)
We don't directly observe mastery, we infer it from performance while **removing confounding factors**.

## Testing Robustness

### Experiment 1: Different Difficulty Distributions

Upload students from "Easy School" and "Hard School":

**Easy School CSV:**
```csv
student_id,school,difficulty_level,Numbers,Addition,Algebra
S001,Easy School,0.3,90,85,70
```

**Hard School CSV:**
```csv
student_id,school,difficulty_level,Numbers,Addition,Algebra
S002,Hard School,0.8,70,65,45
```

Both students might have **same true mastery**, just tested differently!

### Experiment 2: New Exam Format

Change confounders (time pressure, language complexity) without retraining:

```python
# Old exam format
predict(concept='Algebra', difficulty=0.5, time_pressure=0.3)

# New standardized test format  
predict(concept='Algebra', difficulty=0.7, time_pressure=0.9)
```

Predictions update **instantly** without model retraining.

### Experiment 3: Counterfactual "What If?"

"What if this student attended a better-resourced school?"

```python
# Intervene on prerequisite mastery (proxying better instruction)
intervene(concept='Addition', new_mastery=0.9)

# See downstream effects on Algebra, Equations
```

## Why This Matters for Fairness

Traditional models might learn:
- "Students from School X perform worse" → **Unfair bias**

Our model asks:
- "What is this student's mastery **independent of** their school context?" → **Fair assessment**

## Hackathon Pitch

> "Our system models **what students know**, not **where they learned it**. Concepts are universal, contexts change. That's why our predictions transfer across schools, exams, and even countries."

## Technical Implementation

The causal DAG structure ensures:

```
Concept Graph (Fixed) → Latent Mastery (Student-specific) → Performance
                                                          ↗
                                    Confounders (Context-specific)
```

Only the **Confounders** node changes across contexts.  
Everything else is **domain-invariant**.

---

**This is a fundamental advantage of causal modeling over pure correlation-based ML!** 🎯
