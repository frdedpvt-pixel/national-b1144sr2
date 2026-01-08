"""
Causal Performance Model
Explicitly models performance as a function of Mastery + Confounders.
"""

import numpy as np
from typing import Dict, Optional


class CausalPerformanceModel:
    """
    Predicts performance P(Y=1 | M, D, T, L)
    
    Variables:
    - M: Concept Mastery [0,1]
    - D: Difficulty [0,1] (Global "easiness" inverse or specific hurdle)
    - T: Time Pressure [0,1] (0 = unlimited, 1 = extremely rushed)
    - L: Language Complexity [0,1] (0 = simple, 1 = archaic/complex)
    
    Structural Equation:
    logit = alpha * M_target 
          + beta * M_prereqs 
          - gamma_D * D 
          - gamma_T * T 
          - gamma_L * L
    """
    
    def __init__(
        self, 
        alpha: float = 4.0,   # Sensitivity to target mastery
        beta: float = 2.0,    # Sensitivity to prerequisites
        gamma_d: float = 3.0, # Sensitivity to difficulty
        gamma_t: float = 1.5, # Sensitivity to time pressure
        gamma_l: float = 1.0  # Sensitivity to language
    ):
        self.alpha = alpha
        self.beta = beta
        self.gamma_d = gamma_d
        self.gamma_t = gamma_t
        self.gamma_l = gamma_l
        
    def predict_probability(
        self,
        target_mastery: float,
        prerequisite_masteries: list[float],
        difficulty: float = 0.5,
        time_pressure: float = 0.5,
        language_complexity: float = 0.5
    ) -> float:
        """
        Compute P(Y=1) given causal parents.
        """
        # 1. Mastery Components (Positive drivers)
        m_component = self.alpha * target_mastery
        
        p_component = 0.0
        if prerequisite_masteries:
            p_component = self.beta * np.mean(prerequisite_masteries)
            
        # 2. Confounder Components (Negative drivers/Hurdles)
        # Note: Difficulty usually subtracts from logits (harder -> lower prob)
        c_component = -(
            self.gamma_d * difficulty +
            self.gamma_t * time_pressure +
            self.gamma_l * language_complexity
        )
        
        # 3. Combine
        logit = m_component + p_component + c_component
        
        # 4. Sigmoid
        return 1.0 / (1.0 + np.exp(-logit))

    def predict_performance(self, target_mastery: float, prereq_masteries: list[float], 
                          difficulty: float = 0.5, time_pressure: float = 0.5, 
                          language_complexity: float = 0.5) -> float:
        """Alias for consistency with backend usage"""
        return self.predict_probability(target_mastery, prereq_masteries, difficulty, time_pressure, language_complexity)
    
    def explain_prediction(
        self, 
        target_mastery: float,
        prerequisite_masteries: list[float],
        difficulty: float,
        time_pressure: float,
        language_complexity: float
    ) -> Dict:
        """
        Decompose prediction into causal components.
        """
        # Calculate raw impacts in logit space
        impact_mastery = self.alpha * target_mastery
        impact_prereqs = self.beta * np.mean(prerequisite_masteries) if prerequisite_masteries else 0
        impact_difficulty = -self.gamma_d * difficulty
        impact_time = -self.gamma_t * time_pressure
        impact_language = -self.gamma_l * language_complexity
        
        logit = impact_mastery + impact_prereqs + impact_difficulty + impact_time + impact_language
        prob = 1.0 / (1.0 + np.exp(-logit))
        
        return {
            'probability': prob,
            'logit_components': {
                'mastery': impact_mastery,
                'prerequisites': impact_prereqs,
                'difficulty': impact_difficulty,
                'time_pressure': impact_time,
                'language_complexity': impact_language
            },
            'primary_driver': self._identify_primary_driver(
                impact_mastery, impact_prereqs, 
                impact_difficulty, impact_time, impact_language
            )
        }
        
    def _identify_primary_driver(self, m, p, d, t, l):
        """Identify which factor is most suppressing the score (if low) or boosting it"""
        # This is a heuristic for explanation
        negatives = {'Difficulty': d, 'Time Pressure': t, 'Language': l}
        
        # Find strongest negative force
        worst_confounder = min(negatives.items(), key=lambda x: x[1])
        
        # If mastery is low relative to max possible mastery impact
        mastery_deficit = (self.alpha * 1.0) - m
        
        if mastery_deficit > abs(worst_confounder[1]):
             return "Mastery Deficit"
        else:
             return f"Confounder: {worst_confounder[0]}"

