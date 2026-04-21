@echo off
echo.
echo  ====================================
echo   IntelliCrash — Starting All Services
echo  ====================================
echo.

echo [1/2] Starting FastAPI Backend (port 8000)...
start "IntelliCrash Backend" cmd /k "cd python && python api.py"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo [2/2] Starting React Frontend (port 5173)...
start "IntelliCrash Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo  ====================================
echo   App running at: http://localhost:5173
echo   API running at: http://localhost:8000
echo  ====================================
echo.
pause
