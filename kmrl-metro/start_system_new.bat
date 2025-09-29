@echo off
echo 🚇 KMRL Train Induction Planning System - Updated Startup
echo =========================================================

echo.
echo 🚀 Starting Backend Server...
start "KMRL Backend" cmd /k "cd /d %~dp0 && python -m uvicorn backend:app --reload --host 0.0.0.0 --port 8000"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo 🎨 Starting React Frontend...
start "KMRL Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo 🎉 System is starting up!
echo.
echo 📊 Access Points:
echo    Frontend Dashboard: http://localhost:3000 (or http://localhost:3002 if 3000 is busy)
echo    Backend API: http://localhost:8000
echo    API Documentation: http://localhost:8000/docs
echo.
echo ✅ Check the red banner on the frontend to confirm Tailwind CSS is working!
echo.
echo ⏹️ To stop the system, close both command windows
echo.
pause