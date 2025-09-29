@echo off
echo 🚇 KMRL Train Induction Planning System - Installation
echo =====================================================

echo.
echo 1. Installing Python packages...
pip install -r requirements.txt

echo.
echo 2. Creating necessary directories...
mkdir logs 2>nul
mkdir mock_data 2>nul
mkdir backup_data 2>nul
mkdir exports 2>nul

echo.
echo ✅ Installation completed!
echo.
echo 🚀 To start the system:
echo    1. Run: python start_system.py
echo    2. Or manually start:
echo       - Backend:  uvicorn backend:app --reload
echo       - Frontend: streamlit run app.py
echo.
pause