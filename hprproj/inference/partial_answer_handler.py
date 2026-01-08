"""
Partial Answer Handling with Soft Evidence
Implements causal inference from ambiguous, incomplete student responses.
"""

import numpy as np
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.probabilistic_mastery import ProbabilisticMastery
from models.causal_graph_extended import CausalGraph


class PartialAnswerAnalyzer:
    """
    Decomposes partial answers into per-concept evidence strengths.
    
    Maps text/partial solutions → {concept: strength ∈ [0,1]}
    where strength represents how much evidence the answer provides for mastery.
    """
    
    def __init__(self, concept_keywords: Optional[Dict[str, List[str]]] = None):
        """
        Args:
            concept_keywords: Mapping concept → list of indicator keywords
                             If None, uses default math keywords
        """
        self.concept_keywords = concept_keywords or self._default_keywords()
    
    def _default_keywords(self) -> Dict[str, List[str]]:
        """Default keyword mappings for math concepts"""
        return {
            'Numbers': ['digit', 'number', 'count'],
            'Addition': ['add', 'plus', '+', 'sum', 'total'],
            'Subtraction': ['subtract', 'minus', '-', 'difference'],
            'Multiplication': ['multiply', 'times', '×', '*', 'product'],
            'Division': ['divide', '÷', '/', 'quotient'],
            'Fractions': ['fraction', 'numerator', 'denominator', 'common denominator', '/'],
            'Decimals': ['decimal', '.', 'point'],
            'Algebra': ['variable', 'x', 'y', 'solve for', 'equation'],
            'Equations': ['equation', '=', 'equals', 'solve']
        }
    
    def analyze(
        self, 
        answer: str, 
        question_concepts: List[str],
        metadata: Optional[Dict] = None
    ) -> Dict[str, float]:
        """
        Convert partial answer to evidence strengths.
        
        Args:
            answer: Student's partial answer (text or work shown)
            question_concepts: Concepts required by the question
            metadata: Optional additional context (e.g., rubric, expected steps)
        
        Returns:
            {concept: evidence_strength ∈ [0,1]}
            
        Example:
            answer = "3/4 + 1/2 = 3/4 + 2/4 = ..."
            concepts = ['Fractions', 'Addition']
            → {'Fractions': 0.8, 'Addition': 0.3}
        """
        evidence = {}
        
        for concept in question_concepts:
            strength = self._compute_strength(answer, concept, metadata)
            
            # Only include if evidence is non-trivial
            if strength > 0.05:
                evidence[concept] = strength
        
        return evidence
    
    def _compute_strength(
        self, 
        answer: str, 
        concept: str,
        metadata: Optional[Dict] = None
    ) -> float:
        """
        Estimate evidence strength for single concept.
        
        Heuristic rules (can be replaced with learned model):
        - Complete correct solution → 1.0
        - Correct setup, incomplete execution → 0.6-0.8
        - Partial work shown → 0.3-0.5
        - Incorrect attempt with some understanding → 0.2
        - No evidence → 0.0
        """
        answer_lower = answer.lower().strip()
        
        if not answer_lower:
            return 0.0
        
        keywords = self.concept_keywords.get(concept, [])
        
        # improved matching: count occurrences, not just unique keyword types
        # But for ratio, we still want coverage. 
        # Let's count "strong matches" (symbols) vs "weak matches" (words)
        
        matches = [kw for kw in keywords if kw.lower() in answer_lower]
        n_matches = len(matches)
        
        # Check for error indicators
        error_markers = ['wrong', 'incorrect', '?', 'unsure', 'don\'t know', 'unclear']
        has_errors = any(marker in answer_lower for marker in error_markers)
        
        # Check for work shown (equations, steps, etc.)
        has_work_shown = any(marker in answer for marker in ['=', '→', 'step', '1.', '2.'])
        
        # Completeness heuristic
        is_complete = len(answer_lower) > 20 and not answer_lower.endswith('...')
        
        # robust logic:
        # 1. If we have at least 1 keyword and work shown -> specific strength
        # 2. If we have multiple keywords -> stronger
        
        base_strength = 0.0
        
        if n_matches >= 2:
            base_strength = 0.6
        elif n_matches == 1:
            base_strength = 0.4
            
        if has_work_shown:
            base_strength += 0.2
            
        if is_complete:
            base_strength += 0.1
            
        if has_errors:
            base_strength = 0.15 # Override if errors explicitly stated
            
        # Cap at 0.95
        return min(0.95, base_strength)
    
    def compute_ambiguity(self, evidence: Dict[str, float]) -> float:
        """
        Measure ambiguity of evidence distribution using entropy.
        
        High ambiguity → unclear which concepts student knows
        Low ambiguity → clear signal
        
        Args:
            evidence: {concept: strength}
        
        Returns:
            Normalized entropy ∈ [0,1]
        """
        if not evidence or len(evidence) == 1:
            return 0.0  # No ambiguity if single concept or no evidence
        
        # Normalize to probability distribution
        total = sum(evidence.values())
        if total == 0:
            return 0.0
        
        probs = [s / total for s in evidence.values()]
        
        # Shannon entropy
        entropy = -sum(p * np.log(p + 1e-10) for p in probs if p > 0)
        
        # Normalize by maximum entropy (uniform distribution)
        max_entropy = np.log(len(evidence))
        normalized = entropy / max_entropy if max_entropy > 0 else 0.0
        
        return float(normalized)
    
    def decompose_multi_concept(
        self,
        answer: str,
        question_concepts: List[str]
    ) -> Dict[str, Tuple[float, str]]:
        """
        Decompose answer with per-concept justifications.
        
        Returns:
            {concept: (strength, justification_text)}
        """
        result = {}
        
        for concept in question_concepts:
            strength = self._compute_strength(answer, concept)
            justification = self._explain_strength(answer, concept, strength)
            result[concept] = (strength, justification)
        
        return result
    
    def _explain_strength(self, answer: str, concept: str, strength: float) -> str:
        """Generate human-readable justification for evidence strength"""
        keywords = self.concept_keywords.get(concept, [])
        matches = [kw for kw in keywords if kw.lower() in answer.lower()]
        
        if strength > 0.8:
            return f"Strong evidence: answer demonstrates {concept} ({', '.join(matches[:3])})"
        elif strength > 0.5:
            return f"Moderate evidence: partial demonstration of {concept}"
        elif strength > 0.2:
            return f"Weak evidence: some indicators of {concept}"
        else:
            return f"Little/no evidence for {concept}"


