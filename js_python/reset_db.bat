@echo off
echo ========================================
echo   DSBP - Database Reset Tool
echo ========================================
echo.

REM Activate virtual environment
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else (
    echo Error: Virtual environment not found!
    echo Please run: python -m venv .venv
    pause
    exit /b 1
)

echo Resetting database...
echo.

REM Delete old database
if exist "data\dsbp.db" (
    echo Found old database file. Deleting...
    del "data\dsbp.db"
    echo Old database deleted.
) else (
    echo No old database found.
)

echo.
echo Creating new database with updated schema...
python -c "from app.database import Base, engine; from app import models; Base.metadata.create_all(bind=engine); print('✓ Database created successfully!')"

echo.
echo ========================================
echo   Database Reset Complete!
echo ========================================
echo.
echo You can now start the server:
echo   start.bat
echo.
pause

