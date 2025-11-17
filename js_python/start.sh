#!/bin/bash

echo "========================================"
echo "  DSBP - Digital Software Building Platform"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "[1/3] Creating virtual environment..."
    python3 -m venv .venv
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to create virtual environment"
        exit 1
    fi
fi

echo "[2/3] Activating virtual environment..."
source .venv/bin/activate

# Check if dependencies are installed
python -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[3/3] Installing dependencies..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
else
    echo "[3/3] Dependencies already installed"
fi

echo ""
echo "========================================"
echo "  Starting DSBP Server..."
echo "========================================"
echo ""
echo "  Application URL: http://localhost:8000"
echo "  API Documentation: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop the server"
echo "========================================"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000

