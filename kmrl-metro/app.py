"""
Streamlit frontend dashboard for KMRL Train Induction Planning System.

This module provides an interactive web interface for:
- Viewing train induction recommendations
- Applying manual overrides
- Monitoring system status and analytics
- Real-time updates and refresh functionality
"""

import streamlit as st
import pandas as pd
import requests
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import time
from datetime import datetime, timedelta
import json
from typing import Dict, List, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Streamlit page
st.set_page_config(
    page_title="KMRL Train Induction Planning",
    page_icon="🚇",
    layout="wide",
    initial_sidebar_state="expanded"
)

# API Configuration
API_BASE_URL = "http://localhost:8000"

# Session state initialization
if 'last_refresh' not in st.session_state:
    st.session_state.last_refresh = None
if 'manual_overrides' not in st.session_state:
    st.session_state.manual_overrides = {}
if 'auto_refresh' not in st.session_state:
    st.session_state.auto_refresh = False
if 'selected_train' not in st.session_state:
    st.session_state.selected_train = None


def make_api_request(endpoint: str, method: str = "GET", data: Dict = None) -> Dict:
    """Make API request to backend."""
    try:
        url = f"{API_BASE_URL}{endpoint}"
        
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        elif method == "DELETE":
            response = requests.delete(url)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error ({response.status_code}): {response.text}")
            return {"status": "error", "message": response.text}
            
    except requests.exceptions.ConnectionError:
        st.error("🔌 Cannot connect to backend API. Please ensure the FastAPI server is running on localhost:8000")
        return {"status": "error", "message": "Connection failed"}
    except Exception as e:
        st.error(f"Request failed: {str(e)}")
        return {"status": "error", "message": str(e)}


def load_induction_data() -> pd.DataFrame:
    """Load current induction list from API."""
    response = make_api_request("/get_induction_list")
    
    if response.get("status") == "success":
        return pd.DataFrame(response["induction_list"])
    else:
        return pd.DataFrame()


def get_system_status() -> Dict:
    """Get current system status from API."""
    return make_api_request("/status")


def refresh_all_data():
    """Refresh all data in the system."""
    with st.spinner("🔄 Refreshing all data..."):
        response = make_api_request("/refresh_data")
        
        if response.get("status") == "success":
            st.success("✅ Data refreshed successfully!")
            st.session_state.last_refresh = datetime.now()
        else:
            st.error("❌ Failed to refresh data")
        
        time.sleep(1)  # Brief pause for user feedback


def apply_manual_override(train_id: str, decision: int, reason: str = "Manual override"):
    """Apply manual override for a train."""
    data = {
        "train_id": train_id,
        "decision": decision,
        "reason": reason
    }
    
    response = make_api_request("/override_train", method="POST", data=data)
    
    if response.get("status") == "success":
        st.success(f"✅ Override applied for {train_id}")
        st.session_state.manual_overrides[train_id] = decision
        return True
    else:
        st.error(f"❌ Failed to apply override for {train_id}")
        return False


def clear_all_overrides():
    """Clear all manual overrides."""
    response = make_api_request("/clear_overrides", method="DELETE")
    
    if response.get("status") == "success":
        st.success("✅ All overrides cleared")
        st.session_state.manual_overrides.clear()
        return True
    else:
        st.error("❌ Failed to clear overrides")
        return False


def create_fitness_chart(df: pd.DataFrame) -> go.Figure:
    """Create fitness score distribution chart."""
    if df.empty:
        return go.Figure().add_annotation(text="No data available", showarrow=False)
    
    # Create bar chart with color coding
    colors = ['#2E8B57' if decision == 'Induct' else '#DC143C' 
              for decision in df['final_decision']]
    
    fig = go.Figure(data=[
        go.Bar(
            x=df['train_id'],
            y=df['fitness_score'],
            marker_color=colors,
            text=df['fitness_score'].round(1),
            textposition='auto',
        )
    ])
    
    fig.update_layout(
        title="Train Fitness Scores",
        xaxis_title="Train ID",
        yaxis_title="Fitness Score",
        height=400,
        showlegend=False
    )
    
    # Add horizontal line for minimum fitness threshold
    fig.add_hline(y=70, line_dash="dash", line_color="orange", 
                  annotation_text="Minimum Fitness Threshold")
    
    return fig


