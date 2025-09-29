"""
Mock data generators for IoT sensors and UNS (Unified Network System) alerts
for the KMRL Train Induction Planning System.

This module simulates real-world data that would come from:
- IoT sensors on trains (fitness scores, temperature, vibration, etc.)
- UNS alerts (delays, operational issues, severity levels)
"""

import json
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)


class IoTSensorMock:
    """Mock IoT sensor data generator for train fitness monitoring."""
    
    def __init__(self, num_trains: int = 25):
        """
        Initialize IoT sensor mock.
        
        Args:
            num_trains: Number of trains to generate data for
        """
        self.num_trains = num_trains
        self.train_ids = [f"KMRL-{i:03d}" for i in range(1, num_trains + 1)]
        
    def generate_fitness_scores(self) -> Dict[str, Dict[str, Any]]:
        """
        Generate fitness scores for all trains.
        
        Returns:
            Dictionary with train_id as key and fitness data as value
        """
        fitness_data = {}
        
        for train_id in self.train_ids:
            # Base fitness score (0-100)
            base_fitness = random.uniform(60, 100)
            
            # Individual component scores
            engine_score = random.uniform(70, 100)
            brake_score = random.uniform(75, 100)
            electrical_score = random.uniform(65, 100)
            door_score = random.uniform(80, 100)
            hvac_score = random.uniform(70, 95)
            
            # Calculate weighted fitness score
            weighted_fitness = (
                engine_score * 0.3 +
                brake_score * 0.25 +
                electrical_score * 0.2 +
                door_score * 0.15 +
                hvac_score * 0.1
            )
            
            # Add some randomness based on maintenance history
            maintenance_impact = random.uniform(-5, 10)
            final_fitness = max(0, min(100, weighted_fitness + maintenance_impact))
            
            fitness_data[train_id] = {
                'fitness_score': round(final_fitness, 2),
                'engine_score': round(engine_score, 2),
                'brake_score': round(brake_score, 2),
                'electrical_score': round(electrical_score, 2),
                'door_score': round(door_score, 2),
                'hvac_score': round(hvac_score, 2),
                'last_updated': datetime.now().isoformat(),
                'sensor_status': 'active' if final_fitness > 50 else 'warning'
            }
        
        return fitness_data
    
    def generate_sensor_readings(self) -> Dict[str, Dict[str, Any]]:
        """
        Generate detailed sensor readings for all trains.
        
        Returns:
            Dictionary with comprehensive sensor data per train
        """
        sensor_data = {}
        
        for train_id in self.train_ids:
            # Temperature readings (Celsius)
            engine_temp = random.uniform(60, 85)  # Normal: 60-80°C
            brake_temp = random.uniform(45, 75)   # Normal: 45-65°C
            cabin_temp = random.uniform(18, 28)   # Normal: 20-26°C
            
            # Vibration readings (g-force)
            engine_vibration = random.uniform(0.1, 2.5)  # Normal: 0.1-1.5g
            axle_vibration = random.uniform(0.05, 1.8)   # Normal: 0.05-1.0g
            
            # Electrical readings
            voltage = random.uniform(620, 780)  # Normal: 650-750V
            current = random.uniform(50, 200)   # Amperes
            
            # Door system readings
            door_cycles = random.randint(50, 300)  # Daily door operations
            door_response_time = random.uniform(2, 8)  # Seconds
            
            # Air conditioning readings
            hvac_power = random.uniform(15, 45)  # kW
            air_quality = random.uniform(85, 100)  # Percentage
            
            sensor_data[train_id] = {
                'temperatures': {
                    'engine': round(engine_temp, 1),
                    'brake': round(brake_temp, 1),
                    'cabin': round(cabin_temp, 1),
                    'status': 'normal' if engine_temp < 80 else 'high'
                },
                'vibrations': {
                    'engine': round(engine_vibration, 2),
                    'axle': round(axle_vibration, 2),
                    'status': 'normal' if engine_vibration < 1.5 else 'high'
                },
                'electrical': {
                    'voltage': round(voltage, 1),
                    'current': round(current, 1),
                    'status': 'normal' if 650 <= voltage <= 750 else 'abnormal'
                },
                'doors': {
                    'cycles_today': door_cycles,
                    'response_time': round(door_response_time, 1),
                    'status': 'normal' if door_response_time < 5 else 'slow'
                },
                'hvac': {
                    'power_consumption': round(hvac_power, 1),
                    'air_quality': round(air_quality, 1),
                    'status': 'normal' if hvac_power < 40 else 'high_consumption'
                },
                'timestamp': datetime.now().isoformat()
            }
        
        return sensor_data
    
    def get_fitness_certificate_status(self) -> Dict[str, Dict[str, Any]]:
        """
        Generate fitness certificate status for all trains.
        
        Returns:
            Dictionary with fitness certificate information
        """
        cert_data = {}
        
        for train_id in self.train_ids:
            # Random certificate expiry (some expired, some valid)
            days_to_expiry = random.randint(-10, 90)  # -10 means expired 10 days ago
            expiry_date = datetime.now() + timedelta(days=days_to_expiry)
            
            # Certificate validity
            is_valid = days_to_expiry > 0
            
            # Last inspection date
            last_inspection = datetime.now() - timedelta(days=random.randint(1, 30))
            
            cert_data[train_id] = {
                'certificate_number': f"FIT-{train_id}-{random.randint(1000, 9999)}",
                'issue_date': (expiry_date - timedelta(days=365)).isoformat(),
                'expiry_date': expiry_date.isoformat(),
                'is_valid': is_valid,
                'days_to_expiry': days_to_expiry,
                'last_inspection': last_inspection.isoformat(),
                'inspector_id': f"INS-{random.randint(100, 999)}",
                'status': 'valid' if is_valid else 'expired',
                'next_inspection_due': (datetime.now() + timedelta(days=random.randint(1, 14))).isoformat()
            }
        
        return cert_data


