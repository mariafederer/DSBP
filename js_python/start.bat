@echo off
echo ========================================
echo   DSBP - Digital Software Building Platform
echo ========================================
echo.

REM Check if virtual environment exists
if not exist ".venv" (
    echo [1/3] Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo [2/3] Activating virtual environment...
call .venv\Scripts\activate.bat

REM Check if dependencies are installed
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo [3/3] Installing dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo [3/3] Dependencies already installed
)

echo.
echo ========================================
echo   Starting DSBP Server...
echo ========================================
echo.
echo   Application URL: http://localhost:8000
echo   API Documentation: http://localhost:8000/docs
echo.
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

