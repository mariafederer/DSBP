#!/bin/bash

echo "========================================"
echo "  DSBP - Database Reset Tool"
echo "========================================"
echo ""

# Activate virtual environment
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
else
    echo "Error: Virtual environment not found!"
    echo "Please run: python3 -m venv .venv"
    exit 1
fi

echo "Resetting database..."
echo ""

# Delete old database
if [ -f "data/dsbp.db" ]; then
    echo "Found old database file. Deleting..."
    rm "data/dsbp.db"
    echo "Old database deleted."
else
    echo "No old database found."
fi

echo ""
echo "Creating new database with updated schema..."
python -c "from app.core.database import Base, engine; import app.models; Base.metadata.create_all(bind=engine); print('✓ Database created successfully!')"

echo ""
echo "========================================"
echo "  Database Reset Complete!"
echo "========================================"
echo ""
echo "You can now start the server:"
echo "  ./start.sh"
echo ""