def create_depot_distribution_chart(df: pd.DataFrame) -> go.Figure:
    """Create depot distribution pie chart."""
    if df.empty:
        return go.Figure().add_annotation(text="No data available", showarrow=False)
    
    depot_counts = df['depot'].value_counts()
    
    fig = go.Figure(data=[
        go.Pie(
            labels=depot_counts.index,
            values=depot_counts.values,
            hole=0.3,
            textinfo='label+percent',
            textposition='auto'
        )
    ])
    
    fig.update_layout(
        title="Train Distribution by Depot",
        height=400
    )
    
    return fig


def create_decision_summary_chart(df: pd.DataFrame) -> go.Figure:
    """Create decision summary chart."""
    if df.empty:
        return go.Figure().add_annotation(text="No data available", showarrow=False)
    
    decision_counts = df['final_decision'].value_counts()
    
    fig = go.Figure(data=[
        go.Bar(
            x=decision_counts.index,
            y=decision_counts.values,
            marker_color=['#2E8B57', '#DC143C'],
            text=decision_counts.values,
            textposition='auto'
        )
    ])
    
    fig.update_layout(
        title="Induction Decision Summary",
        xaxis_title="Decision",
        yaxis_title="Number of Trains",
        height=300,
        showlegend=False
    )
    
    return fig


def format_reasoning(reasoning: str) -> str:
    """Format reasoning text for better display."""
    if not reasoning:
        return "No reasoning available"
    
    # Add emojis based on content
    if "fitness score" in reasoning.lower():
        reasoning = "💪 " + reasoning
    elif "work orders" in reasoning.lower():
        reasoning = "🔧 " + reasoning
    elif "certificate" in reasoning.lower():
        reasoning = "📋 " + reasoning
    elif "manual override" in reasoning.lower():
        reasoning = "👤 " + reasoning
    
    return reasoning


