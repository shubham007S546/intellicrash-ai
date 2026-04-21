@echo off
title IntelliCrash — One-Click Setup
color 0A
echo.
echo ============================================
echo   IntelliCrash AI Road Safety Platform
echo   One-Click Setup for Windows
echo   Admin: 9015162007 / shubhamabhi004@gmail.com
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Download from https://python.org
    echo Make sure to check "Add Python to PATH" during install.
    pause & exit /b 1
)
echo [OK] Python found

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Download from https://nodejs.org
    pause & exit /b 1
)
echo [OK] Node.js found

echo.
echo [1/4] Installing Python dependencies...
cd /d "%~dp0python"
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed. Try: pip install -r requirements.txt
    pause & exit /b 1
)
echo [OK] Python dependencies installed

echo.
echo [2/4] Installing Node.js dependencies...
cd /d "%~dp0frontend"
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause & exit /b 1
)
echo [OK] Node.js dependencies installed

echo.
echo [3/4] Starting backend API...
cd /d "%~dp0python"
start "IntelliCrash Backend" cmd /k "title IntelliCrash API && python api.py"
timeout /t 4 /nobreak >nul
echo [OK] Backend starting at http://localhost:8000

echo.
echo [4/4] Starting frontend...
cd /d "%~dp0frontend"
start "IntelliCrash Frontend" cmd /k "title IntelliCrash UI && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo   SETUP COMPLETE!
echo ============================================
echo.
echo   App:      http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo   Admin:    http://localhost:5173/admin
echo.
echo   Opening app in browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo NOTE: Your .pkl model files must be in intellicrash\python\
echo       Files needed:
echo         - best_random_forest_model.pkl
echo         - feature_scaler.pkl
echo         - target_encoder.pkl
echo         - label_encoders.pkl
echo         - feature_names.pkl
echo         - (optional) intellicrash_lstm_model.h5
echo.
echo   For LSTM support: pip install tensorflow==2.16.1
echo   For Gmail SOS: Set GMAIL_PASS in python\.env (App Password)
echo   For SMS SOS: Verify +919015162007 at console.twilio.com
echo.
pause
