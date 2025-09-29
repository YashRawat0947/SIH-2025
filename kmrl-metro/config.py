"""
Configuration and logging setup for KMRL Train Induction Planning System.

This module provides centralized configuration management and logging setup
for the entire system, ensuring consistent behavior across all components.
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from typing import Dict, Any
import json


class SystemConfig:
    """Central configuration management for the KMRL system."""
    
    def __init__(self):
        """Initialize system configuration."""
        self.config = {
            # API Configuration
            'api': {
                'host': '0.0.0.0',
                'port': 8000,
                'debug': True,
                'cors_origins': ['*'],
                'timeout': 30
            },
            
            # Odoo Configuration
            'odoo': {
                'url': 'http://localhost:8069',
                'database': 'odoo',
                'username': 'admin',
                'password': 'admin',
                'timeout': 30,
                'use_mock_fallback': True
            },
            
            # ML Model Configuration
            'ml_model': {
                'model_type': 'random_forest',  # 'decision_tree' or 'random_forest'
                'train_test_split': 0.2,
                'cross_validation_folds': 5,
                'random_state': 42,
                'model_path': 'train_induction_model.joblib',
                'retrain_threshold_days': 7,
                'min_accuracy_threshold': 0.7,
                'feature_importance_threshold': 0.01
            },
            
            # Optimization Configuration
            'optimization': {
                'target_inductions': 25,
                'max_trains_by_2027': 40,
                'optimization_weights': {
                    'shunting_cost': 0.3,
                    'mileage_balance': 0.25,
                    'service_priority': 0.3,
                    'depot_efficiency': 0.15
                },
                'depot_capacities': {
                    'Aluva': 12,
                    'Palarivattom': 8,
                    'Kalamassery': 5
                },
                'solver_timeout': 60,
                'mip_gap': 0.01
            },
            
            # Business Rules Configuration
            'business_rules': {
                'min_fitness_score': 70,
                'max_days_since_maintenance': 30,
                'max_recent_delays': 3,
                'max_mechanical_issues': 2,
                'certificate_buffer_days': 7,
                'critical_fitness_threshold': 60,
                'high_priority_fitness_threshold': 85
            },
            
            # Data Sources Configuration
            'data_sources': {
                'mock_data_path': './mock_data',
                'backup_data_path': './backup_data',
                'export_data_path': './exports',
                'refresh_interval_minutes': 5,
                'data_retention_days': 30,
                'auto_backup': True
            },
            
            # Logging Configuration
            'logging': {
                'level': 'INFO',
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                'file_path': './logs/kmrl_system.log',
                'max_bytes': 10 * 1024 * 1024,  # 10MB
                'backup_count': 5,
                'console_output': True
            },
            
            # System Monitoring
            'monitoring': {
                'enable_metrics': True,
                'performance_logging': True,
                'error_tracking': True,
                'audit_logging': True,
                'health_check_interval': 60
            },
            
            # Frontend Configuration
            'frontend': {
                'auto_refresh_interval': 300,  # 5 minutes
                'max_display_trains': 50,
                'default_chart_height': 400,
                'enable_what_if_analysis': True
            }
        }
        
        # Load environment-specific overrides
        self._load_environment_config()
    
    def _load_environment_config(self):
        """Load configuration overrides from environment variables."""
        # Odoo configuration from environment
        if os.getenv('ODOO_URL'):
            self.config['odoo']['url'] = os.getenv('ODOO_URL')
        if os.getenv('ODOO_DB'):
            self.config['odoo']['database'] = os.getenv('ODOO_DB')
        if os.getenv('ODOO_USER'):
            self.config['odoo']['username'] = os.getenv('ODOO_USER')
        if os.getenv('ODOO_PASSWORD'):
            self.config['odoo']['password'] = os.getenv('ODOO_PASSWORD')
        
        # API configuration from environment
        if os.getenv('API_HOST'):
            self.config['api']['host'] = os.getenv('API_HOST')
        if os.getenv('API_PORT'):
            self.config['api']['port'] = int(os.getenv('API_PORT'))
        if os.getenv('API_DEBUG'):
            self.config['api']['debug'] = os.getenv('API_DEBUG').lower() == 'true'
        
        # Logging level from environment
        if os.getenv('LOG_LEVEL'):
            self.config['logging']['level'] = os.getenv('LOG_LEVEL').upper()
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation.
        
        Args:
            key_path: Dot-separated path to configuration value
            default: Default value if key not found
            
        Returns:
            Configuration value or default
        """
        keys = key_path.split('.')
        value = self.config
        
        try:
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default
    
    def set(self, key_path: str, value: Any):
        """
        Set configuration value using dot notation.
        
        Args:
            key_path: Dot-separated path to configuration value
            value: Value to set
        """
        keys = key_path.split('.')
        config = self.config
        
        for key in keys[:-1]:
            if key not in config:
                config[key] = {}
            config = config[key]
        
        config[keys[-1]] = value
    
    def save_config(self, filepath: str = 'config.json'):
        """Save current configuration to file."""
        try:
            with open(filepath, 'w') as f:
                json.dump(self.config, f, indent=2, default=str)
            logging.info(f"Configuration saved to {filepath}")
        except Exception as e:
            logging.error(f"Failed to save configuration: {e}")
    
    def load_config(self, filepath: str = 'config.json'):
        """Load configuration from file."""
        try:
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    loaded_config = json.load(f)
                    self.config.update(loaded_config)
                logging.info(f"Configuration loaded from {filepath}")
        except Exception as e:
            logging.error(f"Failed to load configuration: {e}")


