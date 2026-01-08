"""
Concept Fragility Analyzer
Identifies bottleneck concepts and ranks by downstream impact.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from models.causal_graph_extended import CausalGraph


class FragilityAnalyzer:
    """
    Analyzes concept fragility and identifies bottlenecks in knowledge structure.
    
    A concept is "fragile" or a "bottleneck" if:
    1. Current mastery is below threshold (weak foundation)
    2. Many downstream concepts depend on it (high impact)
    3. Sensitivity coefficients are large (strong causal influence)
    """
    
    def __init__(self, graph: CausalGraph):
        self.graph = graph
    
    def compute_fragility_score(
        self,
        concept: str,
        student_masteries: Dict[str, float],
        mastery_threshold: float = 0.6
    ) -> float:
        """
        Compute fragility score for a single concept.
        
        Fragility = (1 - mastery) × downstream_impact
        
        where downstream_impact measures how many concepts are negatively affected.
        """
        mastery = student_masteries.get(concept, 0.0)
        mastery_gap = max(0, mastery_threshold - mastery)
        
        if mastery_gap == 0:
            return 0.0  # Not fragile if already above threshold
        
        # Compute downstream impact
        descendants = self.graph.get_all_descendants(concept)
        
        impact = 0.0
        for desc in descendants:
            sensitivity = self.graph.compute_sensitivity(concept, desc)
            desc_mastery = student_masteries.get(desc, 0.0)
            desc_gap = 1.0 - desc_mastery  # Room for improvement
            
            # Impact = sensitivity × how much downstream could improve
            impact += sensitivity * desc_gap
        
        fragility = mastery_gap * (1 + impact)  # +1 to account for self
        return fragility
    
    def rank_bottlenecks(
        self,
        student_masteries: Dict[str, float],
        mastery_threshold: float = 0.6,
        top_k: Optional[int] = None
    ) -> List[Tuple[str, float, Dict]]:
        """
        Rank all concepts by fragility/bottleneck score.
        
        Args:
            student_masteries: Current mastery state
            mastery_threshold: Threshold for "weak" concepts
            top_k: Return only top K bottlenecks (None = all)
        
        Returns:
            List of (concept, fragility_score, details) sorted by score (descending)
        """
        rankings = []
        
        for concept in self.graph.concepts:
            mastery = student_masteries.get(concept, 0.0)
            
            if mastery < mastery_threshold:
                fragility = self.compute_fragility_score(concept, student_masteries, mastery_threshold)
                
                if fragility > 0:
                    details = self._analyze_concept_impact(concept, student_masteries)
                    rankings.append((concept, fragility, details))
        
        # Sort by fragility (descending)
        rankings.sort(key=lambda x: -x[1])
        
        if top_k:
            rankings = rankings[:top_k]
        
        return rankings
    
    def _analyze_concept_impact(
        self,
        concept: str,
        student_masteries: Dict[str, float]
    ) -> Dict:
        """Detailed analysis of concept's downstream impact"""
        descendants = self.graph.get_all_descendants(concept)
        
        # Categorize descendants by current mastery
        struggling = []
        moderate = []
        strong = []
        
        for desc in descendants:
            desc_mastery = student_masteries.get(desc, 0.0)
            sensitivity = self.graph.compute_sensitivity(concept, desc)
            
            item = {
                'concept': desc,
                'mastery': desc_mastery,
                'sensitivity': sensitivity
            }
            
            if desc_mastery < 0.4:
                struggling.append(item)
            elif desc_mastery < 0.7:
                moderate.append(item)
            else:
                strong.append(item)
        
        return {
            'n_descendants': len(descendants),
            'struggling_descendants': struggling,
            'moderate_descendants': moderate,
            'strong_descendants': strong,
            'max_sensitivity': max([d['sensitivity'] for d in struggling + moderate + strong], default=0.0)
        }
    
    def identify_critical_paths(
        self,
        source: str,
        target: str,
        min_path_weight: float = 0.1
    ) -> List[Dict]:
        """
        Identify critical causal paths from source to target.
        
        Critical paths are those with high cumulative weight (strong influence).
        """
        paths = self.graph.enumerate_paths(source, target)
        
        path_info = []
        for path in paths:
            weight = self.graph.compute_path_weight(path)
            
            if weight >= min_path_weight:
                path_info.append({
                    'path': path,
                    'weight': weight,
                    'length': len(path) - 1,
                    'edges': [(path[i], path[i+1]) for i in range(len(path)-1)]
                })
        
        # Sort by weight (descending)
        path_info.sort(key=lambda x: -x['weight'])
        
        return path_info
    
    def compute_vulnerability_matrix(
        self,
        student_masteries: Dict[str, float]
    ) -> np.ndarray:
        """
        Compute full vulnerability matrix V[i,j] = vulnerability of j due to weakness in i.
        
        Vulnerability = sensitivity × mastery_gap_i × (1 - mastery_j)
        
        Returns:
            n×n matrix where V[i,j] measures how much concept j is vulnerable due to concept i
        """
        n = self.graph.n_concepts
        V = np.zeros((n, n))
        
        for i, source in enumerate(self.graph.concepts):
            source_gap = 1.0 - student_masteries.get(source, 0.0)
            
            for j, target in enumerate(self.graph.concepts):
                if i == j:
                    V[i, j] = 0.0
                    continue
                
                # Check if there's a path
                sensitivity = self.graph.compute_sensitivity(source, target)
                
                if sensitivity > 0:
                    target_gap = 1.0 - student_masteries.get(target, 0.0)
                    V[i, j] = sensitivity * source_gap * target_gap
        
        return V
    
    def suggest_remediation_priority(
        self,
        student_masteries: Dict[str, float],
        max_suggestions: int = 5
    ) -> List[Dict]:
        """
        Generate prioritized remediation suggestions with justifications.
        
        Returns:
            List of suggestions, each with concept, priority score, and justification
        """
        bottlenecks = self.rank_bottlenecks(student_masteries, top_k=max_suggestions)
        
        suggestions = []
        for rank, (concept, fragility, details) in enumerate(bottlenecks, 1):
            mastery = student_masteries.get(concept, 0.0)
            
            justification = self._generate_justification(
                concept, mastery, fragility, details
            )
            
            suggestions.append({
                'rank': rank,
                'concept': concept,
                'current_mastery': mastery,
                'fragility_score': fragility,
                'n_affected_concepts': details['n_descendants'],
                'justification': justification,
                'struggling_dependents': [d['concept'] for d in details['struggling_descendants']]
            })
        
        return suggestions
    
    def _generate_justification(
        self,
        concept: str,
        mastery: float,
        fragility: float,
        details: Dict
    ) -> str:
        """Generate human-readable justification for remediation"""
        n_desc = details['n_descendants']
        n_struggling = len(details['struggling_descendants'])
        
        lines = []
        lines.append(f"Current mastery: {mastery*100:.1f}% (weak foundation)")
        lines.append(f"Impacts {n_desc} downstream concept(s)")
        
        if n_struggling > 0:
            struggling_names = [d['concept'] for d in details['struggling_descendants'][:3]]
            lines.append(f"Critical for: {', '.join(struggling_names)}")
        
        lines.append(f"Fragility score: {fragility:.2f}")
        
        return " | ".join(lines)
    
    def __repr__(self):
        return f"FragilityAnalyzer(graph={self.graph})"
