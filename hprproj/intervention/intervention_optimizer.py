"""
Minimal Intervention Optimizer
Solves for smallest set of concepts to remediate to reduce failure risk.
"""

import numpy as np
from typing import Dict, List, Set, Tuple, Callable, Optional
from models.causal_graph_extended import CausalGraph


class InterventionOptimizer:
    """
    Finds minimal set of concepts to remediate to achieve target performance goal.
    
    Problem formulation:
        minimize |S|
        subject to: Risk(future_assessments | do(M_S = 1)) < threshold
    
    Uses greedy approximation with (1 - 1/e) guarantee for submodular objectives.
    """
    
    def __init__(self, graph: CausalGraph, performance_predictor: Callable):
        """
        Args:
            graph: Causal graph structure
            performance_predictor: Function(student, concept) → P(success)
        """
        self.graph = graph
        self.predict_performance = performance_predictor
    
    def compute_risk(
        self, 
        student_masteries: Dict[str, float],
        target_concepts: List[str],
        difficulty: float = 0.5
    ) -> float:
        """
        Compute expected failure risk on target concepts.
        
        Risk = average probability of failure across target concepts
        
        Args:
            student_masteries: Current mastery levels
            target_concepts: Concepts that will be assessed
            difficulty: Assessment difficulty level
        
        Returns:
            Risk ∈ [0,1], where 0 = no risk, 1 = certain failure
        """
        total_prob_failure = 0.0
        
        for concept in target_concepts:
            prob_success = self.predict_performance(
                student_masteries, 
                concept,
                difficulty=difficulty
            )
            prob_failure = 1 - prob_success
            total_prob_failure += prob_failure
        
        return total_prob_failure / len(target_concepts)
    
    def compute_marginal_risk_reduction(
        self,
        student_masteries: Dict[str, float],
        target_concepts: List[str],
        current_set: Set[str],
        candidate: str,
        difficulty: float = 0.5
    ) -> float:
        """
        Compute how much risk would be reduced by adding candidate to intervention set.
        
        This is the key subroutine for greedy selection.
        """
        # Current risk
        current_risk = self.compute_risk(student_masteries, target_concepts, difficulty)
        
        # Hypothetical risk if we master the candidate
        hypothetical_masteries = student_masteries.copy()
        
        # Set candidate and current intervention set to perfect mastery
        for concept in current_set | {candidate}:
            hypothetical_masteries[concept] = 1.0
        
        # Propagate effects through graph
        hypothetical_masteries = self._propagate_masteries(hypothetical_masteries)
        
        new_risk = self.compute_risk(hypothetical_masteries, target_concepts, difficulty)
        
        return current_risk - new_risk
    
    def _propagate_masteries(self, masteries: Dict[str, float]) -> Dict[str, float]:
        """
        Propagate mastery improvements through graph structure.
        
        Uses topological ordering and weighted averaging.
        """
        updated = masteries.copy()
        
        for concept in self.graph.topological_sort():
            prereqs = self.graph.get_prerequisites(concept)
            
            if prereqs:
                prereq_values = [updated[p] for p in prereqs]
                prereq_weights = [self.graph.get_edge_weight((p, concept)) for p in prereqs]
                
                total_weight = sum(prereq_weights)
                if total_weight > 0:
                    weighted_avg = sum(v * w for v, w in zip(prereq_values, prereq_weights)) / total_weight
                else:
                    weighted_avg = np.mean(prereq_values)
                
                # Blend: allow prerequisites to boost current mastery
                current = updated[concept]
                blend_factor = 0.5  # 50% current, 50% prerequisite influence
                updated[concept] = blend_factor * current + (1 - blend_factor) * weighted_avg
                updated[concept] = min(updated[concept], 1.0)
        
        return updated
    
    def greedy_minimal_set(
        self,
        student_masteries: Dict[str, float],
        target_concepts: List[str],
        risk_threshold: float = 0.1,
        max_interventions: Optional[int] = None,
        difficulty: float = 0.5
    ) -> Tuple[List[str], float, Dict]:
        """
        Find (approximately) minimal intervention set using greedy algorithm.
        
        Args:
            student_masteries: Current mastery state
            target_concepts: Concepts to be assessed
            risk_threshold: Target risk level (default 0.1 = 10% expected failure rate)
            max_interventions: Maximum number of interventions allowed
            difficulty: Assessment difficulty
        
        Returns:
            (intervention_set, final_risk, explanation)
        """
        S = set()
        current_risk = self.compute_risk(student_masteries, target_concepts, difficulty)
        
        # Track history for explanation
        history = []
        
        iteration = 0
        while current_risk > risk_threshold:
            if max_interventions and len(S) >= max_interventions:
                break
            
            # Find best candidate
            best_concept = None
            max_reduction = 0.0
            
            # Consider all concepts not yet in intervention set
            candidates = set(self.graph.concepts) - S
            
            for concept in candidates:
                reduction = self.compute_marginal_risk_reduction(
                    student_masteries, target_concepts, S, concept, difficulty
                )
                
                if reduction > max_reduction:
                    max_reduction = reduction
                    best_concept = concept
            
            # Check termination
            if max_reduction < 1e-6 or best_concept is None:
                break  # No further improvement possible
            
            # Add to intervention set
            S.add(best_concept)
            current_risk -= max_reduction
            
            # Record for explanation
            history.append({
                'iteration': iteration,
                'concept_added': best_concept,
                'risk_reduction': max_reduction,
                'cumulative_risk': current_risk
            })
            
            iteration += 1
        
        explanation = self._explain_selection(
            list(S), target_concepts, student_masteries, history
        )
        
        return list(S), current_risk, explanation
    
    def _explain_selection(
        self,
        intervention_set: List[str],
        target_concepts: List[str],
        student_masteries: Dict[str, float],
        history: List[Dict]
    ) -> Dict:
        """Generate causal explanation for intervention selection"""
        
        # Analyze which target concepts each intervention helps
        impact_matrix = {}
        
        for intervention in intervention_set:
            descendants = self.graph.get_all_descendants(intervention)
            helped_targets = [t for t in target_concepts if t in descendants or t == intervention]
            
            impact_matrix[intervention] = {
                'helps_targets': helped_targets,
                'n_downstream': len(descendants),
                'sensitivity_scores': {
                    t: self.graph.compute_sensitivity(intervention, t)
                    for t in helped_targets
                }
            }
        
        return {
            'intervention_set': intervention_set,
            'set_size': len(intervention_set),
            'target_concepts': target_concepts,
            'selection_history': history,
            'impact_analysis': impact_matrix,
            'final_recommendation': self._generate_recommendation(intervention_set, impact_matrix)
        }
    
    def _generate_recommendation(self, intervention_set: List[str], impact_matrix: Dict) -> str:
        """Generate human-readable recommendation"""
        lines = [f"Recommended intervention set ({len(intervention_set)} concepts):"]
        
        for i, concept in enumerate(intervention_set, 1):
            impact = impact_matrix[concept]
            targets = impact['helps_targets']
            lines.append(
                f"{i}. {concept}: Impacts {len(targets)} target(s) - {', '.join(targets)}"
            )
        
        return "\n".join(lines)
    
    def brute_force_optimal(
        self,
        student_masteries: Dict[str, float],
        target_concepts: List[str],
        risk_threshold: float = 0.1,
        max_set_size: int = 5
    ) -> Tuple[List[str], float]:
        """
        Find truly optimal intervention set via exhaustive search.
        
        WARNING: Exponential time complexity. Only use for small problems (≤10 concepts).
        Useful for benchmarking greedy algorithm.
        """
        from itertools import combinations
        
        best_set = None
        best_size = float('inf')
        
        # Try all possible subset sizes
        for size in range(1, min(max_set_size + 1, len(self.graph.concepts) + 1)):
            # Try all combinations of this size
            for subset in combinations(self.graph.concepts, size):
                subset_set = set(subset)
                
                # Check if this subset achieves risk threshold
                hypothetical = student_masteries.copy()
                for c in subset_set:
                    hypothetical[c] = 1.0
                hypothetical = self._propagate_masteries(hypothetical)
                
                risk = self.compute_risk(hypothetical, target_concepts)
                
                if risk <= risk_threshold and size < best_size:
                    best_set = list(subset)
                    best_size = size
            
            # Early termination: if we found a solution of this size, no need to check larger
            if best_set is not None:
                break
        
        if best_set is None:
            # No solution found within max_set_size
            return [], float('inf')
        
        final_risk = self.compute_risk(
            {**student_masteries, **{c: 1.0 for c in best_set}},
            target_concepts
        )
        
        return best_set, final_risk
