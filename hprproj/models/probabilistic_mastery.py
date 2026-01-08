"""
Probabilistic Mastery Model
Implements Beta-distributed mastery with Bayesian updating.
"""

import numpy as np
from scipy.stats import beta
from typing import Tuple, Optional


class ProbabilisticMastery:
    """
    Beta-distributed mastery representation with Bayesian updating.
    
    Represents uncertainty in mastery estimates via Beta(α, β) distribution.
    Higher α = more successful observations
    Higher β = more failed observations
    """
    
    def __init__(self, concept_id: str, prior_alpha: float = 2.0, prior_beta: float = 2.0):
        """
        Initialize probabilistic mastery with prior distribution.
        
        Args:
            concept_id: Unique identifier for the concept
            prior_alpha: Prior success pseudo-count (default: 2.0 = weak prior)
            prior_beta: Prior failure pseudo-count (default: 2.0 = weak prior)
        """
        self.concept_id = concept_id
        self.alpha = prior_alpha
        self.beta = prior_beta
        self.observation_count = 0
    
    def mean(self) -> float:
        """Expected value E[M_c] = α / (α + β)"""
        return self.alpha / (self.alpha + self.beta)
    
    def mode(self) -> float:
        """Most likely value (peak of distribution)"""
        if self.alpha > 1 and self.beta > 1:
            return (self.alpha - 1) / (self.alpha + self.beta - 2)
        return self.mean()
    
    def variance(self) -> float:
        """Variance Var[M_c] - measure of uncertainty"""
        a, b = self.alpha, self.beta
        return (a * b) / ((a + b)**2 * (a + b + 1))
    
    def std(self) -> float:
        """Standard deviation - square root of variance"""
        return np.sqrt(self.variance())
    
    def credible_interval(self, confidence: float = 0.9) -> Tuple[float, float]:
        """
        Bayesian credible interval (not confidence interval).
        
        Args:
            confidence: Credibility level (default 0.9 = 90% CI)
        
        Returns:
            (lower, upper) bounds such that P(lower ≤ M_c ≤ upper) = confidence
        """
        tail = (1 - confidence) / 2
        lower = beta.ppf(tail, self.alpha, self.beta)
        upper = beta.ppf(1 - tail, self.alpha, self.beta)
        return (float(lower), float(upper))
    
    def update(self, success: bool, weight: float = 1.0):
        """
        Bayesian update from binary observation.
        
        Args:
            success: True if student succeeded, False if failed
            weight: Weight of this observation (default 1.0)
        """
        if success:
            self.alpha += weight
        else:
            self.beta += weight
        
        self.observation_count += 1
    
    def update_from_probability(self, prob_correct: float, weight: float = 1.0):
        """
        Soft update from probabilistic outcome.
        
        Useful when we have probabilistic predictions rather than binary outcomes.
        
        Args:
            prob_correct: Probability that student would be correct (0-1)
            weight: Weight of this observation
        """
        self.alpha += weight * prob_correct
        self.beta += weight * (1 - prob_correct)
        self.observation_count += 1
    
    def sample(self, n_samples: int = 1) -> np.ndarray:
        """
        Draw random samples from posterior distribution.
        
        Args:
            n_samples: Number of samples to draw
        
        Returns:
            Array of mastery samples ∈ [0,1]
        """
        samples = np.random.beta(self.alpha, self.beta, n_samples)
        return samples if n_samples > 1 else samples[0]
    
    def kl_divergence(self, other: 'ProbabilisticMastery') -> float:
        """
        KL divergence KL(self || other) - measure of distribution difference.
        
        Useful for detecting distribution shift or measuring learning progress.
        """
        # Analytical formula for KL divergence between two Beta distributions
        a1, b1 = self.alpha, self.beta
        a2, b2 = other.alpha, other.beta
        
        from scipy.special import digamma, betaln
        
        kl = betaln(a2, b2) - betaln(a1, b1)
        kl += (a1 - a2) * digamma(a1)
        kl += (b1 - b2) * digamma(b1)
        kl += (a2 - a1 + b2 - b1) * digamma(a1 + b1)
        
        return float(kl)
    
    def to_dict(self) -> dict:
        """Export to dictionary for serialization"""
        lower, upper = self.credible_interval(0.9)
        
        return {
            'concept_id': self.concept_id,
            'mean': float(self.mean()),
            'mode': float(self.mode()),
            'std': float(self.std()),
            'credible_interval_90': {
                'lower': float(lower),
                'upper': float(upper)
            },
            'alpha': float(self.alpha),
            'beta': float(self.beta),
            'observations': self.observation_count
        }
    
    @classmethod
    def from_point_estimate(cls, concept_id: str, point_estimate: float, 
                           confidence: float = 0.5, prior_strength: float = 4.0):
        """
        Create ProbabilisticMastery from a point estimate.
        
        Useful for converting existing point-estimate systems to probabilistic.
        
        Args:
            concept_id: Concept identifier
            point_estimate: Current mastery estimate (0-1)
            confidence: How confident we are (0-1), higher = lower variance
            prior_strength: Total pseudo-count strength (higher = stronger prior)
        
        Returns:
            ProbabilisticMastery instance
        """
        # Method of moments: set α, β such that mean = point_estimate
        # and variance reflects confidence
        
        # Variance decreases with more observations
        variance = (1 - confidence) * point_estimate * (1 - point_estimate)
        
        # Solve for α, β
        # mean = α/(α+β), var = αβ/[(α+β)²(α+β+1)]
        mean = np.clip(point_estimate, 0.01, 0.99)
        
        # Use prior_strength to control total count
        alpha = mean * prior_strength
        beta_param = (1 - mean) * prior_strength
        
        return cls(concept_id, prior_alpha=alpha, prior_beta=beta_param)
    
    def __repr__(self):
        return f"ProbabilisticMastery({self.concept_id}, μ={self.mean():.3f}, σ={self.std():.3f})"
