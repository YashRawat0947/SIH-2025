#!/usr/bin/env python3
"""
Integration test script for KMRL Train Induction Planning System.
This script tests the core functionality end-to-end.
"""

import sys
import os
import traceback
from datetime import datetime

def test_imports():
    """Test all module imports."""
    print("🔍 Testing module imports...")
    try:
        import pandas as pd
        import numpy as np
        import requests
        import streamlit as st
        from fastapi import FastAPI
        import pulp
        from sklearn.ensemble import RandomForestClassifier
        print("✅ All required packages imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_odoo_utils():
    """Test Odoo utilities with mock data."""
    print("\n🔍 Testing Odoo utilities...")
    try:
        from odoo_utils import get_odoo_data, OdooClient
        
        # Test with mock data
        data = get_odoo_data(use_mock=True)
        
        if not data['trains'].empty:
            print(f"✅ Odoo utils working - Generated {len(data['trains'])} trains")
            return True
        else:
            print("❌ Odoo utils failed - No train data generated")
            return False
    except Exception as e:
        print(f"❌ Odoo utils error: {e}")
        traceback.print_exc()
        return False

def test_mock_data():
    """Test mock data generation."""
    print("\n🔍 Testing mock data generation...")
    try:
        from mocks import generate_all_mock_data, IoTSensorMock, UNSAlertsMock
        
        # Generate mock data
        mock_data = generate_all_mock_data(25)
        
        required_keys = ['iot_fitness', 'iot_sensors', 'fitness_certificates', 
                        'uns_delays', 'uns_alerts', 'operational_metrics']
        
        for key in required_keys:
            if key not in mock_data:
                print(f"❌ Missing mock data key: {key}")
                return False
        
        print(f"✅ Mock data generation working - Generated data for {mock_data['num_trains']} trains")
        return True
    except Exception as e:
        print(f"❌ Mock data error: {e}")
        traceback.print_exc()
        return False

def test_ml_model():
    """Test ML model training and prediction."""
    print("\n🔍 Testing ML model...")
    try:
        from ml_model import TrainInductionMLModel, prepare_training_data
        from odoo_utils import get_odoo_data
        from mocks import generate_all_mock_data
        
        # Get test data
        odoo_data = get_odoo_data(use_mock=True)
        mock_data = generate_all_mock_data(25)
        training_data = prepare_training_data(odoo_data, mock_data)
        
        if training_data.empty:
            print("❌ ML model test failed - No training data")
            return False
        
        # Initialize and train model
        ml_model = TrainInductionMLModel('random_forest')
        results = ml_model.train_model(training_data)
        
        if results['accuracy'] > 0.5:  # Basic sanity check
            print(f"✅ ML model working - Accuracy: {results['accuracy']:.3f}")
            
            # Test predictions
            predictions = ml_model.predict_induction(training_data)
            if not predictions.empty:
                print(f"✅ ML predictions working - Generated predictions for {len(predictions)} trains")
                return True
            else:
                print("❌ ML predictions failed")
                return False
        else:
            print(f"❌ ML model accuracy too low: {results['accuracy']}")
            return False
            
    except Exception as e:
        print(f"❌ ML model error: {e}")
        traceback.print_exc()
        return False

def test_optimizer():
    """Test optimization engine."""
    print("\n🔍 Testing optimization engine...")
    try:
        from optimizer import TrainInductionOptimizer, create_induction_ranking
        from ml_model import TrainInductionMLModel, prepare_training_data
        from odoo_utils import get_odoo_data
        from mocks import generate_all_mock_data
        
        # Get test data
        odoo_data = get_odoo_data(use_mock=True)
        mock_data = generate_all_mock_data(25)
        training_data = prepare_training_data(odoo_data, mock_data)
        
        # Train model for predictions
        ml_model = TrainInductionMLModel()
        ml_model.train_model(training_data)
        predictions = ml_model.predict_induction(training_data)
        
        # Test optimization
        optimizer = TrainInductionOptimizer()
        results = optimizer.optimize_induction_list(training_data, predictions, target_inductions=20)
        
        if results['status'] == 'Optimal':
            inducted_count = results['summary']['trains_inducted']
            print(f"✅ Optimization working - Status: {results['status']}, Inducted: {inducted_count}")
            
            # Test ranking creation
            ranking = create_induction_ranking(results, training_data)
            if not ranking.empty:
                print(f"✅ Ranking creation working - Generated ranking for {len(ranking)} trains")
                return True
            else:
                print("❌ Ranking creation failed")
                return False
        else:
            print(f"❌ Optimization failed - Status: {results['status']}")
            return False
            
    except Exception as e:
        print(f"❌ Optimization error: {e}")
        traceback.print_exc()
        return False

def test_config_logging():
    """Test configuration and logging system."""
    print("\n🔍 Testing configuration and logging...")
    try:
        from config import get_config, get_logger, log_performance, handle_error
        
        # Test configuration
        config = get_config()
        api_port = config.get('api.port')
        ml_type = config.get('ml_model.model_type')
        
        if api_port and ml_type:
            print(f"✅ Configuration working - API Port: {api_port}, ML Type: {ml_type}")
        else:
            print("❌ Configuration failed")
            return False
        
        # Test logging
        logger = get_logger('test')
        logger.info("Test log message")
        
        # Test error handling
        try:
            raise ValueError("Test error")
        except Exception as e:
            error_response = handle_error(e, {'test': 'context'})
            if error_response['status'] == 'error':
                print("✅ Error handling working")
                return True
            else:
                print("❌ Error handling failed")
                return False
                
    except Exception as e:
        print(f"❌ Config/logging error: {e}")
        traceback.print_exc()
        return False

def test_backend_imports():
    """Test backend module imports without starting server."""
    print("\n🔍 Testing backend imports...")
    try:
        # Test FastAPI imports and basic functionality
        from backend import app
        from fastapi.testclient import TestClient
        
        print("✅ Backend imports successful")
        return True
    except Exception as e:
        print(f"❌ Backend import error: {e}")
        traceback.print_exc()
        return False

def test_frontend_imports():
    """Test frontend module imports without starting Streamlit."""
    print("\n🔍 Testing frontend imports...")
    try:
        # This will test imports but won't run Streamlit
        import streamlit as st
        import plotly.express as px
        import plotly.graph_objects as go
        
        print("✅ Frontend imports successful")
        return True
    except Exception as e:
        print(f"❌ Frontend import error: {e}")
        traceback.print_exc()
        return False

def run_integration_tests():
    """Run all integration tests."""
    print("🚇 KMRL Train Induction Planning System - Integration Tests")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    tests = [
        ("Package Imports", test_imports),
        ("Odoo Utils", test_odoo_utils),
        ("Mock Data", test_mock_data),
        ("ML Model", test_ml_model),
        ("Optimizer", test_optimizer),
        ("Config/Logging", test_config_logging),
        ("Backend Imports", test_backend_imports),
        ("Frontend Imports", test_frontend_imports)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ {test_name} - Unexpected error: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📈 Success Rate: {passed/(passed+failed)*100:.1f}%")
    
    if failed == 0:
        print("\n🎉 All integration tests passed! System is ready to use.")
        print("\n🚀 To start the system:")
        print("   1. Start backend: uvicorn backend:app --reload")
        print("   2. Start frontend: streamlit run app.py")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please review the errors above.")
    
    return failed == 0

if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)