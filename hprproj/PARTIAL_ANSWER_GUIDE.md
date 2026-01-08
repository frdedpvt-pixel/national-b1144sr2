# Partial Answer Handling - Quick Reference

## What It Does

Handles **incomplete, ambiguous, or partially correct** student responses by:
1. Decomposing answers into **per-concept evidence strengths** [0,1]
2. Using **soft Bayesian updates** (not binary correct/incorrect)
3. **Propagating evidence** through prerequisite graph
4. **Increasing uncertainty** when answers are ambiguous

## Key Components

### PartialAnswerAnalyzer
```python
from inference import PartialAnswerAnalyzer

analyzer = PartialAnswerAnalyzer()
evidence = analyzer.analyze(
    answer="3/4 + 1/2 = 3/4 + 2/4 = ...",
    question_concepts=['Fractions', 'Addition']
)
# → {'Fractions': 0.8, 'Addition': 0.3}
```

**Strength Interpretation:**
- `1.0` = Fully demonstrated concept
- `0.7` = Correct setup, incomplete
- `0.4` = Partial work shown
- `0.2` = Attempted but errors
- `0.0` = No evidence

### GraphConstrainedInference
```python
from inference import GraphConstrainedInference
from models import CausalGraph

inferencer = GraphConstrainedInference(graph)
updated_masteries = inferencer.update_from_partial_answer(
    mastery_dists=current_beliefs,
    evidence={'Fractions': 0.8, 'Addition': 0.3},
    propagate=True  # Use graph structure
)
```

**What Happens:**
1. Direct update: `Fractions` mastery ↑ (strong evidence)
2. Direct update: `Addition` mastery ↑ slightly (weak evidence)
3. Graph propagation: `Mixed Numbers` mastery ↑ (prerequisite improved)
4. Uncertainty propagation: Downstream concepts inherit upstream uncertainty

## Usage Examples

### Example 1: Correct Setup, Missing Computation
```python
answer = "To find common denominator: 3/4 + 2/4 = ..."
evidence = analyzer.analyze(answer, ['Fractions', 'Addition'])
# → {'Fractions': 0.75, 'Addition': 0.25}
# Student understands fractions, but didn't complete addition
```

### Example 2: Ambiguous Answer
```python
answer = "I think it's 5/6 but not sure"
evidence = analyzer.analyze(answer, ['Fractions'])
# → {'Fractions': 0.35}  # Weak evidence due to uncertainty markers

ambiguity = analyzer.compute_ambiguity(evidence)
# → High ambiguity increases posterior variance
```

### Example 3: Multi-Concept Response
```python
answer = "3x + 5 = 20, so 3x = 15, x = 5"
evidence = analyzer.analyze(answer, ['Algebra', 'Subtraction', 'Division'])
# → {'Algebra': 0.9, 'Subtraction': 0.85, 'Division': 0.9}
# All concepts demonstrated
```

## API Reference

### PartialAnswerAnalyzer Methods

```python
analyze(answer: str, question_concepts: List[str]) -> Dict[str, float]
    # Returns evidence strengths per concept

compute_ambiguity(evidence: Dict[str, float]) -> float
    # Returns normalized entropy [0,1]

decompose_multi_concept(answer: str, concepts: List[str]) 
    # Returns (strength, justification) tuples
```

### GraphConstrainedInference Methods

```python
update_from_partial_answer(
    mastery_dists: Dict[str, ProbabilisticMastery],
    evidence: Dict[str, float],
    propagate: bool = True,
    evidence_weight: float = 1.0
) -> Dict[str, ProbabilisticMastery]

batch_update(
    mastery_dists: Dict[str, ProbabilisticMastery],
    evidence_sequence: List[Dict[str, float]]
) -> Dict[str, ProbabilisticMastery]
    # Process multiple answers sequentially
```

## Advantages Over Binary Scoring

| Binary (Right/Wrong) | Soft Evidence (Our System) |
|---------------------|---------------------------|
| All-or-nothing | Granular progress tracking |
| Ignores partial work | Values partial understanding |
| Increases variance artificially | Reflects true uncertainty |
| No concept decomposition | Attributes to specific concepts |
| Ignores graph structure | Propagates through prerequisites |

## Test It

Run the demo:
```bash
python inference/partial_answer_handler.py
```

Expected output:
- Evidence decomposition for partial fractions problem
- Mastery updates with graph propagation
- Downstream concepts boosted by prerequisite improvements

## Integration with Backend

To add to Flask API (future work):
```python
@app.route('/api/update_from_answer', methods=['POST'])
def update_from_answer():
    data = request.json
    answer = data['answer']
    concepts = data['concepts']
    student_id = data['student_id']
    
    # Analyze answer
    evidence = analyzer.analyze(answer, concepts)
    
    # Update student mastery
    student = STUDENT_DATABASE[student_id]
    updated = inferencer.update_from_partial_answer(
        student.mastery_dists,  # Need to add this attribute
        evidence
    )
    
    return jsonify({
        'evidence': evidence,
        'updated_masteries': {c: dist.to_dict() for c, dist in updated.items()}
    })
```

## Research-Grade Features

✅ **Causal Reasoning**: Evidence routes through concept graph  
✅ **Uncertainty Quantification**: Ambiguity increases variance  
✅ **Identifiability**: Graph structure stable across contexts  
✅ **Explainability**: Per-concept evidence justifications  
✅ **No Retraining**: Pure Bayesian updating

---

**System now handles 100% correct, 100% wrong, AND everything in between!**
