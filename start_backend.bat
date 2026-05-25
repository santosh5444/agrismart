@echo off
cd /d "%~dp0backend"
echo ===================================
echo  Starting Backend Server on :8000
echo ===================================
python -m pip install fastapi uvicorn[standard] pandas scikit-learn joblib bcrypt python-jose[cryptography] python-multipart pydantic 2>&1
echo ---
echo Starting Uvicorn server...
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
pause
