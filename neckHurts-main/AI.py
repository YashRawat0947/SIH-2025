import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import pickle
import os
import logging
from dataclasses import dataclass
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class OptimizationResult:
    ranked_trains: List[Dict]
    alerts: List[Dict]
    metrics: Dict[str, Any]
    model_info: Dict[str, Any]

class TrainInductionOptimizer:
    def __init__(self, model_dir='models'):
        self.model_dir = model_dir
        self.model_path = os.path.join(model_dir, 'train_optimizer_model.pkl')
        self.scaler_path = os.path.join(model_dir, 'feature_scaler.pkl')
        
        # Create models directory if it doesn't exist
        os.makedirs(model_dir, exist_ok=True)
        
        self.model = None
        self.scaler = None
        
        # Feature columns for ML model
        self.feature_columns = [
            'maintenance_urgency_score',
            'fitness_validity_score', 
            'mileage_balance_score',
            'cleaning_status_score',
            'branding_priority_score',
            'performance_score',
            'reliability_score',
            'fuel_efficiency_score',
            'availability_score',
            'days_until_fitness_expiry',
            'days_since_last_maintenance',
            'current_mileage_normalized'
        ]

    def load_model(self):
        """Load pre-trained model and scaler"""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                with open(self.scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                logger.info("Model and scaler loaded successfully")
                return True
            else:
                logger.info("Model files not found")
                return False
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False

    def save_model(self):
        """Save trained model and scaler"""
        try:
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.model, f)
            with open(self.scaler_path, 'wb') as f:
                pickle.dump(self.scaler, f)
            logger.info("Model and scaler saved successfully")
        except Exception as e:
            logger.error(f"Error saving model: {e}")

    def extract_features(self, trains: List[Dict]) -> pd.DataFrame:
        """Extract features from MongoDB train data for ML model"""
        features = []
        
        for train in trains:
            try:
                feature_row = {}
                
                # Maintenance urgency score
                maintenance_urgency = train.get('maintenanceUrgency', 1)
                feature_row['maintenance_urgency_score'] = min(maintenance_urgency, 5)
                
                # Fitness validity score
                fitness_status = train.get('fitnessStatus', {})
                if fitness_status.get('isValid'):
                    expiry_date = fitness_status.get('expiryDate')
                    if expiry_date:
                        if isinstance(expiry_date, str):
                            expiry_date = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
                        elif isinstance(expiry_date, dict) and '$date' in expiry_date:
                            expiry_date = datetime.fromisoformat(expiry_date['$date'].replace('Z', '+00:00'))
                        
                        days_until_expiry = (expiry_date - datetime.now()).days
                        feature_row['days_until_fitness_expiry'] = max(0, days_until_expiry)
                        feature_row['fitness_validity_score'] = min(10, max(0, days_until_expiry / 30))
                    else:
                        feature_row['days_until_fitness_expiry'] = 365  # Assume long validity
                        feature_row['fitness_validity_score'] = 10
                else:
                    feature_row['days_until_fitness_expiry'] = -1  # Invalid
                    feature_row['fitness_validity_score'] = 0
                
                # Mileage balance score
                current_mileage = train.get('currentMileage', 0)
                total_mileage = train.get('totalMileage', current_mileage)
                
                feature_row['current_mileage_normalized'] = current_mileage / 1000000 if current_mileage else 0
                
                # Calculate mileage balance relative to fleet average (simplified)
                feature_row['mileage_balance_score'] = 5  # Will be adjusted based on fleet stats
                
                # Cleaning status score
                cleaning_status = train.get('cleaningStatus', 'UNKNOWN')
                cleaning_scores = {
                    'CLEAN': 10,
                    'LIGHT_CLEAN': 7,
                    'DEEP_CLEAN': 8,
                    'DIRTY': 3,
                    'UNKNOWN': 5
                }
                feature_row['cleaning_status_score'] = cleaning_scores.get(cleaning_status, 5)
                
                # Branding priority score
                branding = train.get('branding', {})
                if branding.get('hasBranding'):
                    feature_row['branding_priority_score'] = branding.get('brandingPriority', 1)
                else:
                    feature_row['branding_priority_score'] = 0
                
                # Performance metrics
                feature_row['performance_score'] = train.get('performanceScore', 50) / 10
                feature_row['reliability_score'] = train.get('reliabilityScore', 50) / 10
                feature_row['fuel_efficiency_score'] = train.get('fuelEfficiency', 50) / 10
                
                # Availability score
                is_available = train.get('isAvailableForService', True)
                maintenance_status = train.get('maintenanceStatus', 'UNKNOWN')
                
                if is_available and maintenance_status == 'OPERATIONAL':
                    feature_row['availability_score'] = 10
                elif maintenance_status == 'MAINTENANCE':
                    feature_row['availability_score'] = 2
                elif maintenance_status == 'OUT_OF_SERVICE':
                    feature_row['availability_score'] = 0
                else:
                    feature_row['availability_score'] = 5
                
                # Days since last maintenance
                last_maintenance = train.get('lastMaintenanceDate')
                if last_maintenance:
                    if isinstance(last_maintenance, str):
                        last_maintenance = datetime.fromisoformat(last_maintenance.replace('Z', '+00:00'))
                    elif isinstance(last_maintenance, dict) and '$date' in last_maintenance:
                        last_maintenance = datetime.fromisoformat(last_maintenance['$date'].replace('Z', '+00:00'))
                    
                    feature_row['days_since_last_maintenance'] = (datetime.now() - last_maintenance).days
                else:
                    feature_row['days_since_last_maintenance'] = 365  # Assume long time
                
                # Add train identifier for later reference
                feature_row['_train_id'] = str(train.get('_id', train.get('trainsetId', '')))
                feature_row['trainsetId'] = train.get('trainsetId', '')
                
                features.append(feature_row)
                
            except Exception as e:
                logger.error(f"Error extracting features for train {train.get('trainsetId', 'unknown')}: {e}")
                continue
        
        df = pd.DataFrame(features)
        
        # Calculate mileage balance relative to fleet
        if len(df) > 1 and 'current_mileage_normalized' in df.columns:
            mean_mileage = df['current_mileage_normalized'].mean()
            std_mileage = df['current_mileage_normalized'].std()
            
            if std_mileage > 0:
                df['mileage_balance_score'] = 10 - np.abs(df['current_mileage_normalized'] - mean_mileage) / std_mileage * 2
                df['mileage_balance_score'] = df['mileage_balance_score'].clip(0, 10)
            else:
                df['mileage_balance_score'] = 5
        
        return df

    def optimize_induction_plan(self, trains: List[Dict], constraints: Dict = None) -> OptimizationResult:
        """Main optimization function"""
        start_time = datetime.now()
        
        try:
            if not trains:
                raise ValueError("No trains provided for optimization")
            
            logger.info(f"Starting optimization for {len(trains)} trains")
            
            # Extract features
            features_df = self.extract_features(trains)
            
            if features_df.empty:
                raise ValueError("No valid features could be extracted from train data")
            
            # Filter service-ready trains based on constraints
            service_ready_df = self.filter_service_ready_trains(features_df, constraints)
            
            if service_ready_df.empty:
                logger.warning("No service-ready trains found")
                return OptimizationResult(
                    ranked_trains=[],
                    alerts=[{"type": "CRITICAL", "message": "No trains available for service", "severity": 5}],
                    metrics={"totalTrainsEvaluated": len(trains), "constraintsSatisfied": 0, "processingTimeMs": 0},
                    model_info={"version": "1.0", "algorithm": "No viable trains"}
                )
            
            # Generate rankings
            if self.model is not None and self.scaler is not None:
                ranked_trains = self.ml_ranking(service_ready_df)
                algorithm_used = "Random Forest ML Model"
            else:
                ranked_trains = self.rule_based_ranking(service_ready_df)
                algorithm_used = "Rule-Based Weighted Scoring"
            
            # Generate alerts
            alerts = self.generate_alerts(trains)
            
            # Calculate metrics
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            metrics = {
                "totalTrainsEvaluated": len(trains),
                "constraintsSatisfied": len(ranked_trains),
                "averageConfidence": sum(train.get('confidenceScore', 0) for train in ranked_trains) / max(len(ranked_trains), 1),
                "processingTimeMs": processing_time,
                "serviceReadyTrains": len(service_ready_df),
                "totalAlerts": len(alerts),
                "criticalAlerts": len([a for a in alerts if a.get('severity', 0) >= 4])
            }
            
            model_info = {
                "version": "1.0-python-mongodb",
                "algorithm": algorithm_used,
                "featuresUsed": len(self.feature_columns),
                "modelTrained": self.model is not None
            }
            
            logger.info(f"Optimization completed in {processing_time}ms with {len(ranked_trains)} ranked trains")
            
            return OptimizationResult(
                ranked_trains=ranked_trains,
                alerts=alerts,
                metrics=metrics,
                model_info=model_info
            )
            
        except Exception as e:
            logger.error(f"Optimization failed: {e}")
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return OptimizationResult(
                ranked_trains=[],
                alerts=[{"type": "CRITICAL", "message": f"Optimization failed: {str(e)}", "severity": 5}],
                metrics={"totalTrainsEvaluated": len(trains), "constraintsSatisfied": 0, "processingTimeMs": processing_time},
                model_info={"version": "1.0", "algorithm": "Error", "error": str(e)}
            )

    def filter_service_ready_trains(self, features_df: pd.DataFrame, constraints: Dict = None) -> pd.DataFrame:
        """Filter trains that are ready for service based on constraints"""
        
        if constraints is None:
            constraints = {}
        
        # Default constraints
        min_fitness_validity = constraints.get('minFitnessValidity', 0)
        min_availability_score = constraints.get('minAvailabilityScore', 5)
        exclude_maintenance_due = constraints.get('excludeMaintenanceDue', True)
        
        # Basic service readiness filters
        mask = (
            (features_df['fitness_validity_score'] > min_fitness_validity) &
            (features_df['availability_score'] >= min_availability_score) &
            (features_df['days_until_fitness_expiry'] >= 0)
        )
        
        # Optional: exclude trains with maintenance due
        if exclude_maintenance_due:
            mask = mask & (features_df['days_since_last_maintenance'] <= 180)  # Within 6 months
        
        return features_df[mask].copy()

    def ml_ranking(self, service_ready_df: pd.DataFrame) -> List[Dict]:
        """Use ML model to rank trains"""
        try:
            # Prepare features for ML model
            feature_columns_available = [col for col in self.feature_columns if col in service_ready_df.columns]
            X = service_ready_df[feature_columns_available].fillna(0)
            
            # Ensure we have the minimum required features
            if len(feature_columns_available) < len(self.feature_columns) * 0.7:
                logger.warning("Insufficient features for ML model, falling back to rule-based ranking")
                return self.rule_based_ranking(service_ready_df)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Get predictions (optimization scores)
            predictions = self.model.predict(X_scaled)
            
            # Create ranking
            service_ready_df = service_ready_df.copy()
            service_ready_df['ml_score'] = predictions
            service_ready_df = service_ready_df.sort_values('ml_score', ascending=False)
            
            ranked_trains = []
            for idx, (_, row) in enumerate(service_ready_df.iterrows()):
                confidence_score = min(100, max(60, int(row['ml_score'] * 10)))  # Scale to 60-100 range
                
                ranked_trains.append({
                    "train": row['_train_id'],
                    "rank": idx + 1,
                    "reasoning": self.generate_ml_reasoning(row),
                    "confidenceScore": confidence_score,
                    "constraints": {
                        "fitnessValid": row['fitness_validity_score'] > 0,
                        "maintenanceReady": row['availability_score'] >= 5,
                        "cleaningStatus": "CLEAN" if row['cleaning_status_score'] >= 7 else "NEEDS_CLEANING"
                    }
                })
            
            return ranked_trains
            
        except Exception as e:
            logger.error(f"ML ranking failed: {e}, falling back to rule-based ranking")
            return self.rule_based_ranking(service_ready_df)

    def rule_based_ranking(self, service_ready_df: pd.DataFrame) -> List[Dict]:
        """Rule-based ranking system"""
        
        # Define weights for different criteria
        weights = {
            'fitness_validity_score': 0.25,
            'availability_score': 0.20,
            'maintenance_urgency_score': -0.15,  # Lower urgency is better
            'cleaning_status_score': 0.10,
            'branding_priority_score': 0.10,
            'performance_score': 0.08,
            'reliability_score': 0.07,
            'mileage_balance_score': 0.10,
            'fuel_efficiency_score': 0.05
        }
        
        # Calculate composite score
        service_ready_df = service_ready_df.copy()
        service_ready_df['composite_score'] = 0
        
        for feature, weight in weights.items():
            if feature in service_ready_df.columns:
                # Normalize scores to 0-10 range
                normalized_scores = service_ready_df[feature].fillna(5)
                service_ready_df['composite_score'] += normalized_scores * weight
        
        # Sort by composite score
        service_ready_df = service_ready_df.sort_values('composite_score', ascending=False)
        
        # Create ranking
        ranked_trains = []
        for idx, (_, row) in enumerate(service_ready_df.iterrows()):
            confidence_score = min(100, max(60, int(row['composite_score'] * 10)))
            
            ranked_trains.append({
                "train": row['_train_id'],
                "rank": idx + 1,
                "reasoning": self.generate_rule_based_reasoning(row),
                "confidenceScore": confidence_score,
                "constraints": {
                    "fitnessValid": row['fitness_validity_score'] > 0,
                    "maintenanceReady": row['availability_score'] >= 5,
                    "cleaningStatus": "CLEAN" if row['cleaning_status_score'] >= 7 else "NEEDS_CLEANING",
                    "brandingPriority": row.get('branding_priority_score', 0),
                    "mileageBalance": row.get('current_mileage_normalized', 0)
                }
            })
        
        return ranked_trains

    def generate_ml_reasoning(self, train_row) -> str:
        """Generate reasoning for ML-based ranking"""
        reasons = []
        
        if train_row['fitness_validity_score'] > 8:
            days_left = int(train_row.get('days_until_fitness_expiry', 0))
            reasons.append(f"High fitness validity score ({days_left} days remaining)")
        
        if train_row['availability_score'] >= 8:
            reasons.append("High availability score - fully operational")
        
        if train_row['performance_score'] >= 7:
            reasons.append(f"Strong performance metrics ({train_row['performance_score']:.1f}/10)")
        
        if train_row['mileage_balance_score'] >= 7:
            reasons.append("Well-balanced mileage distribution")
        
        if train_row.get('branding_priority_score', 0) >= 3:
            reasons.append(f"Priority branding ({train_row.get('branding_priority_score', 0)}/5)")
        
        reasons.append("ML model optimization score")
        
        return "; ".join(reasons) if reasons else "Selected by ML optimization model"

    def generate_rule_based_reasoning(self, train_row) -> str:
        """Generate reasoning for rule-based ranking"""
        reasons = []
        
        if train_row['fitness_validity_score'] > 5:
            days_left = int(train_row.get('days_until_fitness_expiry', 0))
            reasons.append(f"Valid fitness certificate ({days_left} days remaining)")
        
        if train_row['availability_score'] >= 8:
            reasons.append("Fully operational status")
        elif train_row['availability_score'] >= 5:
            reasons.append("Available for service")
        
        if train_row['cleaning_status_score'] >= 8:
            reasons.append("Excellent cleaning status")
        
        if train_row.get('maintenance_urgency_score', 5) <= 2:
            reasons.append("Low maintenance urgency")
        
        if train_row.get('performance_score', 0) >= 6:
            reasons.append(f"Good performance record ({train_row.get('performance_score', 0):.1f}/10)")
        
        if train_row.get('branding_priority_score', 0) >= 2:
            reasons.append(f"Branding priority {train_row.get('branding_priority_score', 0)}/5")
        
        composite = train_row.get('composite_score', 0)
        reasons.append(f"Overall optimization score: {composite:.1f}")
        
        return "; ".join(reasons) if reasons else "Selected based on optimization criteria"

    def generate_alerts(self, trains: List[Dict]) -> List[Dict]:
        """Generate alerts based on train conditions"""
        alerts = []
        
        for train in trains:
            train_id = train.get('trainsetId', str(train.get('_id', 'Unknown')))
            
            # Fitness certificate expiry alerts
            fitness_status = train.get('fitnessStatus', {})
            if fitness_status.get('expiryDate'):
                try:
                    expiry_date = fitness_status['expiryDate']
                    if isinstance(expiry_date, str):
                        expiry_date = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
                    elif isinstance(expiry_date, dict) and '$date' in expiry_date:
                        expiry_date = datetime.fromisoformat(expiry_date['$date'].replace('Z', '+00:00'))
                    
                    days_until_expiry = (expiry_date - datetime.now()).days
                    
                    if days_until_expiry < 0:
                        alerts.append({
                            "type": "CRITICAL",
                            "message": f"{train_id}: Fitness certificate has EXPIRED",
                            "trainId": train_id,
                            "severity": 5
                        })
                    elif days_until_expiry <= 3:
                        alerts.append({
                            "type": "CRITICAL", 
                            "message": f"{train_id}: Fitness certificate expires in {days_until_expiry} days",
                            "trainId": train_id,
                            "severity": 5
                        })
                    elif days_until_expiry <= 7:
                        alerts.append({
                            "type": "WARNING",
                            "message": f"{train_id}: Fitness certificate expires in {days_until_expiry} days", 
                            "trainId": train_id,
                            "severity": 3
                        })
                    elif days_until_expiry <= 14:
                        alerts.append({
                            "type": "INFO",
                            "message": f"{train_id}: Fitness certificate expires in {days_until_expiry} days",
                            "trainId": train_id,
                            "severity": 2
                        })
                except Exception as e:
                    logger.error(f"Error processing fitness expiry for {train_id}: {e}")
            
            # Invalid fitness status
            if not fitness_status.get('isValid', False):
                alerts.append({
                    "type": "CRITICAL",
                    "message": f"{train_id}: Invalid fitness certificate",
                    "trainId": train_id,
                    "severity": 5
                })
            
            # Maintenance alerts
            if train.get('maintenanceDue', False):
                urgency = train.get('maintenanceUrgency', 1)
                severity = min(5, max(2, urgency))
                alert_type = "CRITICAL" if urgency >= 4 else "WARNING" if urgency >= 2 else "INFO"
                
                alerts.append({
                    "type": alert_type,
                    "message": f"{train_id}: Maintenance due (Urgency: {urgency}/5)",
                    "trainId": train_id,
                    "severity": severity
                })
            
            # Availability alerts
            if train.get('isAvailableForService') == False:
                alerts.append({
                    "type": "WARNING",
                    "message": f"{train_id}: Not available for service",
                    "trainId": train_id,
                    "severity": 3
                })
            
            # Maintenance status alerts
            maintenance_status = train.get('maintenanceStatus', '')
            if maintenance_status == 'OUT_OF_SERVICE':
                alerts.append({
                    "type": "CRITICAL",
                    "message": f"{train_id}: Out of service",
                    "trainId": train_id,
                    "severity": 4
                })
            elif maintenance_status == 'MAINTENANCE':
                alerts.append({
                    "type": "WARNING",
                    "message": f"{train_id}: Currently under maintenance",
                    "trainId": train_id,
                    "severity": 3
                })
            
            # Cleaning alerts
            cleaning_status = train.get('cleaningStatus', '')
            if cleaning_status == 'DIRTY':
                alerts.append({
                    "type": "WARNING",
                    "message": f"{train_id}: Requires cleaning",
                    "trainId": train_id,
                    "severity": 2
                })
            
            # Branding expiry alerts (if applicable)
            branding = train.get('branding', {})
            if branding.get('brandingExpiryDate'):
                try:
                    expiry_date = branding['brandingExpiryDate']
                    if isinstance(expiry_date, str):
                        expiry_date = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
                    elif isinstance(expiry_date, dict) and '$date' in expiry_date:
                        expiry_date = datetime.fromisoformat(expiry_date['$date'].replace('Z', '+00:00'))
                    
                    days_until_expiry = (expiry_date - datetime.now()).days
                    
                    if days_until_expiry <= 7:
                        alerts.append({
                            "type": "INFO",
                            "message": f"{train_id}: Branding expires in {days_until_expiry} days",
                            "trainId": train_id,
                            "severity": 1
                        })
                except Exception as e:
                    logger.error(f"Error processing branding expiry for {train_id}: {e}")
        
        # Sort alerts by severity (highest first)
        alerts.sort(key=lambda x: x.get('severity', 0), reverse=True)
        
        return alerts

    def train_model(self, historical_data: List[Dict], performance_scores: List[float]) -> Optional[float]:
        """Train the ML model with historical data"""
        try:
            if len(historical_data) != len(performance_scores):
                raise ValueError("Mismatched lengths between historical data and performance scores")
            
            if len(historical_data) < 10:
                logger.warning("Insufficient training data (minimum 10 samples required)")
                return None
            
            logger.info(f"Training model with {len(historical_data)} samples")
            
            # Extract features from historical data
            features_df = self.extract_features(historical_data)
            
            if features_df.empty:
                logger.error("No features could be extracted from historical data")
                return None
            
            # Prepare training data
            feature_columns_available = [col for col in self.feature_columns if col in features_df.columns]
            X = features_df[feature_columns_available].fillna(0)
            y = np.array(performance_scores[:len(X)])
            
            if len(feature_columns_available) < 5:
                logger.error("Insufficient feature columns for training")
                return None
            
            # Initialize scaler and model
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Split data for validation
            if len(X) >= 20:
                X_train, X_test, y_train, y_test = train_test_split(
                    X_scaled, y, test_size=0.2, random_state=42
                )
            else:
                X_train, X_test, y_train, y_test = X_scaled, X_scaled, y, y
            
            # Train Random Forest model
            self.model = RandomForestRegressor(
                n_estimators=100,
                random_state=42,
                max_depth=10,
                min_samples_split=2,
                min_samples_leaf=1
            )
            
            self.model.fit(X_train, y_train)
            
            # Calculate performance metrics
            y_pred = self.model.predict(X_test)
            mse = mean_squared_error(y_test, y_pred)
            
            # Save the trained model
            self.save_model()
            
            logger.info(f"Model training completed. MSE: {mse:.4f}")
            return mse
            
        except Exception as e:
            logger.error(f"Model training failed: {e}")
            return None