class GraphConstrainedInference:
    """
    Bayesian inference with graph-constraints and soft evidence.
    
    Updates mastery beliefs using:
    1. Direct evidence from observations
    2. Prerequisite structure via concept graph
    3. Uncertainty propagation
    """
    
    def __init__(self, graph: CausalGraph):
        """
        Args:
            graph: Concept prerequisite graph
        """
        self.graph = graph
    
    def update_from_partial_answer(
        self,
        mastery_dists: Dict[str, ProbabilisticMastery],
        evidence: Dict[str, float],
        propagate: bool = True,
        evidence_weight: float = 1.0
    ) -> Dict[str, ProbabilisticMastery]:
        """
        Update mastery distributions from soft evidence.
        
        Args:
            mastery_dists: Current posterior distributions
            evidence: {concept: strength ∈ [0,1]}
            propagate: Whether to propagate through graph structure
            evidence_weight: Global weight for evidence (default 1.0)
        
        Returns:
            Updated distributions incorporating evidence + graph constraints
        """
        # Deep copy to avoid mutation
        updated = {c: self._copy_distribution(dist) for c, dist in mastery_dists.items()}
        
        # Phase 1: Direct evidence updates
        for concept, strength in evidence.items():
            if concept in updated:
                # Soft Bayesian update
                updated[concept].update_from_probability(
                    strength, 
                    weight=evidence_weight
                )
        
        if not propagate:
            return updated
        
        # Phase 2: Graph-constrained propagation
        return self._propagate_through_graph(updated, evidence)
    
    def _copy_distribution(self, dist: ProbabilisticMastery) -> ProbabilisticMastery:
        """Deep copy of distribution"""
        new_dist = ProbabilisticMastery(dist.concept_id, dist.alpha, dist.beta)
        new_dist.observation_count = dist.observation_count
        return new_dist
    
    def _propagate_through_graph(
        self,
        mastery_dists: Dict[str, ProbabilisticMastery],
        evidence: Dict[str, float]
    ) -> Dict[str, ProbabilisticMastery]:
        """
        Propagate mastery beliefs through prerequisite structure.
        
        Two mechanisms:
        1. Bottom-up: Strong prerequisites boost downstream concepts
        2. Top-down: Downstream evidence weakly constrains prerequisites
        """
        updated = {c: self._copy_distribution(dist) for c, dist in mastery_dists.items()}
        
        # Bottom-up propagation (prerequisites → dependents)
        for concept in self.graph.topological_sort():
            prereqs = self.graph.get_prerequisites(concept)
            
            if not prereqs:
                continue
            
            # Compute prerequisite signal
            prereq_means = [updated[p].mean() for p in prereqs]
            prereq_weights = [
                self.graph.get_edge_weight((p, concept)) 
                for p in prereqs
            ]
            
            # Weighted average
            total_weight = sum(prereq_weights)
            if total_weight > 0:
                prereq_signal = sum(
                    m * w for m, w in zip(prereq_means, prereq_weights)
                ) / total_weight
            else:
                prereq_signal = np.mean(prereq_means)
            
            # Current belief
            current_mean = updated[concept].mean()
            current_std = updated[concept].std()
            
            # Only boost if prerequisites are significantly stronger
            # AND we don't have strong contradictory evidence
            has_direct_evidence = concept in evidence
            
            if prereq_signal > current_mean + 0.5 * current_std and not has_direct_evidence:
                # Soft uplift (prerequisites provide weak positive evidence)
                boost_strength = 0.25
                updated[concept].update_from_probability(
                    prereq_signal, 
                    weight=boost_strength
                )
            
            # Propagate uncertainty
            self._propagate_uncertainty(updated, concept, prereqs)
        
        return updated
    
    def _propagate_uncertainty(
        self,
        mastery_dists: Dict[str, ProbabilisticMastery],
        concept: str,
        prereqs: List[str]
    ):
        """
        Propagate uncertainty from prerequisites to dependent.
        
        If prerequisites have high variance, dependent should too.
        """
        if not prereqs:
            return
        
        # Average prerequisite uncertainty
        prereq_variances = [mastery_dists[p].variance() for p in prereqs]
        avg_prereq_var = np.mean(prereq_variances)
        
        current_var = mastery_dists[concept].variance()
        
        # If prerequisite uncertainty is high, increase downstream uncertainty
        if avg_prereq_var > current_var * 1.5:
            # Reduce effective observation count (increases variance)
            scale_factor = 0.85
            mastery_dists[concept].alpha *= scale_factor
            mastery_dists[concept].beta *= scale_factor
    
    def batch_update(
        self,
        mastery_dists: Dict[str, ProbabilisticMastery],
        evidence_sequence: List[Dict[str, float]]
    ) -> Dict[str, ProbabilisticMastery]:
        """
        Process sequence of evidence (e.g., multiple questions).
        
        Args:
            mastery_dists: Initial beliefs
            evidence_sequence: List of evidence dicts
        
        Returns:
            Final updated beliefs
        """
        current = mastery_dists
        
        for evidence in evidence_sequence:
            current = self.update_from_partial_answer(
                current, 
                evidence, 
                propagate=True
            )
        
        return current


