"""
Optimization module for KMRL Train Induction Planning System using PuLP.

This module implements multi-objective optimization to:
1. Minimize train shunting costs and operational complexity
2. Balance mileage across the fleet
3. Maximize service availability while considering constraints
4. Optimize depot utilization and stabling geometry
"""

import pulp
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class TrainInductionOptimizer:
    """Optimization engine for train induction planning using linear programming."""
    
    def __init__(self):
        """Initialize the optimizer with default parameters."""
        self.optimization_weights = {
            'shunting_cost': 0.3,      # Minimize movement costs
            'mileage_balance': 0.25,   # Balance fleet mileage
            'service_priority': 0.3,   # Maximize high-priority trains
            'depot_efficiency': 0.15   # Optimize depot utilization
        }
        
        # Cost matrices (would be configured based on actual depot layout)
        self.shunting_costs = self._initialize_shunting_costs()
        self.depot_capacities = {
            'Aluva': 12,
            'Palarivattom': 8,
            'Kalamassery': 5
        }
        
    def _initialize_shunting_costs(self) -> Dict[str, Dict[str, float]]:
        """Initialize shunting cost matrix between depot positions."""
        # Simplified cost matrix (in practice, this would be based on actual track layout)
        positions = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'C1', 'C2']
        costs = {}
        
        for i, pos1 in enumerate(positions):
            costs[pos1] = {}
            for j, pos2 in enumerate(positions):
                if i == j:
                    costs[pos1][pos2] = 0  # No cost to stay in same position
                else:
                    # Cost increases with distance between positions
                    costs[pos1][pos2] = abs(i - j) * 10  # Base cost per position
        
        return costs
    
    def optimize_induction_list(self, 
                               train_data: pd.DataFrame,
                               ml_predictions: pd.DataFrame,
                               target_inductions: int = 25) -> Dict[str, Any]:
        """
        Optimize train induction decisions using linear programming.
        
        Args:
            train_data: DataFrame with train information
            ml_predictions: DataFrame with ML model predictions
            target_inductions: Target number of trains to induct
            
        Returns:
            Dictionary with optimization results
        """
        logger.info(f"Starting optimization for {len(train_data)} trains, target: {target_inductions}")
        
        # Merge data
        merged_df = train_data.merge(ml_predictions[['train_id', 'ml_prediction', 'ml_probability']], 
                                   on='train_id', how='left')
        
        # Create optimization problem
        prob = pulp.LpProblem("Train_Induction_Optimization", pulp.LpMaximize)
        
        # Decision variables: binary variable for each train (1 = induct, 0 = hold)
        train_vars = {}
        for _, row in merged_df.iterrows():
            train_id = row['train_id']
            train_vars[train_id] = pulp.LpVariable(f"induct_{train_id}", cat='Binary')
        
        # Objective function components
        service_priority = self._calculate_service_priority_score(merged_df, train_vars)
        mileage_balance = self._calculate_mileage_balance_score(merged_df, train_vars)
        shunting_cost = self._calculate_shunting_cost_score(merged_df, train_vars)
        depot_efficiency = self._calculate_depot_efficiency_score(merged_df, train_vars)
        
        # Combined objective function
        prob += (
            self.optimization_weights['service_priority'] * service_priority +
            self.optimization_weights['mileage_balance'] * mileage_balance -
            self.optimization_weights['shunting_cost'] * shunting_cost +
            self.optimization_weights['depot_efficiency'] * depot_efficiency
        )
        
        # Constraints
        self._add_constraints(prob, merged_df, train_vars, target_inductions)
        
        # Solve the problem
        prob.solve(pulp.PULP_CBC_CMD(msg=0))
        
        # Extract results
        optimization_results = self._extract_optimization_results(prob, merged_df, train_vars)
        
        logger.info(f"Optimization completed. Status: {pulp.LpStatus[prob.status]}")
        return optimization_results
    
    def _calculate_service_priority_score(self, df: pd.DataFrame, train_vars: Dict) -> pulp.LpAffineExpression:
        """Calculate service priority score for objective function."""
        priority_expr = 0
        
        for _, row in df.iterrows():
            train_id = row['train_id']
            
            # Base score from ML model probability
            ml_score = row.get('ml_probability', 0.5) * 100
            
            # Fitness score contribution
            fitness_score = row.get('fitness_score', 70)
            
            # Branding priority (trains with less branding hours get priority)
            branding_hours = row.get('branding_hours', 50)
            branding_score = max(0, 100 - branding_hours)  # Inverse relationship
            
            # On-time performance bonus
            otp_score = row.get('on_time_performance', 90)
            
            # Combined priority score
            total_priority = (
                ml_score * 0.4 +
                fitness_score * 0.3 +
                branding_score * 0.2 +
                otp_score * 0.1
            )
            
            priority_expr += total_priority * train_vars[train_id]
        
        return priority_expr
    
    def _calculate_mileage_balance_score(self, df: pd.DataFrame, train_vars: Dict) -> pulp.LpAffineExpression:
        """Calculate mileage balance score to promote fleet mileage balancing."""
        mileage_expr = 0
        
        # Calculate fleet average mileage
        avg_mileage = df['mileage'].mean()
        
        for _, row in df.iterrows():
            train_id = row['train_id']
            train_mileage = row.get('mileage', avg_mileage)
            
            # Trains with lower mileage get higher scores (to balance the fleet)
            mileage_balance_score = max(0, avg_mileage - train_mileage) / 1000  # Normalize
            
            mileage_expr += mileage_balance_score * train_vars[train_id]
        
        return mileage_expr
    
    def _calculate_shunting_cost_score(self, df: pd.DataFrame, train_vars: Dict) -> pulp.LpAffineExpression:
        """Calculate shunting cost score (to be minimized)."""
        shunting_expr = 0
        
        # Group trains by depot
        depot_groups = df.groupby('depot')
        
        for depot, depot_trains in depot_groups:
            depot_trains_list = depot_trains['train_id'].tolist()
            
            # Simplified shunting cost: cost increases with number of movements needed
            # In reality, this would consider actual track positions and movements
            for i, train_id in enumerate(depot_trains_list):
                # Cost increases with position (trains deeper in depot cost more to move)
                position_cost = i * 5  # Base cost per position
                shunting_expr += position_cost * train_vars[train_id]
        
        return shunting_expr
    
    def _calculate_depot_efficiency_score(self, df: pd.DataFrame, train_vars: Dict) -> pulp.LpAffineExpression:
        """Calculate depot efficiency score to optimize depot utilization."""
        efficiency_expr = 0
        
        depot_groups = df.groupby('depot')
        
        for depot, depot_trains in depot_groups:
            depot_capacity = self.depot_capacities.get(depot, 10)
            depot_trains_list = depot_trains['train_id'].tolist()
            
            # Efficiency bonus for utilizing depot capacity optimally
            # Target utilization is around 80% of capacity
            target_trains = int(depot_capacity * 0.8)
            
            for train_id in depot_trains_list:
                # Bonus decreases as we approach or exceed target
                depot_efficiency_bonus = max(0, target_trains - len([t for t in depot_trains_list 
                                                                   if t <= train_id])) * 2
                efficiency_expr += depot_efficiency_bonus * train_vars[train_id]
        
        return efficiency_expr
    
    def _add_constraints(self, prob: pulp.LpProblem, df: pd.DataFrame, 
                        train_vars: Dict, target_inductions: int):
        """Add constraints to the optimization problem."""
        
        # 1. Target number of inductions constraint (soft constraint with tolerance)
        total_inductions = pulp.lpSum([train_vars[train_id] for train_id in train_vars])
        prob += total_inductions >= max(1, target_inductions - 10)  # Allow more flexibility
        prob += total_inductions <= target_inductions + 10  # Allow more flexibility
        
        # 2. Hard exclusion constraints (trains that cannot be inducted)
        excluded_count = 0
        for _, row in df.iterrows():
            train_id = row['train_id']
            
            # Exclude trains with open work orders
            if row.get('open_work_orders', 0) > 0:
                prob += train_vars[train_id] == 0
                excluded_count += 1
            
            # Exclude trains with invalid fitness certificates
            elif not row.get('cert_valid', True):
                prob += train_vars[train_id] == 0
                excluded_count += 1
            
            # Exclude trains with very low fitness score
            elif row.get('fitness_score', 100) < 60:  # Lowered threshold
                prob += train_vars[train_id] == 0
                excluded_count += 1
        
        # Adjust target if too many trains are excluded
        available_trains = len(df) - excluded_count
        if available_trains < target_inductions:
            logger.warning(f"Only {available_trains} trains available, target {target_inductions} may not be feasible")
        
        # 3. Depot capacity constraints
        depot_groups = df.groupby('depot')
        for depot, depot_trains in depot_groups:
            depot_capacity = self.depot_capacities.get(depot, 10)
            depot_train_vars = [train_vars[train_id] for train_id in depot_trains['train_id']]
            
            # Don't induct more trains than depot can handle efficiently
            prob += pulp.lpSum(depot_train_vars) <= depot_capacity
        
        # 4. Mileage balancing constraints
        # Ensure high-mileage trains are not over-selected
        high_mileage_trains = df[df['mileage'] > df['mileage'].quantile(0.8)]['train_id']
        high_mileage_vars = [train_vars[train_id] for train_id in high_mileage_trains if train_id in train_vars]
        
        if high_mileage_vars:
            # Limit high-mileage trains to maximum 40% of total inductions
            prob += pulp.lpSum(high_mileage_vars) <= int(target_inductions * 0.4)
        
        # 5. Service reliability constraints
        # Prioritize trains with good on-time performance
        good_otp_trains = df[df.get('on_time_performance', 90) >= 90]['train_id']
        good_otp_vars = [train_vars[train_id] for train_id in good_otp_trains if train_id in train_vars]
        
        if good_otp_vars and len(good_otp_vars) >= target_inductions * 0.6:
            # Ensure at least 60% of inducted trains have good OTP
            prob += pulp.lpSum(good_otp_vars) >= int(target_inductions * 0.6)
    
    def _extract_optimization_results(self, prob: pulp.LpProblem, df: pd.DataFrame, 
                                    train_vars: Dict) -> Dict[str, Any]:
        """Extract and format optimization results."""
        
        results = {
            'status': pulp.LpStatus[prob.status],
            'objective_value': pulp.value(prob.objective) if prob.status == pulp.LpStatusOptimal else None,
            'induction_decisions': {},
            'summary': {},
            'constraints_satisfied': prob.status == pulp.LpStatusOptimal,
            'decision_reasoning': {}  # Initialize decision_reasoning
        }
        
        if prob.status != pulp.LpStatusOptimal:
            logger.warning(f"Optimization did not find optimal solution. Status: {results['status']}")
            # Still provide fallback decisions based on ML predictions
            for _, row in merged_df.iterrows():
                train_id = row['train_id']
                ml_decision = int(row.get('ml_prediction', 0))
                results['induction_decisions'][train_id] = ml_decision
            
            # Generate reasoning and summary for fallback
            results['decision_reasoning'] = self._generate_decision_reasoning(merged_df, results['induction_decisions'])
            results['summary'] = self._generate_fallback_summary(merged_df, results['induction_decisions'])
            return results
        
        # Extract induction decisions
        inducted_trains = []
        held_trains = []
        
        for train_id, var in train_vars.items():
            decision = int(pulp.value(var))
            results['induction_decisions'][train_id] = decision
            
            if decision == 1:
                inducted_trains.append(train_id)
            else:
                held_trains.append(train_id)
        
        # Calculate summary statistics
        inducted_df = df[df['train_id'].isin(inducted_trains)]
        held_df = df[df['train_id'].isin(held_trains)]
        
        results['summary'] = {
            'total_trains': len(df),
            'trains_inducted': len(inducted_trains),
            'trains_held': len(held_trains),
            'inducted_trains': inducted_trains,
            'held_trains': held_trains,
            'avg_fitness_inducted': inducted_df['fitness_score'].mean() if not inducted_df.empty else 0,
            'avg_fitness_held': held_df['fitness_score'].mean() if not held_df.empty else 0,
            'avg_mileage_inducted': inducted_df['mileage'].mean() if not inducted_df.empty else 0,
            'avg_mileage_held': held_df['mileage'].mean() if not held_df.empty else 0,
            'depot_distribution': inducted_df['depot'].value_counts().to_dict() if not inducted_df.empty else {}
        }
        
        # Add reasoning for decisions
        results['decision_reasoning'] = self._generate_decision_reasoning(df, results['induction_decisions'])
        
        return results
    
    def _generate_decision_reasoning(self, df: pd.DataFrame, decisions: Dict[str, int]) -> Dict[str, str]:
        """Generate human-readable reasoning for each decision."""
        reasoning = {}
        
        for _, row in df.iterrows():
            train_id = row['train_id']
            decision = decisions.get(train_id, 0)
            reasons = []
            
            if decision == 1:  # Inducted
                # Positive factors
                if row.get('fitness_score', 0) >= 85:
                    reasons.append(f"High fitness score ({row.get('fitness_score', 0):.1f})")
                if row.get('open_work_orders', 0) == 0:
                    reasons.append("No open work orders")
                if row.get('cert_valid', False):
                    reasons.append("Valid fitness certificate")
                if row.get('recent_delays', 0) == 0:
                    reasons.append("No recent service delays")
                if row.get('ml_probability', 0) > 0.7:
                    reasons.append(f"ML model recommends induction ({row.get('ml_probability', 0):.2f} confidence)")
                
                reasoning[train_id] = f"Inducted: {', '.join(reasons) if reasons else 'Optimization decision'}"
                
            else:  # Held
                # Negative factors
                if row.get('open_work_orders', 0) > 0:
                    reasons.append(f"Open work orders ({row.get('open_work_orders', 0)})")
                if not row.get('cert_valid', True):
                    reasons.append("Invalid/expired fitness certificate")
                if row.get('fitness_score', 100) < 70:
                    reasons.append(f"Low fitness score ({row.get('fitness_score', 100):.1f})")
                if row.get('recent_delays', 0) > 2:
                    reasons.append(f"Multiple recent delays ({row.get('recent_delays', 0)})")
                if row.get('mechanical_issues', 0) > 0:
                    reasons.append(f"Mechanical issues ({row.get('mechanical_issues', 0)})")
                if row.get('ml_probability', 1) < 0.3:
                    reasons.append(f"ML model recommends holding ({row.get('ml_probability', 1):.2f} confidence)")
                
                reasoning[train_id] = f"Held: {', '.join(reasons) if reasons else 'Optimization decision'}"
        
        return reasoning
    
    def _generate_fallback_summary(self, df: pd.DataFrame, decisions: Dict[str, int]) -> Dict[str, Any]:
        """Generate summary for fallback decisions."""
        inducted_trains = [tid for tid, decision in decisions.items() if decision == 1]
        held_trains = [tid for tid, decision in decisions.items() if decision == 0]
        
        inducted_df = df[df['train_id'].isin(inducted_trains)] if inducted_trains else pd.DataFrame()
        held_df = df[df['train_id'].isin(held_trains)] if held_trains else pd.DataFrame()
        
        return {
            'total_trains': len(df),
            'trains_inducted': len(inducted_trains),
            'trains_held': len(held_trains),
            'inducted_trains': inducted_trains,
            'held_trains': held_trains,
            'avg_fitness_inducted': inducted_df['fitness_score'].mean() if not inducted_df.empty else 0,
            'avg_fitness_held': held_df['fitness_score'].mean() if not held_df.empty else 0,
            'avg_mileage_inducted': inducted_df['mileage'].mean() if not inducted_df.empty else 0,
            'avg_mileage_held': held_df['mileage'].mean() if not held_df.empty else 0,
            'depot_distribution': inducted_df['depot'].value_counts().to_dict() if not inducted_df.empty else {}
        }
    
    def apply_manual_overrides(self, optimization_results: Dict[str, Any], 
                             manual_overrides: Dict[str, int]) -> Dict[str, Any]:
        """
        Apply manual overrides to optimization results.
        
        Args:
            optimization_results: Results from optimization
            manual_overrides: Dict of train_id -> decision (1=induct, 0=hold)
            
        Returns:
            Updated results with manual overrides applied
        """
        if not manual_overrides:
            return optimization_results
        
        logger.info(f"Applying {len(manual_overrides)} manual overrides")
        
        updated_results = optimization_results.copy()
        override_reasoning = {}
        
        for train_id, override_decision in manual_overrides.items():
            if train_id in updated_results['induction_decisions']:
                original_decision = updated_results['induction_decisions'][train_id]
                updated_results['induction_decisions'][train_id] = override_decision
                
                if override_decision != original_decision:
                    action = "Inducted" if override_decision == 1 else "Held"
                    override_reasoning[train_id] = f"{action}: Manual override by operator"
                    logger.info(f"Override applied for {train_id}: {original_decision} -> {override_decision}")
        
        # Update decision reasoning
        updated_results['decision_reasoning'].update(override_reasoning)
        
        # Recalculate summary with overrides
        inducted_trains = [tid for tid, decision in updated_results['induction_decisions'].items() if decision == 1]
        held_trains = [tid for tid, decision in updated_results['induction_decisions'].items() if decision == 0]
        
        updated_results['summary']['trains_inducted'] = len(inducted_trains)
        updated_results['summary']['trains_held'] = len(held_trains)
        updated_results['summary']['inducted_trains'] = inducted_trains
        updated_results['summary']['held_trains'] = held_trains
        updated_results['summary']['manual_overrides_applied'] = len(manual_overrides)
        
        return updated_results


