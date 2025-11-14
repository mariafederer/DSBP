@echo off
REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Verify register.html exists
if not exist "register.html" (
    echo ERROR: register.html not found in current directory!
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo Starting frontend server...
echo Current directory: %CD%
echo.
echo Frontend URL: http://localhost:3000
echo Register page: http://localhost:3000/register.html
echo Login page: http://localhost:3000/login.html
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start Python HTTP server
python -m http.server 3000

pause

