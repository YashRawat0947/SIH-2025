"""
Machine Learning module for KMRL Train Induction Planning System.

This module implements a scikit-learn based ML model to predict train induction decisions
based on various features including fitness scores, maintenance data, and operational metrics.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import logging
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)


class TrainInductionMLModel:
    """ML Model for predicting train induction decisions."""
    
    def __init__(self, model_type: str = 'random_forest'):
        """
        Initialize the ML model.
        
        Args:
            model_type: Type of model to use ('decision_tree' or 'random_forest')
        """
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_columns = []
        self.is_trained = False
        self.model_path = "train_induction_model.joblib"
        
        # Initialize model based on type
        if model_type == 'decision_tree':
            self.model = DecisionTreeClassifier(
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
        else:  # random_forest
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
    
    def prepare_features(self, merged_data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare features for ML model training/prediction.
        
        Args:
            merged_data: DataFrame with merged train data
            
        Returns:
            DataFrame with prepared features
        """
        logger.info("Preparing features for ML model...")
        
        # Copy data to avoid modifying original
        df = merged_data.copy()
        
        # Create target variable for training (if not exists)
        if 'target_induct' not in df.columns:
            # Generate synthetic target based on business rules for training
            df['target_induct'] = self._generate_synthetic_targets(df)
        
        # Feature engineering
        features_df = pd.DataFrame()
        
        # Basic features
        features_df['fitness_score'] = pd.to_numeric(df['fitness_score'], errors='coerce').fillna(50)
        features_df['days_since_maintenance'] = pd.to_numeric(df['days_since_maintenance'], errors='coerce').fillna(30)
        features_df['mileage'] = pd.to_numeric(df['mileage'], errors='coerce').fillna(df['mileage'].mean() if not df['mileage'].empty else 100000)
        features_df['branding_hours'] = pd.to_numeric(df['branding_hours'], errors='coerce').fillna(0)
        
        # Operational features
        features_df['recent_delays'] = pd.to_numeric(df.get('recent_delays', 0), errors='coerce').fillna(0)
        features_df['total_delay_minutes'] = pd.to_numeric(df.get('total_delay_minutes', 0), errors='coerce').fillna(0)
        features_df['open_work_orders'] = pd.to_numeric(df.get('open_work_orders', 0), errors='coerce').fillna(0)
        features_df['door_faults'] = pd.to_numeric(df.get('door_faults', 0), errors='coerce').fillna(0)
        features_df['mechanical_issues'] = pd.to_numeric(df.get('mechanical_issues', 0), errors='coerce').fillna(0)
        
        # Certificate features
        features_df['cert_valid'] = pd.to_numeric(df.get('cert_valid', 1), errors='coerce').fillna(1).astype(int)
        features_df['days_to_cert_expiry'] = pd.to_numeric(df.get('days_to_cert_expiry', 30), errors='coerce').fillna(30)
        
        # Derived features
        features_df['fitness_trend'] = self._calculate_fitness_trend(df)
        features_df['maintenance_urgency'] = self._calculate_maintenance_urgency(df)
        features_df['operational_risk'] = self._calculate_operational_risk(df)
        
        # Depot encoding
        if 'depot' in df.columns:
            features_df['depot_encoded'] = self._encode_categorical(df['depot'], 'depot')
        else:
            features_df['depot_encoded'] = 0
        
        # Time-based features
        features_df['day_of_week'] = datetime.now().weekday()
        features_df['is_weekend'] = 1 if datetime.now().weekday() >= 5 else 0
        
        # Store feature columns for consistency
        self.feature_columns = list(features_df.columns)
        
        logger.info(f"Prepared {len(self.feature_columns)} features for {len(features_df)} trains")
        return features_df
    
    def _generate_synthetic_targets(self, df: pd.DataFrame) -> pd.Series:
        """Generate synthetic target labels for training based on business rules."""
        targets = []
        
        for _, row in df.iterrows():
            # Start with neutral probability
            induct_score = 0.5
            
            # Fitness score impact (most important)
            fitness = row.get('fitness_score', 70)
            if fitness >= 90:
                induct_score += 0.3
            elif fitness >= 80:
                induct_score += 0.1
            elif fitness < 70:
                induct_score -= 0.4
            
            # Open work orders (blocking factor)
            if row.get('open_work_orders', 0) > 0:
                induct_score -= 0.5
            
            # Certificate validity
            if not row.get('cert_valid', True):
                induct_score -= 0.6
            
            # Recent delays
            delays = row.get('recent_delays', 0)
            if delays > 3:
                induct_score -= 0.2
            elif delays == 0:
                induct_score += 0.1
            
            # Maintenance urgency
            days_since = row.get('days_since_maintenance', 15)
            if days_since > 21:
                induct_score -= 0.1
            elif days_since < 7:
                induct_score += 0.1
            
            # Convert to binary decision with some randomness
            final_prob = max(0, min(1, induct_score))
            target = 1 if np.random.random() < final_prob else 0
            targets.append(target)
        
        return pd.Series(targets)
    
    def _calculate_fitness_trend(self, df: pd.DataFrame) -> pd.Series:
        """Calculate fitness trend indicator."""
        # Simplified trend calculation based on days since maintenance
        days_since = df.get('days_since_maintenance', 15)
        fitness = df.get('fitness_score', 70)
        
        # Assume fitness degrades over time
        trend = fitness - (days_since * 0.5)  # 0.5 point decrease per day
        return pd.Series(np.clip(trend, 0, 100))
    
    def _calculate_maintenance_urgency(self, df: pd.DataFrame) -> pd.Series:
        """Calculate maintenance urgency score."""
        urgency_scores = []
        
        for _, row in df.iterrows():
            urgency = 0
            
            # Days since maintenance
            days_since = row.get('days_since_maintenance', 15)
            if days_since > 21:
                urgency += 3
            elif days_since > 14:
                urgency += 2
            elif days_since > 7:
                urgency += 1
            
            # Open work orders
            urgency += row.get('open_work_orders', 0) * 2
            
            # Mechanical issues
            urgency += row.get('mechanical_issues', 0) * 1.5
            
            urgency_scores.append(min(10, urgency))  # Cap at 10
        
        return pd.Series(urgency_scores)
    
    def _calculate_operational_risk(self, df: pd.DataFrame) -> pd.Series:
        """Calculate operational risk score."""
        risk_scores = []
        
        for _, row in df.iterrows():
            risk = 0
            
            # Recent delays
            delays = row.get('recent_delays', 0)
            risk += delays * 0.5
            
            # Door faults
            risk += row.get('door_faults', 0) * 1.0
            
            # Low fitness score
            fitness = row.get('fitness_score', 70)
            if fitness < 70:
                risk += 2
            elif fitness < 80:
                risk += 1
            
            # Certificate issues
            if not row.get('cert_valid', True):
                risk += 3
            
            risk_scores.append(min(10, risk))  # Cap at 10
        
        return pd.Series(risk_scores)
    
    def _encode_categorical(self, series: pd.Series, column_name: str) -> pd.Series:
        """Encode categorical variables."""
        if column_name not in self.label_encoders:
            self.label_encoders[column_name] = LabelEncoder()
            # Fit on unique values including potential unseen values
            unique_values = list(series.unique()) + ['Unknown']
            self.label_encoders[column_name].fit(unique_values)
        
        # Handle unseen values
        series_filled = series.fillna('Unknown')
        encoded = []
        for value in series_filled:
            try:
                encoded.append(self.label_encoders[column_name].transform([value])[0])
            except ValueError:
                # Handle unseen categories
                encoded.append(self.label_encoders[column_name].transform(['Unknown'])[0])
        
        return pd.Series(encoded)
    
    def train_model(self, training_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Train the ML model on provided data.
        
        Args:
            training_data: DataFrame with features and target variable
            
        Returns:
            Dictionary with training results and metrics
        """
        logger.info("Training ML model...")
        
        # Prepare features
        X = self.prepare_features(training_data)
        y = training_data.get('target_induct')
        
        if y is None:
            # Generate synthetic targets if not provided
            y = self._generate_synthetic_targets(training_data)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test_scaled)
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        
        # Cross-validation
        cv_scores = cross_val_score(self.model, X_train_scaled, y_train, cv=5)
        
        # Feature importance
        if hasattr(self.model, 'feature_importances_'):
            feature_importance = dict(zip(self.feature_columns, self.model.feature_importances_))
            feature_importance = dict(sorted(feature_importance.items(), 
                                           key=lambda x: x[1], reverse=True))
        else:
            feature_importance = {}
        
        self.is_trained = True
        
        results = {
            'accuracy': accuracy,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'feature_importance': feature_importance,
            'classification_report': classification_report(y_test, y_pred, output_dict=True),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
            'training_size': len(X_train),
            'test_size': len(X_test)
        }
        
        logger.info(f"Model training completed. Accuracy: {accuracy:.3f}")
        return results
    
    def predict_induction(self, train_data: pd.DataFrame) -> pd.DataFrame:
        """
        Predict induction decisions for trains.
        
        Args:
            train_data: DataFrame with train features
            
        Returns:
            DataFrame with predictions and probabilities
        """
        if not self.is_trained:
            logger.warning("Model not trained. Using default predictions.")
            return self._default_predictions(train_data)
        
        # Prepare features
        X = self.prepare_features(train_data)
        
        # Ensure all feature columns are present
        for col in self.feature_columns:
            if col not in X.columns:
                X[col] = 0
        
        # Reorder columns to match training
        X = X[self.feature_columns]
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Make predictions
        predictions = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)[:, 1]
        
        # Create results DataFrame
        results_df = train_data.copy()
        results_df['ml_prediction'] = predictions
        results_df['ml_probability'] = probabilities
        results_df['ml_confidence'] = np.abs(probabilities - 0.5) * 2  # 0 to 1 scale
        
        logger.info(f"Generated ML predictions for {len(results_df)} trains")
        return results_df
    
    def _default_predictions(self, train_data: pd.DataFrame) -> pd.DataFrame:
        """Generate default predictions when model is not trained."""
        results_df = train_data.copy()
        
        # Simple rule-based predictions
        predictions = []
        probabilities = []
        
        for _, row in train_data.iterrows():
            # Start with base probability
            prob = 0.7
            
            # Adjust based on fitness score
            fitness = row.get('fitness_score', 70)
            if fitness >= 85:
                prob = 0.9
            elif fitness >= 75:
                prob = 0.8
            elif fitness < 65:
                prob = 0.3
            
            # Adjust for open work orders
            if row.get('open_work_orders', 0) > 0:
                prob = 0.1
            
            # Adjust for certificate validity
            if not row.get('cert_valid', True):
                prob = 0.1
            
            probabilities.append(prob)
            predictions.append(1 if prob > 0.5 else 0)
        
        results_df['ml_prediction'] = predictions
        results_df['ml_probability'] = probabilities
        results_df['ml_confidence'] = [abs(p - 0.5) * 2 for p in probabilities]
        
        return results_df
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from trained model."""
        if not self.is_trained or not hasattr(self.model, 'feature_importances_'):
            return {}
        
        return dict(zip(self.feature_columns, self.model.feature_importances_))
    
    def save_model(self, filepath: Optional[str] = None) -> str:
        """
        Save trained model to disk.
        
        Args:
            filepath: Path to save model (optional)
            
        Returns:
            Path where model was saved
        """
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")
        
        if filepath is None:
            filepath = self.model_path
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'feature_columns': self.feature_columns,
            'model_type': self.model_type,
            'trained_at': datetime.now().isoformat()
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
        return filepath
    
    def load_model(self, filepath: Optional[str] = None) -> bool:
        """
        Load trained model from disk.
        
        Args:
            filepath: Path to load model from (optional)
            
        Returns:
            True if successful, False otherwise
        """
        if filepath is None:
            filepath = self.model_path
        
        if not os.path.exists(filepath):
            logger.warning(f"Model file {filepath} not found")
            return False
        
        try:
            model_data = joblib.load(filepath)
            
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.label_encoders = model_data['label_encoders']
            self.feature_columns = model_data['feature_columns']
            self.model_type = model_data.get('model_type', 'random_forest')
            self.is_trained = True
            
            logger.info(f"Model loaded from {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False


def prepare_training_data(odoo_data: Dict[str, pd.DataFrame], 
                         mock_data: Dict[str, Any]) -> pd.DataFrame:
    """
    Prepare comprehensive training data by merging Odoo and mock data.
    
    Args:
        odoo_data: Data from Odoo system
        mock_data: Mock IoT and UNS data
        
    Returns:
        Merged DataFrame ready for ML training
    """
    logger.info("Preparing training data...")
    
    # Start with train data from Odoo
    trains_df = odoo_data['trains'].copy()
    
    if trains_df.empty:
        logger.warning("No train data available")
        return pd.DataFrame()
    
    # Add IoT fitness data
    if 'iot_fitness' in mock_data:
        fitness_data = []
        for train_id, fitness_info in mock_data['iot_fitness'].items():
            fitness_data.append({
                'train_id': train_id,
                'fitness_score': fitness_info['fitness_score'],
                'engine_score': fitness_info['engine_score'],
                'brake_score': fitness_info['brake_score'],
                'electrical_score': fitness_info['electrical_score'],
                'sensor_status': fitness_info['sensor_status']
            })
        
        fitness_df = pd.DataFrame(fitness_data)
        trains_df = trains_df.merge(fitness_df, on='train_id', how='left')
    
    # Add fitness certificate data
    if 'fitness_certificates' in mock_data:
        cert_data = []
        for train_id, cert_info in mock_data['fitness_certificates'].items():
            cert_data.append({
                'train_id': train_id,
                'cert_valid': cert_info['is_valid'],
                'days_to_cert_expiry': cert_info['days_to_expiry']
            })
        
        cert_df = pd.DataFrame(cert_data)
        trains_df = trains_df.merge(cert_df, on='train_id', how='left')
    
    # Add UNS delay data
    if 'uns_delays' in mock_data:
        delay_data = []
        for train_id, delays in mock_data['uns_delays'].items():
            recent_delays = len(delays)
            total_delay_minutes = sum([d['delay_minutes'] for d in delays])
            delay_data.append({
                'train_id': train_id,
                'recent_delays': recent_delays,
                'total_delay_minutes': total_delay_minutes
            })
        
        delay_df = pd.DataFrame(delay_data)
        trains_df = trains_df.merge(delay_df, on='train_id', how='left')
    
    # Add operational metrics
    if 'operational_metrics' in mock_data:
        ops_data = []
        for train_id, metrics in mock_data['operational_metrics'].items():
            recent_issues = metrics.get('recent_issues', {})
            ops_data.append({
                'train_id': train_id,
                'door_faults': recent_issues.get('door_faults', 0),
                'mechanical_issues': recent_issues.get('mechanical_issues', 0),
                'on_time_performance': metrics.get('performance', {}).get('on_time_performance', 90),
                'service_reliability': metrics.get('performance', {}).get('service_reliability', 95)
            })
        
        if ops_data:  # Only merge if we have data
            ops_df = pd.DataFrame(ops_data)
            trains_df = trains_df.merge(ops_df, on='train_id', how='left')
    
    # Add maintenance request counts
    maintenance_df = odoo_data.get('maintenance_requests', pd.DataFrame())
    if not maintenance_df.empty:
        maintenance_counts = maintenance_df.groupby('equipment_id').size().reset_index(name='open_work_orders')
        # Map equipment_id to train_id (simplified mapping)
        maintenance_counts['train_id'] = maintenance_counts['equipment_id'].apply(lambda x: f"KMRL-{x:03d}")
        trains_df = trains_df.merge(maintenance_counts[['train_id', 'open_work_orders']], 
                                   on='train_id', how='left')
    
    # Fill missing values with safe defaults
    numeric_columns = ['open_work_orders', 'recent_delays', 'fitness_score', 'door_faults', 'mechanical_issues']
    for col in numeric_columns:
        if col in trains_df.columns:
            trains_df[col] = pd.to_numeric(trains_df[col], errors='coerce').fillna(0)
        else:
            trains_df[col] = 0
    
    logger.info(f"Prepared training data with {len(trains_df)} trains and {len(trains_df.columns)} features")
    return trains_df


if __name__ == "__main__":
    # Test the ML model
    from odoo_utils import get_odoo_data
    from mocks import generate_all_mock_data
    
    print("Testing ML model...")
    
    # Generate test data
    odoo_data = get_odoo_data(use_mock=True)
    mock_data = generate_all_mock_data(25)
    
    # Prepare training data
    training_data = prepare_training_data(odoo_data, mock_data)
    print(f"Training data shape: {training_data.shape}")
    
    # Initialize and train model
    ml_model = TrainInductionMLModel('random_forest')
    results = ml_model.train_model(training_data)
    
    print(f"Model accuracy: {results['accuracy']:.3f}")
    print(f"Cross-validation score: {results['cv_mean']:.3f} ± {results['cv_std']:.3f}")
    
    # Make predictions
    predictions = ml_model.predict_induction(training_data)
    print(f"Generated predictions for {len(predictions)} trains")
    
    # Show sample predictions
    print("\nSample predictions:")
    sample_cols = ['train_id', 'fitness_score', 'open_work_orders', 'ml_prediction', 'ml_probability']
    print(predictions[sample_cols].head(10))
    
    # Save model
    model_path = ml_model.save_model()
    print(f"Model saved to {model_path}")