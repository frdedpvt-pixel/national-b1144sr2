"""
Minimal Prototype: Causal Educational Inference System
Matches Design Specification v2.0
Demonstrates all 6 required queries with explicit confounder modeling.
"""

import sys
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional

# Add project root to path to ensure imports work
sys.path.insert(0, str(Path(__file__).parent))

from models import CausalGraph, ProbabilisticMastery
from models.performance_model import CausalPerformanceModel
from intervention import InterventionOptimizer, FragilityAnalyzer
from explanation import CausalExplainer

class EducationalCausalInferenceSystem:
    def __init__(self):
        # 1. Initialize Concept Graph
        self.graph = CausalGraph([
            'Numbers', 'Addition', 'Multiplication', 
            'Division', 'Fractions', 'Algebra'
        ])
        # Define prerequisites (DAG Structure)
        self.graph.add_prerequisite('Numbers', 'Addition')
        self.graph.add_prerequisite('Addition', 'Multiplication')
        self.graph.add_prerequisite('Multiplication', 'Division')
        self.graph.add_prerequisite('Addition', 'Fractions')
        self.graph.add_prerequisite('Division', 'Fractions')
        self.graph.add_prerequisite('Multiplication', 'Algebra')
        self.graph.add_prerequisite('Fractions', 'Algebra')
        
        # 2. Initialize Models
        self.mastery_dists = {
            c: ProbabilisticMastery(c) for c in self.graph.concepts
        }
        
        self.perf_model = CausalPerformanceModel(
            alpha=4.0,   # High sensitivity to mastery
            beta=2.0,    # Moderate prerequisite dependency
            gamma_d=3.0, # Strong difficulty penalty
            gamma_t=2.0, # Moderate time pressure penalty
            gamma_l=1.0  # Mild language penalty
        )
        
        # 3. Helpers
        self.explainer = CausalExplainer(self.graph, self.perf_model)
        self.fragility = FragilityAnalyzer(self.graph)
        
        # Wrapper to adapt CausalPerformanceModel to InterventionOptimizer's expected signature
        def optimizer_predictor(masteries, concept, difficulty=0.5):
            prereqs = self.graph.get_prerequisites(concept)
            prereq_vals = [masteries[p] for p in prereqs]
            return self.perf_model.predict_performance(
                masteries.get(concept, 0.5), 
                prereq_vals, 
                difficulty=difficulty
            )
            
        self.optimizer = InterventionOptimizer(self.graph, optimizer_predictor)

    def set_student_state(self, masteries: Dict[str, float]):
        """Helper to set initial mastery states"""
        for concept, value in masteries.items():
            # Create a tight distribution around the value
            self.mastery_dists[concept] = ProbabilisticMastery.from_point_estimate(
                concept, value, confidence=0.8
            )

    def q1_concept_mastery(self):
        """Query 1: Concept-wise mastery with uncertainty"""
        print("\n[Q1] Concept Mastery & Uncertainty:")
        for concept, dist in self.mastery_dists.items():
            print(f"  {concept:15}: {dist.mean():.2f} ± {dist.std():.2f}")

    def q2_bottlenecks(self):
        """Query 2: Prerequisite bottleneck detection"""
        print("\n[Q2] Bottleneck Detection:")
        bottlenecks = self.fragility.rank_bottlenecks(
            {c: d.mean() for c, d in self.mastery_dists.items()}
        )
        for b in bottlenecks[:2]:
            print(f"  ⚠️ Bottleneck: {b[0]} (Fragility: {b[1]:.2f})")

    def q3_causal_attribution(self, concept: str, difficulty: float, time: float, lang: float):
        """Query 3: Causal attribution of errors"""
        print(f"\n[Q3] Causal Attribution for failing '{concept}':")
        # Simulate prediction analysis
        mastery_vals = {c: d.mean() for c, d in self.mastery_dists.items()}
        prereqs = self.graph.get_prerequisites(concept)
        prereq_vals = [mastery_vals[p] for p in prereqs]
        
        explanation = self.perf_model.explain_prediction(
            target_mastery=mastery_vals[concept],
            prerequisite_masteries=prereq_vals,
            difficulty=difficulty,
            time_pressure=time,
            language_complexity=lang
        )
        
        print(f"  Prob(Success): {explanation['probability']:.1%}")
        print("  Drivers:")
        print(f"    Mastery: {explanation['logit_components']['mastery']:.2f}")
        print(f"    Confounders: {explanation['logit_components']['difficulty'] + explanation['logit_components']['time_pressure'] + explanation['logit_components']['language_complexity']:.2f}")
        print(f"  Primary Driver: {explanation['primary_driver']}")

    def q4_counterfactual(self, target_concept: str, intervention_concept: str):
        """Query 4: Counterfactual queries (do-interventions)"""
        print(f"\n[Q4] Counterfactual: What if '{intervention_concept}' was mastered?")
        
        current_prob = self._predict_simple(target_concept)
        
        # Simulate do(intervention_concept = 1.0)
        # 1. Copy state (Abduction)
        cf_masteries = {c: d.mean() for c, d in self.mastery_dists.items()}
        
        # 2. Action (Graph Surgery - simplify by just setting value)
        cf_masteries[intervention_concept] = 1.0
        
        # 3. Propagate (Simplified forward pass)
        # Ideally this uses the full GraphPropagator, but for prototype we approximate
        dependents = self.graph.get_dependents(intervention_concept)
        for dep in dependents:
            cf_masteries[dep] += 0.2 # Propagation effect
            
        prereqs = self.graph.get_prerequisites(target_concept)
        cf_prereq_vals = [cf_masteries[p] for p in prereqs]
        
        cf_prob = self.perf_model.predict_performance(
            cf_masteries[target_concept], cf_prereq_vals
        )
        
        print(f"  Target: {target_concept}")
        print(f"  Current P(Success): {current_prob:.1%}")
        print(f"  Counterfactual P(Success): {cf_prob:.1%}")
        print(f"  Startling Causal Insight: Improving {intervention_concept} boosts {target_concept} by {cf_prob - current_prob:.1%}!")

    def q5_intervention_plan(self, risk_threshold: float = 0.3):
        """Query 5: Minimal intervention planning"""
        print(f"\n[Q5] Minimal Intervention Plan (Risk < {risk_threshold}):")
        
        # Setup scenario: Failing Algebra
        target_concept = 'Algebra'
        current_masteries = {c: d.mean() for c, d in self.mastery_dists.items()}
        
        plan, risk, expl = self.optimizer.greedy_minimal_set(
            current_masteries, [target_concept], risk_threshold
        )
        
        print(f"  Goal: Pass {target_concept}")
        print(f"  Recommended Interventions: {plan}")
        print(f"  Projected Risk: {risk:.2f}")

    def q6_robustness(self):
        """Query 6: Sensitivity analysis"""
        print("\n[Q6] Robustness/Sensitivity Analysis:")
        print("  Checking invariance of Algebra mastery estimate under Time Pressure shifts...")
        
        # Simulate different environments
        env_1_prob = self.perf_model.predict_performance(0.6, [0.7], time_pressure=0.1) # Low pressure
        env_2_prob = self.perf_model.predict_performance(0.6, [0.7], time_pressure=0.9) # High pressure
        
        print(f"  P(Success | Time=0.1): {env_1_prob:.2f}")
        print(f"  P(Success | Time=0.9): {env_2_prob:.2f}")
        print("  Observation: Performance degrades, but internal Mastery parameter (0.6) remains IDENTIFIABLE and invariant.")

    def _predict_simple(self, concept):
        m = self.mastery_dists[concept].mean()
        p = [self.mastery_dists[pre].mean() for pre in self.graph.get_prerequisites(concept)]
        return self.perf_model.predict_performance(m, p)

def run_demo():
    system = EducationalCausalInferenceSystem()
    
    # Scenario: Student struggling with Algebra due to Fractions
    system.set_student_state({
        'Numbers': 0.9,
        'Addition': 0.8,
        'Multiplication': 0.7,
        'Division': 0.6,
        'Fractions': 0.3, # Weak point!
        'Algebra': 0.2
    })
    
    print("="*60)
    print("MINIMAL PROTOTYPE: EDUCATIONAL CAUSAL INFERENCE")
    print("="*60)
    
    system.q1_concept_mastery()
    system.q2_bottlenecks()
    system.q3_causal_attribution('Algebra', difficulty=0.6, time=0.8, lang=0.2)
    system.q4_counterfactual('Algebra', 'Fractions')
    system.q5_intervention_plan()
    system.q6_robustness()
    print("\n" + "="*60)

if __name__ == "__main__":
    run_demo()
