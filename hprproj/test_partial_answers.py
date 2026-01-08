"""
Test Runner for Partial Answer Inference
Loads demo scenarios and runs them through the new causal inference engine.
"""

import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from inference import PartialAnswerAnalyzer, GraphConstrainedInference
from models import CausalGraph, ProbabilisticMastery

def run_partial_answer_demo():
    print("="*80)
    print("PARTIAL ANSWER INFERENCE DEMO")
    print("="*80)
    
    # 1. Load Data
    with open('demo_data_partial_answers.json', 'r') as f:
        scenarios = json.load(f)
    
    print(f"Loaded {len(scenarios)} test scenarios.\n")
    
    # 2. Setup System
    analyzer = PartialAnswerAnalyzer()
    
    # Create a comprehensive graph for all scenarios
    graph = CausalGraph([
        'Numbers', 'Addition', 'Subtraction', 'Multiplication', 'Division',
        'Fractions', 'Decimals', 'Algebra', 'Equations'
    ])
    # Add some basic structure
    graph.add_prerequisite('Addition', 'Multiplication', 0.8)
    graph.add_prerequisite('Subtraction', 'Division', 0.8)
    graph.add_prerequisite('Multiplication', 'Fractions', 0.7)
    graph.add_prerequisite('Division', 'Fractions', 0.7)
    graph.add_prerequisite('Fractions', 'Decimals', 0.8)
    graph.add_prerequisite('Algebra', 'Equations', 0.9)
    
    inferencer = GraphConstrainedInference(graph)
    
    # 3. Run Scenarios
    for i, scenario in enumerate(scenarios, 1):
        print("-" * 80)
        print(f"Scenario {i}: {scenario['id']}")
        print(f"Question: {scenario['question']}")
        print(f"Answer:   {scenario['student_answer']}\n")
        
        # Analyze
        evidence = analyzer.analyze(
            scenario['student_answer'], 
            scenario['concepts_involved']
        )
        
        ambiguity = analyzer.compute_ambiguity(evidence)
        
        print("1. Evidence Detection:")
        if not evidence:
            print("   No evidence detected.")
        for concept, strength in evidence.items():
            print(f"   • {concept}: {strength:.2f} ({analyze_strength(strength)})")
        
        print(f"   Ambiguity Score: {ambiguity:.2f}")
        
        # Run Inference
        # Initialize neutral priors (0.5 mastery)
        priors = {
            c: ProbabilisticMastery.from_point_estimate(c, 0.5, confidence=0.5) 
            for c in graph.concepts
        }
        
        updated = inferencer.update_from_partial_answer(priors, evidence)
        
        print("\n2. Graph-Constrained Updates (Significant Changes):")
        changes_found = False
        for concept in graph.concepts:
            before = priors[concept].mean()
            after = updated[concept].mean()
            delta = after - before
            
            if abs(delta) > 0.01:
                changes_found = True
                source = "Direct" if concept in evidence else "Propagated"
                print(f"   • {concept}: {before:.2f} → {after:.2f} ({delta:+.2f}) [{source}]")
        
        if not changes_found:
            print("   No significant updates.")
            
        print()

def analyze_strength(s):
    if s > 0.8: return "Strong"
    if s > 0.5: return "Moderate"
    if s > 0.2: return "Weak"
    return "Trace"

if __name__ == "__main__":
    run_partial_answer_demo()
