"""
Uncertainty Propagation Module
Handles propagation of uncertainty through causal graph via Monte Carlo sampling.
"""

import numpy as np
from typing import Dict, List, Callable, Optional
from models.probabilistic_mastery import ProbabilisticMastery
from models.causal_graph_extended import CausalGraph


class UncertaintyPropagator:
    """
    Propagates uncertainty through causal graph structure.
    
    Uses Monte Carlo sampling to:
    1. Sample from posterior distributions of mastery
    2. Forward-propagate through graph using structural equations
    3. Compute posterior statistics for downstream concepts
    """
    
    def __init__(self, graph: CausalGraph, n_samples: int = 1000):
        """
        Args:
            graph: Causal graph structure
            n_samples: Number of Monte Carlo samples (higher = more accurate)
        """
        self.graph = graph
        self.n_samples = n_samples
    
    def propagate(
        self, 
        mastery_distributions: Dict[str, ProbabilisticMastery],
        propagation_fn: Optional[Callable] = None
    ) -> Dict[str, np.ndarray]:
        """
        Propagate uncertainty through graph.
        
        Args:
            mastery_distributions: Dict mapping concept → ProbabilisticMastery
            propagation_fn: Optional custom propagation function
                           (if None, uses weighted average of prerequisites)
        
        Returns:
            Dict mapping concept → array of posterior samples
        """
        # Get topological order for forward propagation
        topo_order = self.graph.topological_sort()
        
        # Storage for samples
        all_samples = {c: [] for c in self.graph.concepts}
        
        # Default propagation: weighted average of prerequisites
        if propagation_fn is None:
            propagation_fn = self._default_propagation
        
        # Monte Carlo sampling
        for _ in range(self.n_samples):
            # Sample current mastery for each concept
            sample = {}
            for concept in self.graph.concepts:
                if concept in mastery_distributions:
                    sample[concept] = mastery_distributions[concept].sample()
                else:
                    sample[concept] = 0.5  # Default if no distribution
            
            # Forward propagate through graph
            for concept in topo_order:
                prereqs = self.graph.get_prerequisites(concept)
                
                if prereqs:  # Has prerequisites - update based on them
                    prereq_values = [sample[p] for p in prereqs]
                    prereq_weights = [self.graph.get_edge_weight((p, concept)) for p in prereqs]
                    
                    # Apply propagation function
                    propagated_value = propagation_fn(
                        current=sample[concept],
                        prereq_values=prereq_values,
                        prereq_weights=prereq_weights
                    )
                    
                    sample[concept] = np.clip(propagated_value, 0.0, 1.0)
            
            # Store sample
            for concept in self.graph.concepts:
                all_samples[concept].append(sample[concept])
        
        # Convert lists to arrays
        return {c: np.array(samples) for c, samples in all_samples.items()}
    
    def _default_propagation(
        self, 
        current: float, 
        prereq_values: List[float], 
        prereq_weights: List[float]
    ) -> float:
        """
        Default propagation: blend current mastery with prerequisite influence.
        
        Formula: M_new = λ·M_current + (1-λ)·weighted_avg(prerequisites)
        where λ = min(M_current, 0.7) to allow strong prerequisites to boost weak concepts
        """
        if not prereq_values:
            return current
        
        # Weighted average of prerequisites
        total_weight = sum(prereq_weights)
        if total_weight == 0:
            prereq_avg = np.mean(prereq_values)
        else:
            prereq_avg = sum(v * w for v, w in zip(prereq_values, prereq_weights)) / total_weight
        
        # Blend with current mastery (concepts with strong prerequisites can improve)
        blend_factor = min(current, 0.7)  # Allow improvement if current is weak
        return blend_factor * current + (1 - blend_factor) * prereq_avg
    
    def compute_statistics(self, samples: np.ndarray) -> Dict[str, float]:
        """
        Compute posterior statistics from samples.
        
        Returns:
            Dictionary with mean, std, quantiles, etc.
        """
        return {
            'mean': float(np.mean(samples)),
            'std': float(np.std(samples)),
            'median': float(np.median(samples)),
            'q05': float(np.percentile(samples, 5)),
            'q25': float(np.percentile(samples, 25)),
            'q75': float(np.percentile(samples, 75)),
            'q95': float(np.percentile(samples, 95)),
            'min': float(np.min(samples)),
            'max': float(np.max(samples))
        }
    
    def propagate_with_intervention(
        self,
        mastery_distributions: Dict[str, ProbabilisticMastery],
        intervention: Dict[str, float]
    ) -> Dict[str, np.ndarray]:
        """
        Propagate with counterfactual intervention.
        
        Args:
            mastery_distributions: Current mastery distributions
            intervention: Dict mapping concept → intervened value (e.g., {'Multiplication': 0.9})
        
        Returns:
            Posterior samples under intervention
        """
        # Create modified distributions for intervened concepts
        modified_dists = mastery_distributions.copy()
        
        for concept, value in intervention.items():
            # Replace with delta distribution (all mass at intervened value)
            # Implement as Beta with very high concentration
            modified_dists[concept] = ProbabilisticMastery(
                concept, 
                prior_alpha=value * 1000, 
                prior_beta=(1 - value) * 1000
            )
        
        # Propagate with interventions
        return self.propagate(modified_dists)
    
    def estimate_causal_effect(
        self,
        mastery_distributions: Dict[str, ProbabilisticMastery],
        intervention_concept: str,
        intervention_value: float,
        target_concept: str
    ) -> Dict[str, float]:
        """
        Estimate causal effect of intervening on one concept on another.
        
        Returns:
            Dictionary with:
            - factual_mean: E[M_target] under current state
            - counterfactual_mean: E[M_target | do(M_intervention = value)]
            - ate: Average Treatment Effect (difference)
            - ate_std: Standard error of ATE
        """
        # Factual samples
        factual_samples = self.propagate(mastery_distributions)
        factual_target = factual_samples[target_concept]
        
        # Counterfactual samples
        cf_samples = self.propagate_with_intervention(
            mastery_distributions,
            {intervention_concept: intervention_value}
        )
        cf_target = cf_samples[target_concept]
        
        # Compute effect
        ate = np.mean(cf_target) - np.mean(factual_target)
        
        # Estimate standard error (assuming independence of samples)
        ate_var = np.var(factual_target) / self.n_samples + np.var(cf_target) / self.n_samples
        ate_std = np.sqrt(ate_var)
        
        return {
            'factual_mean': float(np.mean(factual_target)),
            'factual_std': float(np.std(factual_target)),
            'counterfactual_mean': float(np.mean(cf_target)),
            'counterfactual_std': float(np.std(cf_target)),
            'ate': float(ate),
            'ate_std': float(ate_std),
            'effect_size': float(ate / (np.std(factual_target) + 1e-8))  # Standardized effect
        }
    
    def __repr__(self):
        return f"UncertaintyPropagator(n_samples={self.n_samples})"
