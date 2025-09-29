#!/usr/bin/env python3
"""
System startup script for KMRL Train Induction Planning System.
This script helps users start the system with proper setup.
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def check_python_version():
    """Check if Python version is adequate."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 or higher required")
        print(f"   Current version: {sys.version}")
        return False
    
    print(f"✅ Python version OK: {sys.version.split()[0]}")
    return True

def install_requirements():
    """Install required packages."""
    print("🔄 Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ All packages installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install packages: {e}")
        return False

def create_directories():
    """Create necessary directories."""
    dirs = ["logs", "mock_data", "backup_data", "exports"]
    for dir_name in dirs:
        Path(dir_name).mkdir(exist_ok=True)
    print("✅ Created necessary directories")

def start_backend():
    """Start the FastAPI backend server."""
    print("🚀 Starting FastAPI backend server...")
    try:
        # Start backend in background
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "backend:app", 
            "--reload", "--host", "0.0.0.0", "--port", "8000"
        ])
        
        # Wait a moment for server to start
        time.sleep(3)
        
        # Check if server is running
        import requests
        try:
            response = requests.get("http://localhost:8000/", timeout=5)
            if response.status_code == 200:
                print("✅ Backend server started successfully!")
                print("   API available at: http://localhost:8000")
                print("   API docs at: http://localhost:8000/docs")
                return process
            else:
                print("❌ Backend server not responding properly")
                return None
        except requests.exceptions.RequestException:
            print("❌ Backend server failed to start")
            return None
            
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        return None

def start_frontend():
    """Start the Streamlit frontend."""
    print("🚀 Starting Streamlit frontend...")
    try:
        # Start frontend
        subprocess.Popen([sys.executable, "-m", "streamlit", "run", "app.py"])
        
        time.sleep(2)
        print("✅ Frontend started successfully!")
        print("   Dashboard available at: http://localhost:8501")
        
        # Open browser automatically
        try:
            webbrowser.open("http://localhost:8501")
            print("🌐 Opening dashboard in browser...")
        except:
            print("   (Please open http://localhost:8501 in your browser)")
            
        return True
    except Exception as e:
        print(f"❌ Error starting frontend: {e}")
        return False

def main():
    """Main startup routine."""
    print("🚇 KMRL Train Induction Planning System")
    print("=" * 50)
    print("Smart India Hackathon 2024")
    print("AI-Driven Train Induction Planning for KMRL")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return
    
    # Create directories
    create_directories()
    
    # Check if requirements need to be installed
    try:
        import fastapi
        import streamlit
        import pandas
        import numpy
        import sklearn
        import pulp
        print("✅ All required packages already installed")
    except ImportError:
        print("📦 Some packages missing, installing...")
        if not install_requirements():
            return
    
    print("\n🔧 System Setup Complete!")
    print("=" * 30)
    
    # Start services
    backend_process = start_backend()
    if backend_process is None:
        print("❌ Cannot continue without backend server")
        return
    
    time.sleep(1)
    
    if start_frontend():
        print("\n🎉 System started successfully!")
        print("\n📊 Access Points:")
        print("   • Frontend Dashboard: http://localhost:8501")
        print("   • Backend API: http://localhost:8000")
        print("   • API Documentation: http://localhost:8000/docs")
        
        print("\n🛠️  To stop the system:")
        print("   • Press Ctrl+C in this terminal")
        print("   • Or close both browser tabs")
        
        try:
            # Keep the script running
            print("\n⏳ System running... Press Ctrl+C to stop")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Shutting down system...")
            backend_process.terminate()
            print("✅ System stopped")
    
if __name__ == "__main__":
    main()