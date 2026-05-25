@echo off
setlocal
cd /d "%~dp0"

echo ===========================================
2: echo  AgriSmart Ultimate Runner
3: echo  Starting Backend and Frontend...
echo ===========================================

:: Kill potential zombie processes
echo Cleaning up existing processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
echo Done.

:: Start Backend
echo Starting Backend Server (Port 8000)...
start "AgriSmart Backend" cmd /c "cd /d backend && python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"

:: Start Frontend
echo Starting Frontend Server (Port 5173)...
start "AgriSmart Frontend" cmd /c "npm run dev"

echo.
echo ========================================================
echo  SUCCESS: Both servers are starting up.
echo  - Frontend: http://localhost:5173
echo  - Backend: http://127.0.0.1:8000
echo ========================================================
echo.
echo Please keep the terminal windows open if you see them.
pause
