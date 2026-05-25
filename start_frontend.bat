@echo off
cd /d "%~dp0"
echo ===================================
echo  Starting Frontend on :5173
echo ===================================
echo Checking dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed. Is Node.js installed?
    pause
    exit /b 1
)
echo.
echo Starting Vite dev server...
call npm run dev
pause
