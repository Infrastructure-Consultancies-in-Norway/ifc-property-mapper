@echo off
setlocal

REM ─────────────────────────────────────────────────────────────────────────────
REM  IFC Property Mapper – dev launcher
REM  Double-click this file from E:\Github\IfcSnacks\ifc-property-mapper
REM ─────────────────────────────────────────────────────────────────────────────

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "PYTHON=%BACKEND%\.venv\Scripts\python.exe"

REM ── Sanity checks ────────────────────────────────────────────────────────────

if not exist "%PYTHON%" (
    echo [ERROR] Python venv not found at:
    echo         %PYTHON%
    echo Please run: python -m venv backend\.venv ^&^& backend\.venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

if not exist "%FRONTEND%\node_modules" (
    echo [ERROR] Frontend node_modules missing.
    echo Please run: cd frontend ^&^& npm install
    pause
    exit /b 1
)

REM ── Launch backend ────────────────────────────────────────────────────────────

echo Starting backend  (http://localhost:8000) ...
start "IFC Mapper – Backend" cmd /k "cd /d "%BACKEND%" && "%PYTHON%" -m uvicorn app.main:app --reload --port 8000"

REM ── Small delay so backend has a moment to start ─────────────────────────────

timeout /t 2 /nobreak >nul

REM ── Launch frontend ───────────────────────────────────────────────────────────

echo Starting frontend (http://localhost:5173) ...
start "IFC Mapper – Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

REM ── Open browser after a short pause ─────────────────────────────────────────

echo.
echo Both servers starting – opening browser in 4 seconds...
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

endlocal