class UNSAlertsMock:
    """Mock UNS (Unified Network System) alerts generator."""
    
    def __init__(self, num_trains: int = 25):
        """
        Initialize UNS alerts mock.
        
        Args:
            num_trains: Number of trains to generate alerts for
        """
        self.num_trains = num_trains
        self.train_ids = [f"KMRL-{i:03d}" for i in range(1, num_trains + 1)]
        
        # Alert types and their typical frequencies
        self.alert_types = {
            'delay': {'weight': 0.4, 'severity': ['low', 'medium']},
            'mechanical': {'weight': 0.2, 'severity': ['medium', 'high']},
            'electrical': {'weight': 0.15, 'severity': ['medium', 'high']},
            'door_fault': {'weight': 0.1, 'severity': ['low', 'medium']},
            'hvac_fault': {'weight': 0.08, 'severity': ['low', 'medium']},
            'communication': {'weight': 0.05, 'severity': ['low', 'medium']},
            'security': {'weight': 0.02, 'severity': ['high', 'critical']}
        }
    
    def generate_delay_alerts(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Generate delay alerts for trains.
        
        Returns:
            Dictionary with train delays information
        """
        delay_data = {}
        
        for train_id in self.train_ids:
            delays = []
            
            # Some trains may have no delays
            if random.random() < 0.3:  # 30% chance of no delays
                delay_data[train_id] = delays
                continue
            
            # Generate 1-3 delay incidents
            num_delays = random.randint(1, 3)
            
            for _ in range(num_delays):
                delay_minutes = random.randint(1, 15)  # 1-15 minutes
                delay_reason = random.choice([
                    'passenger_boarding', 'door_fault', 'signal_delay',
                    'track_maintenance', 'weather', 'crowd_control',
                    'technical_issue', 'schedule_adjustment'
                ])
                
                delay = {
                    'delay_id': f"DEL-{random.randint(10000, 99999)}",
                    'delay_minutes': delay_minutes,
                    'reason': delay_reason,
                    'station': random.choice([
                        'Aluva', 'Kalamassery', 'Palarivattom', 'Edappally',
                        'Changampuzha Park', 'JLN Stadium', 'MG Road'
                    ]),
                    'timestamp': (datetime.now() - timedelta(hours=random.randint(0, 24))).isoformat(),
                    'severity': 'low' if delay_minutes <= 5 else 'medium',
                    'resolved': random.choice([True, False])
                }
                delays.append(delay)
            
            delay_data[train_id] = delays
        
        return delay_data
    
    def generate_system_alerts(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Generate various system alerts for trains.
        
        Returns:
            Dictionary with system alerts per train
        """
        alerts_data = {}
        
        for train_id in self.train_ids:
            alerts = []
            
            # Generate random number of alerts (0-5 per train)
            num_alerts = random.choices(
                range(6), 
                weights=[0.4, 0.3, 0.15, 0.1, 0.03, 0.02]  # Most trains have 0-2 alerts
            )[0]
            
            for _ in range(num_alerts):
                alert_type = random.choices(
                    list(self.alert_types.keys()),
                    weights=[data['weight'] for data in self.alert_types.values()]
                )[0]
                
                severity = random.choice(self.alert_types[alert_type]['severity'])
                
                alert = {
                    'alert_id': f"UNS-{random.randint(100000, 999999)}",
                    'type': alert_type,
                    'severity': severity,
                    'message': self._generate_alert_message(alert_type, severity),
                    'timestamp': (datetime.now() - timedelta(hours=random.randint(0, 48))).isoformat(),
                    'acknowledged': random.choice([True, False]),
                    'resolved': random.choice([True, False]),
                    'location': random.choice(['depot', 'route', 'station']),
                    'technician_assigned': random.choice([True, False])
                }
                alerts.append(alert)
            
            alerts_data[train_id] = alerts
        
        return alerts_data
    
    def _generate_alert_message(self, alert_type: str, severity: str) -> str:
        """Generate contextual alert messages based on type and severity."""
        messages = {
            'delay': {
                'low': f"Minor schedule adjustment - {random.randint(1, 3)} minutes",
                'medium': f"Service delay detected - {random.randint(4, 10)} minutes"
            },
            'mechanical': {
                'medium': "Mechanical system requires attention",
                'high': "Critical mechanical fault detected"
            },
            'electrical': {
                'medium': "Electrical system anomaly detected",
                'high': "Major electrical system fault"
            },
            'door_fault': {
                'low': "Door sensor calibration needed",
                'medium': "Door operation fault on car 2"
            },
            'hvac_fault': {
                'low': "HVAC efficiency below optimal",
                'medium': "HVAC system malfunction detected"
            },
            'communication': {
                'low': "Communication signal weak",
                'medium': "Communication system intermittent"
            },
            'security': {
                'high': "Security system alert triggered",
                'critical': "Emergency security protocol activated"
            }
        }
        
        return messages.get(alert_type, {}).get(severity, f"{alert_type.title()} issue detected")
    
    def get_operational_metrics(self) -> Dict[str, Dict[str, Any]]:
        """
        Generate operational metrics for all trains.
        
        Returns:
            Dictionary with operational performance metrics
        """
        metrics_data = {}
        
        for train_id in self.train_ids:
            # Performance metrics
            on_time_performance = random.uniform(85, 98)  # Percentage
            passenger_load_factor = random.uniform(60, 95)  # Percentage
            energy_efficiency = random.uniform(3.5, 5.2)  # kWh per km
            
            # Service metrics
            service_reliability = random.uniform(95, 99.5)  # Percentage
            door_fault_rate = random.uniform(0, 0.5)  # Faults per 1000 operations
            
            # Recent delays summary
            recent_delays = random.randint(0, 5)
            total_delay_minutes = sum([random.randint(1, 10) for _ in range(recent_delays)])
            
            metrics_data[train_id] = {
                'performance': {
                    'on_time_performance': round(on_time_performance, 1),
                    'passenger_load_factor': round(passenger_load_factor, 1),
                    'energy_efficiency': round(energy_efficiency, 2),
                    'service_reliability': round(service_reliability, 2)
                },
                'recent_issues': {
                    'delays_count': recent_delays,
                    'total_delay_minutes': total_delay_minutes,
                    'door_faults': random.randint(0, 2),
                    'mechanical_issues': random.randint(0, 1)
                },
                'last_updated': datetime.now().isoformat(),
                'data_quality': random.choice(['excellent', 'good', 'fair'])
            }
        
        return metrics_data


def generate_all_mock_data(num_trains: int = 25) -> Dict[str, Any]:
    """
    Generate comprehensive mock data for the train induction system.
    
    Args:
        num_trains: Number of trains to generate data for
        
    Returns:
        Dictionary containing all mock data
    """
    logger.info(f"Generating mock data for {num_trains} trains...")
    
    # Initialize mock generators
    iot_mock = IoTSensorMock(num_trains)
    uns_mock = UNSAlertsMock(num_trains)
    
    # Generate all data
    mock_data = {
        'iot_fitness': iot_mock.generate_fitness_scores(),
        'iot_sensors': iot_mock.generate_sensor_readings(),
        'fitness_certificates': iot_mock.get_fitness_certificate_status(),
        'uns_delays': uns_mock.generate_delay_alerts(),
        'uns_alerts': uns_mock.generate_system_alerts(),
        'operational_metrics': uns_mock.get_operational_metrics(),
        'generated_at': datetime.now().isoformat(),
        'num_trains': num_trains
    }
    
    logger.info("Mock data generation completed")
    return mock_data


def save_mock_data_to_files(data: Dict[str, Any], base_path: str = ".") -> None:
    """
    Save mock data to JSON files for persistence.
    
    Args:
        data: Mock data dictionary
        base_path: Base path to save files
    """
    import os
    
    # Create data directory if it doesn't exist
    data_dir = os.path.join(base_path, "mock_data")
    os.makedirs(data_dir, exist_ok=True)
    
    # Save each data type to separate files
    for data_type, content in data.items():
        if data_type not in ['generated_at', 'num_trains']:
            filename = os.path.join(data_dir, f"{data_type}.json")
            with open(filename, 'w') as f:
                json.dump(content, f, indent=2, default=str)
    
    # Save metadata
    metadata = {
        'generated_at': data['generated_at'],
        'num_trains': data['num_trains']
    }
    with open(os.path.join(data_dir, "metadata.json"), 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Mock data saved to {data_dir}")


def load_mock_data_from_files(base_path: str = ".") -> Dict[str, Any]:
    """
    Load mock data from JSON files.
    
    Args:
        base_path: Base path where files are stored
        
    Returns:
        Dictionary containing loaded mock data
    """
    import os
    
    data_dir = os.path.join(base_path, "mock_data")
    
    if not os.path.exists(data_dir):
        logger.warning("Mock data directory not found, generating new data")
        return generate_all_mock_data()
    
    mock_data = {}
    
    # Load all JSON files
    for filename in os.listdir(data_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(data_dir, filename)
            with open(filepath, 'r') as f:
                data_key = filename.replace('.json', '')
                mock_data[data_key] = json.load(f)
    
    logger.info(f"Mock data loaded from {data_dir}")
    return mock_data


if __name__ == "__main__":
    # Test the mock data generation
    print("Generating mock data...")
    
    data = generate_all_mock_data(25)
    
    print(f"Generated data for {data['num_trains']} trains")
    print(f"Data types: {list(data.keys())}")
    
    # Sample some data
    sample_train = list(data['iot_fitness'].keys())[0]
    print(f"\nSample fitness data for {sample_train}:")
    print(json.dumps(data['iot_fitness'][sample_train], indent=2))
    
    print(f"\nSample UNS alerts for {sample_train}:")
    print(json.dumps(data['uns_alerts'][sample_train][:2], indent=2))
    
    # Save to files for testing
    save_mock_data_to_files(data)
    print("\nMock data saved to files")