def create_induction_ranking(optimization_results: Dict[str, Any], 
                           train_data: pd.DataFrame) -> pd.DataFrame:
    """
    Create a ranked list of trains for induction based on optimization results.
    
    Args:
        optimization_results: Results from optimization
        train_data: Original train data
        
    Returns:
        DataFrame with ranked induction list
    """
    decisions = optimization_results['induction_decisions']
    reasoning = optimization_results['decision_reasoning']
    
    ranking_data = []
    
    for _, row in train_data.iterrows():
        train_id = row['train_id']
        decision = decisions.get(train_id, 0)
        reason = reasoning.get(train_id, "No reasoning available")
        
        ranking_data.append({
            'train_id': train_id,
            'final_decision': 'Induct' if decision == 1 else 'Hold',
            'fitness_score': row.get('fitness_score', 0),
            'depot': row.get('depot', 'Unknown'),
            'mileage': row.get('mileage', 0),
            'open_work_orders': row.get('open_work_orders', 0),
            'recent_delays': row.get('recent_delays', 0),
            'cert_valid': row.get('cert_valid', True),
            'reasoning': reason,
            'priority_rank': len(ranking_data) + 1
        })
    
    ranking_df = pd.DataFrame(ranking_data)
    
    # Sort by decision (inducted first) and then by fitness score
    ranking_df = ranking_df.sort_values(['final_decision', 'fitness_score'], 
                                       ascending=[False, False])
    
    # Update priority ranks
    ranking_df['priority_rank'] = range(1, len(ranking_df) + 1)
    
    return ranking_df


