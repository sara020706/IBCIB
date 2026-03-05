@echo off
title IBCIB - Starting Application
echo ============================================
echo   IBCIB - Indigenous Breed Classifier
echo ============================================
echo.

:: ── Figure out the directory this bat file lives in ──
set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

:: ── 1. Install Python dependencies ─────────────────
echo [1/4] Installing Python dependencies...
pip install -r "%BACKEND%\requirements.txt"
if %errorlevel% neq 0 (
    echo ERROR: pip install failed. Make sure Python and pip are in your PATH.
    pause
    exit /b 1
)
echo Done.
echo.

:: ── 2. Install Node dependencies ───────────────────
echo [2/4] Installing Node dependencies...
cd /d "%FRONTEND%"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed. Make sure Node.js is installed.
    pause
    exit /b 1
)
echo Done.
echo.

:: ── 3. Start FastAPI backend in a new window ───────
echo [3/4] Starting FastAPI backend on http://localhost:8000 ...
start "IBCIB Backend" cmd /k "cd /d "%BACKEND%" && uvicorn api:app --reload --port 8000"

:: Give the backend a moment to begin loading the model
timeout /t 3 /nobreak >nul

:: ── 4. Start Vite frontend in a new window ─────────
echo [4/4] Starting frontend on http://localhost:5173 ...
start "IBCIB Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo ============================================
echo   Both servers are starting in new windows.
echo   Open http://localhost:5173 in your browser
echo   once the frontend window shows "ready".
echo ============================================
echo.
pause
