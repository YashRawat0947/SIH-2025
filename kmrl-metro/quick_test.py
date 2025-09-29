#!/usr/bin/env python3
"""
Quick test script for core KMRL system functionality.
"""

print("🚇 KMRL System Quick Test")
print("=" * 30)

# Test 1: Basic imports
try:
    print("1. Testing imports...")
    import pandas as pd
    import numpy as np
    print("   ✅ pandas, numpy imported")
    
    import pulp
    from sklearn.ensemble import RandomForestClassifier
    print("   ✅ pulp, sklearn imported")
    
    print("   ✅ All basic imports successful")
except Exception as e:
    print(f"   ❌ Import error: {e}")

# Test 2: Mock data generation
try:
    print("\n2. Testing mock data generation...")
    from mocks import generate_all_mock_data
    mock_data = generate_all_mock_data(5)  # Test with 5 trains
    print(f"   ✅ Generated mock data for {mock_data['num_trains']} trains")
except Exception as e:
    print(f"   ❌ Mock data error: {e}")

# Test 3: Odoo utils
try:
    print("\n3. Testing Odoo utilities...")
    from odoo_utils import get_odoo_data
    odoo_data = get_odoo_data(use_mock=True)
    print(f"   ✅ Generated {len(odoo_data['trains'])} train records")
except Exception as e:
    print(f"   ❌ Odoo utils error: {e}")

# Test 4: ML model (basic)
try:
    print("\n4. Testing ML model basics...")
    from ml_model import TrainInductionMLModel
    ml_model = TrainInductionMLModel()
    print("   ✅ ML model initialized")
except Exception as e:
    print(f"   ❌ ML model error: {e}")

# Test 5: Optimizer (basic)
try:
    print("\n5. Testing optimizer basics...")
    from optimizer import TrainInductionOptimizer
    optimizer = TrainInductionOptimizer()
    print("   ✅ Optimizer initialized")
except Exception as e:
    print(f"   ❌ Optimizer error: {e}")

# Test 6: Configuration
try:
    print("\n6. Testing configuration...")
    from config import get_config
    config = get_config()
    api_port = config.get('api.port')
    print(f"   ✅ Configuration loaded - API Port: {api_port}")
except Exception as e:
    print(f"   ❌ Configuration error: {e}")

print("\n✅ Quick test completed!")
print("\n🚀 If all tests passed, you can start the system:")
print("   Backend:  uvicorn backend:app --reload")
print("   Frontend: streamlit run app.py")