def create_sample_train_data() -> List[Dict]:
    """Create sample train data for testing"""
    sample_trains = []
    
    for i in range(10):
        train = {
            "_id": f"train_{i+1:03d}",
            "trainsetId": f"TS-{i+1:03d}",
            "fitnessStatus": {
                "isValid": i < 8,  # Most trains have valid fitness
                "expiryDate": (datetime.now() + timedelta(days=30 + i*10)).isoformat(),
                "certificateNumber": f"FIT-{i+1:03d}"
            },
            "maintenanceStatus": ["OPERATIONAL", "MAINTENANCE", "OUT_OF_SERVICE"][i % 3],
            "maintenanceUrgency": (i % 5) + 1,
            "maintenanceDue": i % 4 == 0,
            "currentMileage": (i + 1) * 50000 + (i * 1000),
            "totalMileage": (i + 1) * 500000,
            "isAvailableForService": i < 9,  # Most trains available
            "cleaningStatus": ["CLEAN", "DIRTY", "LIGHT_CLEAN"][i % 3],
            "branding": {
                "hasBranding": i % 3 == 0,
                "brandingPriority": (i % 5) + 1,
                "brandType": f"Brand-{i % 3}"
            },
            "performanceScore": 60 + (i * 3) % 40,
            "reliabilityScore": 50 + (i * 4) % 50,
            "fuelEfficiency": 40 + (i * 2) % 30,
            "currentLocation": f"Station-{i % 5}",
            "trainType": "Electric",
            "manufacturer": "Manufacturer-A",
            "capacity": 1000,
            "lastMaintenanceDate": (datetime.now() - timedelta(days=i*15)).isoformat()
        }
        sample_trains.append(train)
    
    return sample_trains