class LoggingManager:
    """Enhanced logging manager for the KMRL system."""
    
    def __init__(self, config: SystemConfig):
        """Initialize logging manager with configuration."""
        self.config = config
        self.loggers = {}
        self.setup_logging()
    
    def setup_logging(self):
        """Set up comprehensive logging for the system."""
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(self.config.get('logging.file_path', './logs/kmrl_system.log'))
        os.makedirs(log_dir, exist_ok=True)
        
        # Configure root logger
        log_level = getattr(logging, self.config.get('logging.level', 'INFO'))
        log_format = self.config.get('logging.format', 
                                   '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        # Create formatters
        file_formatter = logging.Formatter(log_format)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(log_level)
        
        # Clear existing handlers
        root_logger.handlers.clear()
        
        # File handler with rotation
        file_handler = logging.handlers.RotatingFileHandler(
            self.config.get('logging.file_path'),
            maxBytes=self.config.get('logging.max_bytes', 10 * 1024 * 1024),
            backupCount=self.config.get('logging.backup_count', 5)
        )
        file_handler.setFormatter(file_formatter)
        file_handler.setLevel(log_level)
        root_logger.addHandler(file_handler)
        
        # Console handler (if enabled)
        if self.config.get('logging.console_output', True):
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(console_formatter)
            console_handler.setLevel(log_level)
            root_logger.addHandler(console_handler)
        
        # Create specialized loggers
        self._create_specialized_loggers()
        
        logging.info("Logging system initialized successfully")
    
    def _create_specialized_loggers(self):
        """Create specialized loggers for different system components."""
        # Performance logger
        perf_logger = logging.getLogger('performance')
        perf_handler = logging.FileHandler('./logs/performance.log')
        perf_handler.setFormatter(logging.Formatter(
            '%(asctime)s - PERF - %(message)s'
        ))
        perf_logger.addHandler(perf_handler)
        perf_logger.setLevel(logging.INFO)
        self.loggers['performance'] = perf_logger
        
        # Audit logger
        audit_logger = logging.getLogger('audit')
        audit_handler = logging.FileHandler('./logs/audit.log')
        audit_handler.setFormatter(logging.Formatter(
            '%(asctime)s - AUDIT - %(message)s'
        ))
        audit_logger.addHandler(audit_handler)
        audit_logger.setLevel(logging.INFO)
        self.loggers['audit'] = audit_logger
        
        # Error logger
        error_logger = logging.getLogger('errors')
        error_handler = logging.FileHandler('./logs/errors.log')
        error_handler.setFormatter(logging.Formatter(
            '%(asctime)s - ERROR - %(name)s - %(filename)s:%(lineno)d - %(message)s'
        ))
        error_logger.addHandler(error_handler)
        error_logger.setLevel(logging.ERROR)
        self.loggers['error'] = error_logger
    
    def get_logger(self, name: str) -> logging.Logger:
        """Get logger by name."""
        if name in self.loggers:
            return self.loggers[name]
        return logging.getLogger(name)
    
    def log_performance(self, operation: str, duration: float, details: Dict[str, Any] = None):
        """Log performance metrics."""
        if self.config.get('monitoring.performance_logging', True):
            details_str = json.dumps(details) if details else ""
            self.loggers['performance'].info(f"OPERATION:{operation} DURATION:{duration:.3f}s {details_str}")
    
    def log_audit(self, user_id: str, action: str, resource: str, details: Dict[str, Any] = None):
        """Log audit events."""
        if self.config.get('monitoring.audit_logging', True):
            details_str = json.dumps(details) if details else ""
            self.loggers['audit'].info(f"USER:{user_id} ACTION:{action} RESOURCE:{resource} {details_str}")
    
    def log_error(self, error: Exception, context: Dict[str, Any] = None):
        """Log errors with context."""
        if self.config.get('monitoring.error_tracking', True):
            context_str = json.dumps(context) if context else ""
            self.loggers['error'].error(f"ERROR:{str(error)} CONTEXT:{context_str}", exc_info=True)


class ErrorHandler:
    """Centralized error handling for the KMRL system."""
    
    def __init__(self, logging_manager: LoggingManager):
        """Initialize error handler."""
        self.logging_manager = logging_manager
        self.error_counts = {}
    
    def handle_error(self, error: Exception, context: Dict[str, Any] = None, 
                    critical: bool = False) -> Dict[str, Any]:
        """
        Handle system errors with appropriate logging and response.
        
        Args:
            error: Exception that occurred
            context: Additional context information
            critical: Whether this is a critical system error
            
        Returns:
            Error response dictionary
        """
        error_type = type(error).__name__
        error_msg = str(error)
        
        # Track error frequency
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        
        # Log the error
        self.logging_manager.log_error(error, context)
        
        # Create error response
        error_response = {
            'status': 'error',
            'error_type': error_type,
            'message': error_msg,
            'timestamp': datetime.now().isoformat(),
            'critical': critical
        }
        
        if context:
            error_response['context'] = context
        
        # Handle critical errors
        if critical:
            logging.critical(f"CRITICAL ERROR: {error_type} - {error_msg}")
            # Could trigger alerts, notifications, etc.
        
        return error_response
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """Get error statistics for monitoring."""
        return {
            'error_counts': self.error_counts,
            'total_errors': sum(self.error_counts.values()),
            'unique_error_types': len(self.error_counts)
        }


class PerformanceMonitor:
    """Performance monitoring and metrics collection."""
    
    def __init__(self, logging_manager: LoggingManager):
        """Initialize performance monitor."""
        self.logging_manager = logging_manager
        self.metrics = {}
        self.start_times = {}
    
    def start_operation(self, operation_name: str) -> str:
        """Start tracking an operation."""
        operation_id = f"{operation_name}_{datetime.now().timestamp()}"
        self.start_times[operation_id] = datetime.now()
        return operation_id
    
    def end_operation(self, operation_id: str, details: Dict[str, Any] = None):
        """End tracking an operation and log performance."""
        if operation_id in self.start_times:
            duration = (datetime.now() - self.start_times[operation_id]).total_seconds()
            operation_name = operation_id.split('_')[0]
            
            # Log performance
            self.logging_manager.log_performance(operation_name, duration, details)
            
            # Store metrics
            if operation_name not in self.metrics:
                self.metrics[operation_name] = []
            
            self.metrics[operation_name].append({
                'duration': duration,
                'timestamp': datetime.now().isoformat(),
                'details': details
            })
            
            # Clean up
            del self.start_times[operation_id]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary statistics."""
        summary = {}
        
        for operation, measurements in self.metrics.items():
            durations = [m['duration'] for m in measurements]
            
            if durations:
                summary[operation] = {
                    'count': len(durations),
                    'avg_duration': sum(durations) / len(durations),
                    'min_duration': min(durations),
                    'max_duration': max(durations),
                    'last_duration': durations[-1] if durations else 0
                }
        
        return summary


# Global configuration instance
config = SystemConfig()

# Global logging manager
logging_manager = LoggingManager(config)

# Global error handler
error_handler = ErrorHandler(logging_manager)

# Global performance monitor  
performance_monitor = PerformanceMonitor(logging_manager)


def get_config() -> SystemConfig:
    """Get global configuration instance."""
    return config


def get_logger(name: str = None) -> logging.Logger:
    """Get logger instance."""
    if name:
        return logging.getLogger(name)
    return logging.getLogger()


def log_performance(operation: str, duration: float, details: Dict[str, Any] = None):
    """Log performance metrics."""
    performance_monitor.logging_manager.log_performance(operation, duration, details)


def log_audit(user_id: str, action: str, resource: str, details: Dict[str, Any] = None):
    """Log audit events."""
    logging_manager.log_audit(user_id, action, resource, details)


def handle_error(error: Exception, context: Dict[str, Any] = None, 
                critical: bool = False) -> Dict[str, Any]:
    """Handle system errors."""
    return error_handler.handle_error(error, context, critical)


if __name__ == "__main__":
    # Test the configuration and logging system
    print("Testing KMRL configuration and logging system...")
    
    # Test configuration
    print(f"API Port: {config.get('api.port')}")
    print(f"ML Model Type: {config.get('ml_model.model_type')}")
    print(f"Target Inductions: {config.get('optimization.target_inductions')}")
    
    # Test logging
    logger = get_logger('test')
    logger.info("Test logging message")
    logger.warning("Test warning message")
    logger.error("Test error message")
    
    # Test performance monitoring
    op_id = performance_monitor.start_operation('test_operation')
    import time
    time.sleep(0.1)  # Simulate work
    performance_monitor.end_operation(op_id, {'test_param': 'test_value'})
    
    # Test error handling
    try:
        raise ValueError("Test error")
    except Exception as e:
        error_response = handle_error(e, {'test_context': 'error_test'})
        print(f"Error handled: {error_response}")
    
    print("Configuration and logging system test completed!")