def main():
    """Main Streamlit application."""
    
    # Header
    st.title("🚇 KMRL Train Induction Planning System")
    st.markdown("*AI-driven train induction planning for Kochi Metro Rail Limited*")
    
    # Sidebar
    st.sidebar.title("🎛️ Control Panel")
    
    # System status in sidebar
    with st.sidebar.expander("📊 System Status", expanded=True):
        status_data = get_system_status()
        
        if status_data.get("status") == "running":
            st.success("🟢 System Running")
        else:
            st.error(f"🔴 System Status: {status_data.get('status', 'Unknown')}")
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Trains", status_data.get("trains_count", 0))
        with col2:
            st.metric("Overrides", status_data.get("manual_overrides_count", 0))
        
        if status_data.get("last_update"):
            last_update = datetime.fromisoformat(status_data["last_update"]).strftime("%H:%M:%S")
            st.caption(f"Last Update: {last_update}")
    
    # Control buttons in sidebar
    st.sidebar.markdown("### 🔄 Data Operations")
    
    if st.sidebar.button("🔄 Refresh All Data", type="primary"):
        refresh_all_data()
        st.rerun()
    
    if st.sidebar.button("🤖 Generate New Predictions"):
        with st.spinner("🧠 Generating ML predictions..."):
            response = make_api_request("/predict_induction", method="POST", 
                                      data={"use_mock_data": True, "retrain_model": False})
            if response.get("status") == "success":
                st.success("✅ Predictions generated!")
            else:
                st.error("❌ Failed to generate predictions")
        st.rerun()
    
    if st.sidebar.button("🧹 Clear All Overrides"):
        if clear_all_overrides():
            st.rerun()
    
    # Auto-refresh toggle
    st.sidebar.markdown("### ⚡ Auto-Refresh")
    auto_refresh = st.sidebar.checkbox("Enable Auto-Refresh (5 min)", value=st.session_state.auto_refresh)
    st.session_state.auto_refresh = auto_refresh
    
    if auto_refresh:
        # Auto-refresh every 5 minutes
        time.sleep(300)  # 5 minutes
        st.rerun()
    
    # Main content area
    # Load data
    df = load_induction_data()
    
    if df.empty:
        st.warning("⚠️ No induction data available. Please refresh data first.")
        st.stop()
    
    # Key metrics row
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        inducted_count = len(df[df['final_decision'] == 'Induct'])
        st.metric("🟢 Trains to Induct", inducted_count)
    
    with col2:
        held_count = len(df[df['final_decision'] == 'Hold'])
        st.metric("🔴 Trains to Hold", held_count)
    
    with col3:
        avg_fitness = df['fitness_score'].mean()
        st.metric("💪 Average Fitness", f"{avg_fitness:.1f}")
    
    with col4:
        issues_count = df['open_work_orders'].sum()
        st.metric("🔧 Active Work Orders", int(issues_count))
    
    # Charts row
    col1, col2 = st.columns(2)
    
    with col1:
        fitness_chart = create_fitness_chart(df)
        st.plotly_chart(fitness_chart, use_container_width=True)
    
    with col2:
        depot_chart = create_depot_distribution_chart(df)
        st.plotly_chart(depot_chart, use_container_width=True)
    
    # Decision summary chart
    decision_chart = create_decision_summary_chart(df)
    st.plotly_chart(decision_chart, use_container_width=True)
    
    # Main data table
    st.markdown("## 📋 Train Induction List")
    
    # Filter options
    col1, col2, col3 = st.columns(3)
    
    with col1:
        decision_filter = st.selectbox("Filter by Decision", 
                                     ["All", "Induct", "Hold"], 
                                     key="decision_filter")
    
    with col2:
        depot_filter = st.selectbox("Filter by Depot", 
                                  ["All"] + list(df['depot'].unique()), 
                                  key="depot_filter")
    
    with col3:
        fitness_threshold = st.slider("Minimum Fitness Score", 
                                    min_value=0, max_value=100, value=0, 
                                    key="fitness_threshold")
    
    # Apply filters
    filtered_df = df.copy()
    
    if decision_filter != "All":
        filtered_df = filtered_df[filtered_df['final_decision'] == decision_filter]
    
    if depot_filter != "All":
        filtered_df = filtered_df[filtered_df['depot'] == depot_filter]
    
    if fitness_threshold > 0:
        filtered_df = filtered_df[filtered_df['fitness_score'] >= fitness_threshold]
    
    # Display table with colors
    def color_decision(val):
        if val == 'Induct':
            return 'background-color: #90EE90'  # Light green
        elif val == 'Hold':
            return 'background-color: #FFB6C1'  # Light red
        return ''
    
    # Style the dataframe
    display_df = filtered_df[['train_id', 'final_decision', 'fitness_score', 'depot', 
                            'mileage', 'open_work_orders', 'cert_valid', 'reasoning']].copy()
    
    display_df.columns = ['Train ID', 'Decision', 'Fitness', 'Depot', 
                         'Mileage', 'Work Orders', 'Cert Valid', 'Reasoning']
    
    # Format reasoning for display
    display_df['Reasoning'] = display_df['Reasoning'].apply(format_reasoning)
    
    styled_df = display_df.style.applymap(color_decision, subset=['Decision'])
    st.dataframe(styled_df, use_container_width=True, height=400)
    
    # Manual override section
    st.markdown("## 👤 Manual Overrides")
    
    with st.expander("Apply Manual Override", expanded=False):
        col1, col2, col3 = st.columns(3)
        
        with col1:
            train_options = df['train_id'].tolist()
            selected_train = st.selectbox("Select Train", train_options, key="override_train")
        
        with col2:
            override_decision = st.selectbox("Override Decision", 
                                           ["Induct", "Hold"], 
                                           key="override_decision")
        
        with col3:
            override_reason = st.text_input("Reason", 
                                          value="Manual override by operator", 
                                          key="override_reason")
        
        if st.button("Apply Override", type="primary"):
            decision_value = 1 if override_decision == "Induct" else 0
            if apply_manual_override(selected_train, decision_value, override_reason):
                st.rerun()
    
    # What-if analysis section
    st.markdown("## 🔮 What-If Analysis")
    
    with st.expander("Scenario Analysis", expanded=False):
        st.markdown("Analyze different scenarios by adjusting parameters:")
        
        col1, col2 = st.columns(2)
        
        with col1:
            target_inductions = st.slider("Target Inductions", 
                                        min_value=15, max_value=35, value=25,
                                        key="whatif_target")
        
        with col2:
            fitness_threshold_whatif = st.slider("Minimum Fitness for Induction", 
                                                min_value=60, max_value=90, value=70,
                                                key="whatif_fitness")
        
        if st.button("Run What-If Analysis"):
            with st.spinner("🔮 Running scenario analysis..."):
                # This would call the API with different parameters
                st.info("What-if analysis feature coming soon!")
    
    # Train details modal
    if st.session_state.selected_train:
        train_id = st.session_state.selected_train
        
        # Get detailed train information
        response = make_api_request(f"/get_train_details/{train_id}")
        
        if response.get("status") == "success":
            train_details = response["train_details"]
            
            st.markdown(f"## 🚂 Train Details: {train_id}")
            
            # Display detailed information
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Fitness Score", f"{train_details.get('fitness_score', 0):.1f}")
                st.metric("Mileage", f"{train_details.get('mileage', 0):,} km")
            
            with col2:
                st.metric("Days Since Maintenance", train_details.get('days_since_maintenance', 0))
                st.metric("Branding Hours", train_details.get('branding_hours', 0))
            
            with col3:
                st.metric("Open Work Orders", train_details.get('open_work_orders', 0))
                cert_status = "✅ Valid" if train_details.get('cert_valid', False) else "❌ Invalid"
                st.metric("Certificate Status", cert_status)
            
            # ML prediction details
            if 'ml_probability' in train_details:
                st.markdown("### 🧠 ML Model Analysis")
                col1, col2 = st.columns(2)
                
                with col1:
                    prob = train_details['ml_probability']
                    st.metric("ML Probability", f"{prob:.3f}")
                
                with col2:
                    confidence = train_details['ml_confidence']
                    st.metric("Confidence", f"{confidence:.3f}")
            
            # Sensor data if available
            if 'sensor_data' in train_details:
                st.markdown("### 📊 Sensor Data")
                sensor_data = train_details['sensor_data']
                
                # Display sensor readings in columns
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.markdown("**Temperatures**")
                    temps = sensor_data.get('temperatures', {})
                    st.write(f"Engine: {temps.get('engine', 0)}°C")
                    st.write(f"Brake: {temps.get('brake', 0)}°C")
                    st.write(f"Cabin: {temps.get('cabin', 0)}°C")
                
                with col2:
                    st.markdown("**Vibrations**")
                    vibs = sensor_data.get('vibrations', {})
                    st.write(f"Engine: {vibs.get('engine', 0)}g")
                    st.write(f"Axle: {vibs.get('axle', 0)}g")
                
                with col3:
                    st.markdown("**Electrical**")
                    elec = sensor_data.get('electrical', {})
                    st.write(f"Voltage: {elec.get('voltage', 0)}V")
                    st.write(f"Current: {elec.get('current', 0)}A")
    
    # Footer
    st.markdown("---")
    st.markdown("*KMRL Train Induction Planning System v1.0 - Powered by AI & Optimization*")
    
    # Display current time
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    st.caption(f"Last updated: {current_time}")


if __name__ == "__main__":
    main()