# Demo and testing
if __name__ == '__main__':
    print("="*70)
    print("PARTIAL ANSWER HANDLING - DEMONSTRATION")
    print("="*70)
    
    # Setup concept graph
    graph = CausalGraph(['Fractions', 'Addition', 'Decimals', 'Mixed Numbers'])
    graph.add_prerequisite('Fractions', 'Mixed Numbers', weight=0.85)
    graph.add_prerequisite('Fractions', 'Decimals', weight=0.75)
    graph.add_prerequisite('Addition', 'Mixed Numbers', weight=0.70)
    
    # Initial mastery beliefs (weak)
    masteries = {
        'Fractions': ProbabilisticMastery.from_point_estimate('Fractions', 0.5, confidence=0.4),
        'Addition': ProbabilisticMastery.from_point_estimate('Addition', 0.7, confidence=0.6),
        'Decimals': ProbabilisticMastery.from_point_estimate('Decimals', 0.3, confidence=0.3),
        'Mixed Numbers': ProbabilisticMastery.from_point_estimate('Mixed Numbers', 0.35, confidence=0.3)
    }
    
    print("\n" + "="*70)
    print("SCENARIO: Student solves fraction addition problem")
    print("="*70)
    
    # Question requires Fractions and Addition
    question = "Compute 3/4 + 1/2"
    partial_answer = "3/4 + 1/2 = 3/4 + 2/4 (found common denominator, didn't finish)"
    
    print(f"\nQuestion: {question}")
    print(f"Student answer: {partial_answer}")
    
    # Analyze partial answer
    analyzer = PartialAnswerAnalyzer()
    evidence = analyzer.analyze(partial_answer, ['Fractions', 'Addition'])
    
    print(f"\nEvidence decomposition:")
    for concept, strength in evidence.items():
        print(f"  {concept}: {strength:.2f}")
    
    ambiguity = analyzer.compute_ambiguity(evidence)
    print(f"\nAmbiguity score: {ambiguity:.3f}")
    
    # Update with graph-constrained inference
    inferencer = GraphConstrainedInference(graph)
    updated = inferencer.update_from_partial_answer(masteries, evidence)
    
    print("\n" + "="*70)
    print("MASTERY UPDATES (with graph propagation)")
    print("="*70)
    
    for concept in graph.concepts:
        before_mean = masteries[concept].mean()
        before_std = masteries[concept].std()
        after_mean = updated[concept].mean()
        after_std = updated[concept].std()
        
        delta = after_mean - before_mean
        
        print(f"\n{concept}:")
        print(f"  Before: {before_mean:.3f} ± {before_std:.3f}")
        print(f"  After:  {after_mean:.3f} ± {after_std:.3f}")
        print(f"  Change: {delta:+.3f}")
    
    print("\n" + "="*70)
    print("Graph propagation effects:")
    print("- Fractions: Direct evidence → strong update")
    print("- Addition: Weak evidence → small update")
    print("- Decimals: No direct evidence, but Fractions improved → slight boost")
    print("- Mixed Numbers: Both prerequisites improved → propagated boost")
    print("="*70)
