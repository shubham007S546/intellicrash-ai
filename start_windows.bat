@echo off
title IntelliCrash - AI Safe Navigation
color 0A
echo.
echo  ============================================
echo    IntelliCrash  -  AI Safe Navigation v2.0
echo  ============================================
echo.
echo  [1/2] Starting FastAPI Backend on port 8000...
start "IntelliCrash Backend" cmd /k "cd /d %~dp0python && pip install -r requirements.txt -q && python api.py"
echo  Backend starting... waiting 5 seconds
timeout /t 5 /nobreak >nul
echo.
echo  [2/2] Starting React Frontend on port 5173...
start "IntelliCrash Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"
echo.
echo  ============================================
echo   App  :  http://localhost:5173
echo   API  :  http://localhost:8000
echo   Docs :  http://localhost:8000/docs
echo  ============================================
echo.
echo  Both windows opened. Press any key to exit this launcher.
pause >nul
