"""
FastAPI backend for KMRL Train Induction Planning System.

This module provides REST API endpoints for:
- Data fetching from Odoo and mock sources
- ML model predictions
- Optimization engine
- Manual overrides
- Real-time updates and polling
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import pandas as pd
import logging
from datetime import datetime, timedelta
import asyncio
import json
import os

# Import our modules
from odoo_utils import get_odoo_data
from mocks import generate_all_mock_data, save_mock_data_to_files, load_mock_data_from_files
from ml_model import TrainInductionMLModel, prepare_training_data
from optimizer import TrainInductionOptimizer, create_induction_ranking

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="KMRL Train Induction Planning API",
    description="AI-driven train induction planning system for Kochi Metro Rail Limited",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for caching
cached_data = {
    'last_update': None,
    'train_data': None,
    'mock_data': None,
    'ml_predictions': None,
    'optimization_results': None,
    'manual_overrides': {},
    'system_status': 'initializing'
}

# Initialize ML model and optimizer
ml_model = TrainInductionMLModel()
optimizer = TrainInductionOptimizer()

# Pydantic models for API requests/responses
class TrainOverride(BaseModel):
    train_id: str
    decision: int  # 1 = induct, 0 = hold
    reason: Optional[str] = "Manual override"

class PredictionRequest(BaseModel):
    use_mock_data: bool = True
    retrain_model: bool = False
    target_inductions: int = 25

class SystemStatus(BaseModel):
    status: str
    last_update: Optional[str]
    trains_count: int
    ml_model_trained: bool
    optimization_completed: bool
    manual_overrides_count: int

class TrainData(BaseModel):
    train_id: str
    fitness_score: float
    depot: str
    mileage: int
    open_work_orders: int
    cert_valid: bool
    final_decision: str
    reasoning: str


@app.on_event("startup")
async def startup_event():
    """Initialize the system on startup."""
    logger.info("Starting KMRL Train Induction Planning System...")
    
    try:
        # Load existing model if available
        if os.path.exists("train_induction_model.joblib"):
            ml_model.load_model()
            logger.info("Loaded existing ML model")
        
        # Initialize with cached data or generate new
        await refresh_data()
        
        cached_data['system_status'] = 'running'
        logger.info("System startup completed successfully")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        cached_data['system_status'] = 'error'


@app.get("/", summary="Health Check")
async def root():
    """Basic health check endpoint."""
    return {
        "message": "KMRL Train Induction Planning API",
        "status": cached_data['system_status'],
        "timestamp": datetime.now().isoformat()
    }


@app.get("/status", response_model=SystemStatus, summary="Get System Status")
async def get_system_status():
    """Get current system status and statistics."""
    train_count = len(cached_data['train_data']) if cached_data['train_data'] is not None else 0
    
    return SystemStatus(
        status=cached_data['system_status'],
        last_update=cached_data['last_update'],
        trains_count=train_count,
        ml_model_trained=ml_model.is_trained,
        optimization_completed=cached_data['optimization_results'] is not None,
        manual_overrides_count=len(cached_data['manual_overrides'])
    )


@app.post("/fetch_data", summary="Fetch Data from Sources")
async def fetch_data(use_mock: bool = True, background_tasks: BackgroundTasks = None):
    """
    Fetch data from Odoo and mock sources.
    
    Args:
        use_mock: Whether to use mock data instead of connecting to Odoo
    """
    try:
        logger.info(f"Fetching data (use_mock={use_mock})...")
        
        # Fetch Odoo data
        odoo_data = get_odoo_data(use_mock=use_mock)
        
        # Generate/load mock data
        if use_mock:
            mock_data = generate_all_mock_data(25)
            # Save for persistence
            save_mock_data_to_files(mock_data)
        else:
            # Try to load existing mock data, generate if not available
            try:
                mock_data = load_mock_data_from_files()
            except:
                mock_data = generate_all_mock_data(25)
                save_mock_data_to_files(mock_data)
        
        # Cache the data
        cached_data['train_data'] = prepare_training_data(odoo_data, mock_data)
        cached_data['mock_data'] = mock_data
        cached_data['last_update'] = datetime.now().isoformat()
        
        # Schedule background ML training if needed
        if background_tasks and not ml_model.is_trained:
            background_tasks.add_task(train_ml_model_background)
        
        return {
            "status": "success",
            "message": "Data fetched successfully",
            "trains_count": len(cached_data['train_data']),
            "data_source": "mock" if use_mock else "odoo",
            "timestamp": cached_data['last_update']
        }
        
    except Exception as e:
        logger.error(f"Error fetching data: {e}")
        raise HTTPException(status_code=500, detail=f"Data fetch failed: {str(e)}")


@app.post("/train_model", summary="Train ML Model")
async def train_model():
    """Train the ML model with current data."""
    try:
        if cached_data['train_data'] is None:
            raise HTTPException(status_code=400, detail="No training data available. Fetch data first.")
        
        logger.info("Training ML model...")
        results = ml_model.train_model(cached_data['train_data'])
        
        # Save the trained model
        model_path = ml_model.save_model()
        
        return {
            "status": "success",
            "message": "ML model trained successfully",
            "model_accuracy": results['accuracy'],
            "cv_score": results['cv_mean'],
            "feature_importance": results['feature_importance'],
            "model_path": model_path,
            "training_samples": results['training_size']
        }
        
    except Exception as e:
        logger.error(f"Error training model: {e}")
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")


@app.post("/predict_induction", summary="Generate Induction Predictions")
async def predict_induction(request: PredictionRequest):
    """
    Generate ML predictions and run optimization for train induction.
    
    Args:
        request: Prediction request parameters
    """
    try:
        # Refresh data if requested
        if request.use_mock_data and cached_data['train_data'] is None:
            await fetch_data(use_mock=True)
        
        if cached_data['train_data'] is None:
            raise HTTPException(status_code=400, detail="No data available. Fetch data first.")
        
        # Retrain model if requested
        if request.retrain_model:
            await train_model()
        
        # Generate ML predictions
        logger.info("Generating ML predictions...")
        predictions = ml_model.predict_induction(cached_data['train_data'])
        cached_data['ml_predictions'] = predictions
        
        # Run optimization
        logger.info("Running optimization...")
        optimization_results = optimizer.optimize_induction_list(
            cached_data['train_data'], 
            predictions, 
            target_inductions=request.target_inductions
        )
        
        # Apply any existing manual overrides
        if cached_data['manual_overrides']:
            optimization_results = optimizer.apply_manual_overrides(
                optimization_results, 
                cached_data['manual_overrides']
            )
        
        cached_data['optimization_results'] = optimization_results
        
        # Create ranking
        ranking = create_induction_ranking(optimization_results, cached_data['train_data'])
        
        return {
            "status": "success",
            "message": "Predictions generated successfully",
            "optimization_status": optimization_results['status'],
            "summary": optimization_results['summary'],
            "induction_list": ranking.to_dict('records'),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating predictions: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/override_train", summary="Apply Manual Override")
async def override_train(override: TrainOverride):
    """
    Apply manual override for a specific train.
    
    Args:
        override: Train override information
    """
    try:
        if cached_data['optimization_results'] is None:
            raise HTTPException(status_code=400, detail="No optimization results available. Run predictions first.")
        
        # Validate train ID
        if override.train_id not in cached_data['optimization_results']['induction_decisions']:
            raise HTTPException(status_code=404, detail=f"Train {override.train_id} not found")
        
        # Apply override
        cached_data['manual_overrides'][override.train_id] = override.decision
        
        # Update optimization results
        cached_data['optimization_results'] = optimizer.apply_manual_overrides(
            cached_data['optimization_results'], 
            {override.train_id: override.decision}
        )
        
        # Update reasoning
        action = "Inducted" if override.decision == 1 else "Held"
        cached_data['optimization_results']['decision_reasoning'][override.train_id] = f"{action}: {override.reason}"
        
        logger.info(f"Manual override applied for {override.train_id}: {override.decision}")
        
        return {
            "status": "success",
            "message": f"Override applied for train {override.train_id}",
            "train_id": override.train_id,
            "new_decision": "Induct" if override.decision == 1 else "Hold",
            "reason": override.reason,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying override: {e}")
        raise HTTPException(status_code=500, detail=f"Override failed: {str(e)}")


from fastapi import HTTPException
from datetime import datetime

@app.get("/get_induction_list", summary="Get Current Induction List")
async def get_induction_list():
    """Get the current optimized induction list with all decisions and reasoning.
       If no predictions exist, auto-generate them with mock data.
    """
    try:
        # If no optimization results exist, auto-run prediction with defaults
        if cached_data['optimization_results'] is None:
            logger.warning("No induction list found. Auto-running prediction with mock data...")

            # Generate predictions
            train_data = cached_data.get("train_data")
            if train_data is None:
                # if no train_data exists, create mock data
                from mocks import generate_all_mock_data
                train_data = generate_all_mock_data(25)
                cached_data['train_data'] = train_data

            # ML prediction
            predictions = ml_model.predict_induction(train_data)

            # Optimization
            optimization_results = optimizer.optimize_induction_list(
                train_data, predictions, target_inductions=25
            )
            cached_data['optimization_results'] = optimization_results
            cached_data['last_update'] = datetime.now().isoformat()

        # Create current ranking
        ranking = create_induction_ranking(
            cached_data['optimization_results'], 
            cached_data['train_data']
        )

        return {
            "status": "success",
            "induction_list": ranking.to_dict('records'),
            "summary": cached_data['optimization_results']['summary'],
            "manual_overrides": len(cached_data['manual_overrides']),
            "last_update": cached_data['last_update'],
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting induction list: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get induction list: {str(e)}")


@app.get("/get_train_details/{train_id}", summary="Get Detailed Train Information")
async def get_train_details(train_id: str):
    """Get detailed information for a specific train."""
    try:
        if cached_data['train_data'] is None:
            raise HTTPException(status_code=400, detail="No train data available. Fetch data first.")
        
        # Find train in data
        train_row = cached_data['train_data'][cached_data['train_data']['train_id'] == train_id]
        
        if train_row.empty:
            raise HTTPException(status_code=404, detail=f"Train {train_id} not found")
        
        train_info = train_row.iloc[0].to_dict()
        
        # Add ML prediction if available
        if cached_data['ml_predictions'] is not None:
            ml_row = cached_data['ml_predictions'][cached_data['ml_predictions']['train_id'] == train_id]
            if not ml_row.empty:
                train_info.update({
                    'ml_prediction': int(ml_row.iloc[0]['ml_prediction']),
                    'ml_probability': float(ml_row.iloc[0]['ml_probability']),
                    'ml_confidence': float(ml_row.iloc[0]['ml_confidence'])
                })
        
        # Add optimization decision if available
        if cached_data['optimization_results'] is not None:
            decisions = cached_data['optimization_results']['induction_decisions']
            reasoning = cached_data['optimization_results']['decision_reasoning']
            
            if train_id in decisions:
                train_info.update({
                    'final_decision': 'Induct' if decisions[train_id] == 1 else 'Hold',
                    'reasoning': reasoning.get(train_id, 'No reasoning available'),
                    'manual_override': train_id in cached_data['manual_overrides']
                })
        
        # Add mock sensor data if available
        if cached_data['mock_data'] is not None:
            if train_id in cached_data['mock_data'].get('iot_sensors', {}):
                train_info['sensor_data'] = cached_data['mock_data']['iot_sensors'][train_id]
            
            if train_id in cached_data['mock_data'].get('uns_alerts', {}):
                train_info['recent_alerts'] = cached_data['mock_data']['uns_alerts'][train_id]
        
        return {
            "status": "success",
            "train_details": train_info,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting train details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get train details: {str(e)}")


@app.get("/refresh_data", summary="Refresh All Data")
async def refresh_data():
    """Refresh all data sources and regenerate predictions."""
    try:
        # Clear cache
        cached_data['train_data'] = None
        cached_data['mock_data'] = None
        cached_data['ml_predictions'] = None
        cached_data['optimization_results'] = None
        
        # Fetch fresh data
        await fetch_data(use_mock=True)
        
        # Retrain model if needed
        if not ml_model.is_trained:
            await train_model()
        
        # Generate new predictions
        request = PredictionRequest(use_mock_data=True, retrain_model=False, target_inductions=25)
        result = await predict_induction(request)
        
        return {
            "status": "success",
            "message": "All data refreshed successfully",
            "trains_count": len(cached_data['train_data']),
            "predictions_generated": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error refreshing data: {e}")
        raise HTTPException(status_code=500, detail=f"Data refresh failed: {str(e)}")


@app.get("/analytics", summary="Get System Analytics")
async def get_analytics():
    """Get analytics and performance metrics for the system."""
    try:
        analytics = {
            "system_performance": {
                "uptime_hours": 24,  # Placeholder
                "total_predictions": 1000,  # Placeholder
                "accuracy_rate": 0.92 if ml_model.is_trained else 0,
                "average_processing_time": 2.5  # seconds
            },
            "fleet_statistics": {},
            "optimization_metrics": {},
            "recent_activity": []
        }
        
        if cached_data['train_data'] is not None:
            df = cached_data['train_data']
            analytics["fleet_statistics"] = {
                "total_trains": len(df),
                "average_fitness": float(df['fitness_score'].mean()) if 'fitness_score' in df.columns else 0,
                "trains_with_issues": int(df['open_work_orders'].sum()) if 'open_work_orders' in df.columns else 0,
                "depot_distribution": df['depot'].value_counts().to_dict() if 'depot' in df.columns else {},
                "mileage_statistics": {
                    "average": float(df['mileage'].mean()) if 'mileage' in df.columns else 0,
                    "min": float(df['mileage'].min()) if 'mileage' in df.columns else 0,
                    "max": float(df['mileage'].max()) if 'mileage' in df.columns else 0
                }
            }
        
        if cached_data['optimization_results'] is not None:
            summary = cached_data['optimization_results']['summary']
            analytics["optimization_metrics"] = {
                "last_optimization": cached_data['last_update'],
                "trains_inducted": summary.get('trains_inducted', 0),
                "trains_held": summary.get('trains_held', 0),
                "optimization_status": cached_data['optimization_results']['status'],
                "manual_overrides": len(cached_data['manual_overrides'])
            }
        
        return {
            "status": "success",
            "analytics": analytics,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Analytics failed: {str(e)}")


@app.delete("/clear_overrides", summary="Clear All Manual Overrides")
async def clear_overrides():
    """Clear all manual overrides and revert to optimization decisions."""
    try:
        if not cached_data['manual_overrides']:
            return {
                "status": "success",
                "message": "No overrides to clear",
                "timestamp": datetime.now().isoformat()
            }
        
        override_count = len(cached_data['manual_overrides'])
        cached_data['manual_overrides'].clear()
        
        # Re-run optimization without overrides
        if cached_data['optimization_results'] is not None and cached_data['train_data'] is not None:
            # Regenerate optimization results without overrides
            predictions = ml_model.predict_induction(cached_data['train_data'])
            optimization_results = optimizer.optimize_induction_list(
                cached_data['train_data'], 
                predictions, 
                target_inductions=25
            )
            cached_data['optimization_results'] = optimization_results
        
        logger.info(f"Cleared {override_count} manual overrides")
        
        return {
            "status": "success",
            "message": f"Cleared {override_count} manual overrides",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error clearing overrides: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear overrides: {str(e)}")


async def train_ml_model_background():
    """Background task to train ML model."""
    try:
        if cached_data['train_data'] is not None:
            logger.info("Training ML model in background...")
            ml_model.train_model(cached_data['train_data'])
            ml_model.save_model()
            logger.info("Background ML model training completed")
    except Exception as e:
        logger.error(f"Background ML training failed: {e}")


# Polling endpoint for real-time updates
@app.get("/poll_updates", summary="Poll for System Updates")
async def poll_updates(last_update: Optional[str] = None):
    """
    Poll for system updates since last_update timestamp.
    Used by frontend for real-time updates every 5 minutes.
    """
    try:
        current_time = datetime.now().isoformat()
        has_updates = False
        
        # Check if there are updates since last_update
        if last_update is None or cached_data['last_update'] is None:
            has_updates = True
        else:
            try:
                last_update_dt = datetime.fromisoformat(last_update)
                current_update_dt = datetime.fromisoformat(cached_data['last_update'])
                has_updates = current_update_dt > last_update_dt
            except:
                has_updates = True
        
        response = {
            "has_updates": has_updates,
            "timestamp": current_time,
            "last_data_update": cached_data['last_update'],
            "system_status": cached_data['system_status']
        }
        
        if has_updates and cached_data['optimization_results'] is not None:
            # Return summary of current state
            response.update({
                "trains_inducted": cached_data['optimization_results']['summary']['trains_inducted'],
                "trains_held": cached_data['optimization_results']['summary']['trains_held'],
                "manual_overrides_count": len(cached_data['manual_overrides'])
            })
        
        return response
        
    except Exception as e:
        logger.error(f"Error in poll_updates: {e}")
        return {
            "has_updates": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


if __name__ == "__main__":
    import uvicorn
    
    # Run the server
    uvicorn.run(
        "backend:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )