"""
Causal Explainer Module
Generates multi-level causal explanations for predictions and interventions.
"""

import numpy as np
from typing import Dict, List, Optional
from models.causal_graph_extended import CausalGraph


class CausalExplainer:
    """
    Generates multi-level causal explanations.
    
    Supports three levels of granularity:
    1. Concept-level: What concepts are involved?
    2. Causal path-level: Which causal paths matter?
    3. Confounder-level: How do external factors contribute?
    """
    
    def __init__(self, graph: CausalGraph, performance_model):
        self.graph = graph
        self.perf_model = performance_model
    
    def explain_performance(
        self,
        student_masteries: Dict[str, float],
        concept: str,
        observed_result: Optional[bool] = None,
        question_params: Optional[Dict] = None,
        level: str = 'all'
    ) -> Dict:
        """
        Generate causal explanation for student performance on a concept.
        
        Args:
            student_masteries: Current mastery state
            concept: Target concept
            observed_result: Actual outcome (True/False), if known
            question_params: Confounder values (difficulty, time_pressure, etc.)
            level: 'concept', 'causal_path', 'confounder', or 'all'
        
        Returns:
            Structured explanation dictionary
        """
        if question_params is None:
            question_params = {'difficulty': 0.5, 'time_pressure': 0.5, 'language_complexity': 0.5}
        
        # Get prediction
        target_mastery = student_masteries.get(concept, 0.5)
        prereqs = self.graph.get_prerequisites(concept)
        prereq_masteries = [student_masteries.get(p, 0.5) for p in prereqs]
        
        prediction = self.perf_model.explain_prediction(
            target_mastery,
            prereq_masteries,
            **question_params
        )
        
        explanation = {
            'concept': concept,
            'observed_result': observed_result,
            'predicted_probability': prediction['probability']
        }
        
        if level in ['concept', 'all']:
            explanation['concept_level'] = self._explain_concept_level(
                concept, target_mastery, prereqs, prereq_masteries
            )
        
        if level in ['causal_path', 'all']:
            explanation['causal_path_level'] = self._explain_causal_paths(
                concept, student_masteries
            )
        
        if level in ['confounder', 'all']:
            explanation['confounder_level'] = self._explain_confounders(
                prediction, question_params
            )
        
        # Generate natural language summary
        explanation['summary'] = self._generate_summary(explanation, observed_result)
        
        return explanation
    
    def _explain_concept_level(
        self,
        concept: str,
        target_mastery: float,
        prereqs: List[str],
        prereq_masteries: List[float]
    ) -> Dict:
        """Level 1: Concept-level attribution"""
        return {
            'target_concept': concept,
            'target_mastery': float(target_mastery),
            'target_proficiency': self._proficiency_label(target_mastery),
            'prerequisites': [
                {
                    'concept': p,
                    'mastery': float(m),
                    'proficiency': self._proficiency_label(m)
                }
                for p, m in zip(prereqs, prereq_masteries)
            ],
            'avg_prerequisite_mastery': float(np.mean(prereq_masteries)) if prereq_masteries else None
        }
    
    def _explain_causal_paths(
        self,
        target_concept: str,
        student_masteries: Dict[str, float]
    ) -> Dict:
        """Level 2: Causal path decomposition"""
        # Find all upstream concepts
        ancestors = self.graph.get_all_ancestors(target_concept)
        
        # Compute path-specific effects for each ancestor
        path_attributions = {}
        
        for ancestor in ancestors:
            paths = self.graph.enumerate_paths(ancestor, target_concept, max_length=5)
            
            if paths:
                # Compute effect via each path
                path_effects = []
                for path in paths:
                    weight = self.graph.compute_path_weight(path)
                    source_mastery = student_masteries.get(ancestor, 0.5)
                    
                    # Effect = path_weight × source_mastery
                    effect = weight * source_mastery
                    
                    path_effects.append({
                        'path': path,
                        'weight': float(weight),
                        'contribution': float(effect)
                    })
                
                # Sort by contribution
                path_effects.sort(key=lambda x: -x['contribution'])
                
                path_attributions[ancestor] = {
                    'mastery': student_masteries.get(ancestor, 0.5),
                    'n_paths': len(paths),
                    'top_paths': path_effects[:3],  # Top 3 paths
                    'total_contribution': sum(p['contribution'] for p in path_effects)
                }
        
        return {
            'target_concept': target_concept,
            'n_ancestors': len(ancestors),
            'path_attributions': path_attributions
        }
    
    def _explain_confounders(
        self,
        prediction: Dict,
        question_params: Dict
    ) -> Dict:
        """Level 3: Confounder attribution"""
        components = prediction['components']
        
        return {
            'mastery_contribution': {
                'target': float(components['target_mastery_contribution']),
                'prerequisites': float(components['prerequisite_contribution']),
                'total': float(components['target_mastery_contribution'] + components['prerequisite_contribution'])
            },
            'confounder_contribution': {
                'total': float(components['confounder_contribution']),
                'breakdown': {
                    'difficulty': float(-question_params['difficulty'] * self.perf_model.gamma / 3),
                    'time_pressure': float(-question_params['time_pressure'] * self.perf_model.gamma / 3),
                    'language_complexity': float(-question_params['language_complexity'] * self.perf_model.gamma / 3)
                }
            },
            'confounder_values': question_params
        }
    
    def _proficiency_label(self, mastery: float) -> str:
        """Convert mastery score to human-readable label"""
        if mastery >= 0.85:
            return "Expert"
        elif mastery >= 0.70:
            return "Proficient"
        elif mastery >= 0.50:
            return "Developing"
        elif mastery >= 0.30:
            return "Beginner"
        else:
            return "Needs Support"
    
    def _generate_summary(self, explanation: Dict, observed_result: Optional[bool]) -> str:
        """Generate natural language summary"""
        lines = []
        
        # Header
        concept = explanation['concept']
        pred_prob = explanation['predicted_probability']
        lines.append(f"Performance Analysis for {concept}:")
        lines.append(f"Predicted success probability: {pred_prob*100:.1f}%")
        
        if observed_result is not None:
            outcome = "succeeded" if observed_result else "failed"
            lines.append(f"Student {outcome} on this question.")
        
        # Concept level
        if 'concept_level' in explanation:
            target_prof = explanation['concept_level']['target_proficiency']
            target_mast = explanation['concept_level']['target_mastery']
            lines.append(f"\nMastery: {target_prof} ({target_mast*100:.1f}%) in {concept}")
            
            if explanation['concept_level']['prerequisites']:
                prereq_avg = explanation['concept_level']['avg_prerequisite_mastery']
                lines.append(f"Prerequisite foundation: {prereq_avg*100:.1f}% average")
        
        # Confounders
        if 'confounder_level' in explanation:
            conf_contrib = explanation['confounder_level']['confounder_contribution']['total']
            if conf_contrib < -0.2:
                lines.append(f"Performance hindered by question difficulty/complexity (impact: {conf_contrib:.2f})")
        
        return "\n".join(lines)
    
    def explain_intervention(
        self,
        intervention_concept: str,
        intervention_value: float,
        affected_concepts: List[str],
        before_masteries: Dict[str, float],
        after_masteries: Dict[str, float]
    ) -> Dict:
        """
        Explain effects of a counterfactual intervention.
        
        Shows how intervening on one concept cascades through the graph.
        """
        # Compute changes
        changes = {}
        for concept in affected_concepts:
            before = before_masteries.get(concept, 0.0)
            after = after_masteries.get(concept, 0.0)
            delta = after - before
            
            if abs(delta) > 0.001:  # Only report significant changes
                changes[concept] = {
                    'before': float(before),
                    'after': float(after),
                    'delta': float(delta),
                    'percent_change': float((delta / (before + 1e-8)) * 100)
                }
        
        # Trace causal paths
        causal_chains = {}
        for affected in affected_concepts:
            if affected != intervention_concept:
                paths = self.graph.enumerate_paths(intervention_concept, affected, max_length=4)
                if paths:
                    causal_chains[affected] = [
                        ' → '.join(path) for path in paths[:2]  # Top 2 shortest paths
                    ]
        
        return {
            'intervention': {
                'concept': intervention_concept,
                'set_to': float(intervention_value)
            },
            'direct_effects': changes,
            'causal_chains': causal_chains,
            'summary': self._summarize_intervention(
                intervention_concept, intervention_value, changes, causal_chains
            )
        }
    
    def _summarize_intervention(
        self,
        concept: str,
        value: float,
        changes: Dict,
        chains: Dict
    ) -> str:
        """Generate natural language summary of intervention"""
        lines = [f"Intervention: Set {concept} mastery to {value*100:.0f}%\n"]
        
        if not changes:
            lines.append("No significant downstream effects detected.")
        else:
            lines.append(f"Propagated to {len(changes)} downstream concept(s):\n")
            
            # Sort by impact
            sorted_changes = sorted(changes.items(), key=lambda x: -abs(x[1]['delta']))
            
            for affected, change in sorted_changes[:5]:  # Top 5
                delta_pct = change['percent_change']
                lines.append(f"  • {affected}: {change['before']*100:.0f}% → {change['after']*100:.0f}% ({delta_pct:+.1f}%)")
        
        return "\n".join(lines)
