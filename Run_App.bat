@echo off
echo ===========================================
echo  AgriSmart Startup Script
echo  Starting both Backend and Frontend...
echo ===========================================

cd /d "%~dp0"

echo Starting Backend Server...
start "AgriSmart Backend" cmd /k "start_backend.bat"

echo Starting Frontend Server...
start "AgriSmart Frontend" cmd /k "start_frontend.bat"

echo.
echo Both servers have been started in separate windows!
echo Please keep those black terminal windows open while you use the app.
echo.
pause
