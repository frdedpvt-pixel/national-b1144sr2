"""
Extended Causal Graph with Path Analysis and Sensitivity Computation
"""

import numpy as np
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, deque


class CausalGraph:
    """
    Extended concept graph with causal reasoning capabilities.
    
    Supports:
    - Path enumeration for causal attribution
    - Sensitivity analysis (∂M_target / ∂M_source)
    - Bottleneck detection
    - Descendant/ancestor queries
    """
    
    def __init__(self, concepts: List[str]):
        self.concepts = concepts
        self.n_concepts = len(concepts)
        self.concept_to_idx = {c: i for i, c in enumerate(concepts)}
        self.idx_to_concept = {i: c for i, c in enumerate(concepts)}
        
        # Adjacency matrix: adj[i][j] = weight if i → j
        self.adjacency = np.zeros((self.n_concepts, self.n_concepts), dtype=float)
        
        # Edge weights (default to 1.0, can be learned)
        self.edge_weights = {}
    
    def add_prerequisite(self, prerequisite: str, dependent: str, weight: float = 1.0):
        """
        Add prerequisite edge: prerequisite → dependent
        
        Args:
            prerequisite: Source concept
            dependent: Target concept
            weight: Causal strength (default 1.0)
        """
        pre_idx = self.concept_to_idx[prerequisite]
        dep_idx = self.concept_to_idx[dependent]
        
        self.adjacency[pre_idx][dep_idx] = weight
        self.edge_weights[(prerequisite, dependent)] = weight
    
    def get_edge_weight(self, edge: Tuple[str, str]) -> float:
        """Get weight of edge (source, target)"""
        return self.edge_weights.get(edge, 0.0)
    
    def set_edge_weight(self, source: str, target: str, weight: float):
        """Update edge weight (useful for learned weights)"""
        self.edge_weights[(source, target)] = weight
        src_idx = self.concept_to_idx[source]
        tgt_idx = self.concept_to_idx[target]
        self.adjacency[src_idx][tgt_idx] = weight
    
    def get_prerequisites(self, concept: str) -> List[str]:
        """Get direct prerequisites (parents in graph)"""
        concept_idx = self.concept_to_idx[concept]
        prereq_indices = np.where(self.adjacency[:, concept_idx] > 0)[0]
        return [self.concepts[i] for i in prereq_indices]
    
    def get_dependents(self, concept: str) -> List[str]:
        """Get direct dependents (children in graph)"""
        concept_idx = self.concept_to_idx[concept]
        dep_indices = np.where(self.adjacency[concept_idx, :] > 0)[0]
        return [self.concepts[i] for i in dep_indices]
    
    def get_all_ancestors(self, concept: str) -> Set[str]:
        """Get all upstream concepts (transitive closure of prerequisites)"""
        ancestors = set()
        queue = deque([concept])
        visited = set()
        
        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            
            parents = self.get_prerequisites(current)
            for parent in parents:
                if parent not in ancestors:
                    ancestors.add(parent)
                    queue.append(parent)
        
        return ancestors
    
    def get_all_descendants(self, concept: str) -> Set[str]:
        """Get all downstream concepts (transitive closure of dependents)"""
        descendants = set()
        queue = deque([concept])
        visited = set()
        
        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            
            children = self.get_dependents(current)
            for child in children:
                if child not in descendants:
                    descendants.add(child)
                    queue.append(child)
        
        return descendants
    
    def enumerate_paths(self, source: str, target: str, max_length: Optional[int] = None) -> List[List[str]]:
        """
        Find all directed paths from source to target.
        
        Args:
            source: Starting concept
            target: Ending concept
            max_length: Maximum path length (None = unlimited)
        
        Returns:
            List of paths, where each path is a list of concepts
        """
        paths = []
        
        def dfs(current: str, path: List[str]):
            if current == target:
                paths.append(path.copy())
                return
            
            if max_length and len(path) >= max_length:
                return
            
            for neighbor in self.get_dependents(current):
                if neighbor not in path:  # Prevent cycles
                    path.append(neighbor)
                    dfs(neighbor, path)
                    path.pop()
        
        dfs(source, [source])
        return paths
    
    def compute_path_weight(self, path: List[str]) -> float:
        """
        Compute total weight of a path (product of edge weights).
        
        Represents strength of causal influence through this path.
        """
        weight = 1.0
        for i in range(len(path) - 1):
            edge = (path[i], path[i+1])
            weight *= self.get_edge_weight(edge)
        return weight
    
    def compute_sensitivity(self, source: str, target: str) -> float:
        """
        Compute causal sensitivity: ∂M_target / ∂M_source
        
        Uses chain rule over all paths:
        sensitivity = Σ_{paths p: source⇝target} Π_{edges e ∈ p} w_e
        
        Returns:
            Sensitivity coefficient (can be > 1 if multiple strong paths)
        """
        if source == target:
            return 1.0
        
        paths = self.enumerate_paths(source, target)
        
        total_sensitivity = 0.0
        for path in paths:
            path_sensitivity = self.compute_path_weight(path)
            total_sensitivity += path_sensitivity
        
        return total_sensitivity
    
    def compute_all_sensitivities(self, target: str) -> Dict[str, float]:
        """
        Compute sensitivity of target to ALL upstream concepts.
        
        Returns:
            Dictionary mapping concept → sensitivity coefficient
        """
        sensitivities = {}
        ancestors = self.get_all_ancestors(target)
        
        for concept in ancestors:
            sensitivities[concept] = self.compute_sensitivity(concept, target)
        
        sensitivities[target] = 1.0  # Self-sensitivity
        return sensitivities
    
    def topological_sort(self) -> List[str]:
        """
        Return concepts in topological order (prerequisites before dependents).
        
        Useful for forward propagation through graph.
        """
        in_degree = defaultdict(int)
        for i in range(self.n_concepts):
            for j in range(self.n_concepts):
                if self.adjacency[i][j] > 0:
                    in_degree[self.concepts[j]] += 1
        
        # Start with concepts that have no prerequisites
        queue = deque([c for c in self.concepts if in_degree[c] == 0])
        result = []
        
        while queue:
            current = queue.popleft()
            result.append(current)
            
            for dependent in self.get_dependents(current):
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)
        
        if len(result) != self.n_concepts:
            raise ValueError("Graph contains cycles - cannot perform topological sort")
        
        return result
    
    def identify_bottlenecks(self, student_masteries: Dict[str, float], threshold: float = 0.5) -> List[Tuple[str, float]]:
        """
        Identify bottleneck concepts that are limiting downstream performance.
        
        A concept is a bottleneck if:
        1. Its mastery is below threshold
        2. It has high downstream impact (many dependents with low mastery)
        
        Args:
            student_masteries: Current mastery levels
            threshold: Mastery threshold for "weak" concepts
        
        Returns:
            List of (concept, impact_score) sorted by impact
        """
        bottlenecks = []
        
        for concept in self.concepts:
            mastery = student_masteries.get(concept, 0.0)
            
            if mastery < threshold:
                # Compute downstream impact
                descendants = self.get_all_descendants(concept)
                
                impact = 0.0
                for desc in descendants:
                    sensitivity = self.compute_sensitivity(concept, desc)
                    desc_mastery = student_masteries.get(desc, 0.0)
                    mastery_gap = 1.0 - desc_mastery
                    
                    # Impact = how much this bottleneck affects downstream gaps
                    impact += sensitivity * mastery_gap
                
                if impact > 0:
                    bottlenecks.append((concept, impact))
        
        # Sort by impact (descending)
        bottlenecks.sort(key=lambda x: -x[1])
        return bottlenecks
    
    def to_dict(self) -> Dict:
        """Export graph structure for visualization"""
        edges = []
        for (source, target), weight in self.edge_weights.items():
            edges.append({
                'source': source,
                'target': target,
                'weight': float(weight)
            })
        
        return {
            'nodes': [{'id': c, 'label': c} for c in self.concepts],
            'edges': edges
        }
    
    def __repr__(self):
        return f"CausalGraph({self.n_concepts} concepts, {len(self.edge_weights)} edges)"