if __name__ == "__main__":
    # Test the optimization module
    from odoo_utils import get_odoo_data
    from mocks import generate_all_mock_data
    from ml_model import TrainInductionMLModel, prepare_training_data
    
    print("Testing optimization module...")
    
    # Generate test data
    odoo_data = get_odoo_data(use_mock=True)
    mock_data = generate_all_mock_data(25)
    
    # Prepare ML data and predictions
    training_data = prepare_training_data(odoo_data, mock_data)
    ml_model = TrainInductionMLModel()
    ml_model.train_model(training_data)
    predictions = ml_model.predict_induction(training_data)
    
    # Run optimization
    optimizer = TrainInductionOptimizer()
    results = optimizer.optimize_induction_list(training_data, predictions, target_inductions=20)
    
    print(f"Optimization status: {results['status']}")
    print(f"Objective value: {results.get('objective_value', 'N/A')}")
    print(f"Trains inducted: {results['summary']['trains_inducted']}")
    print(f"Trains held: {results['summary']['trains_held']}")
    
    # Create ranking
    ranking = create_induction_ranking(results, training_data)
    print("\nTop 10 trains in ranking:")
    print(ranking[['train_id', 'final_decision', 'fitness_score', 'reasoning']].head(10))
    
    # Test manual overrides
    manual_overrides = {'KMRL-001': 0, 'KMRL-025': 1}  # Example overrides
    updated_results = optimizer.apply_manual_overrides(results, manual_overrides)
    print(f"\nAfter manual overrides - Trains inducted: {updated_results['summary']['trains_inducted']}")