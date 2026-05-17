#!/bin/bash

echo "============================================="
echo " NexaBank Pro - MASTER REPAIR & RESCUE TOOL"
echo "============================================="
echo "This script will force-fix common issues:"
echo "1. Stops stuck Python processes"
echo "2. Refreshes Virtual Environment"
echo "3. Re-installs all requirements"
echo "4. Re-initializes Database Schema"
echo "5. Re-trains the AI Model"
echo "6. Clears Python Cache"
echo "============================================="
echo ""

read -p "Proceed with Deep Repair? (y/n): " choice
if [[ $choice != "y" ]]; then
    exit 0
fi

echo "[1/6] Stopping stuck servers..."
pkill -f "python app.py" > /dev/null 2>&1
echo "Done."

echo "[2/6] Cleaning caches..."
find . -type d -name "__pycache__" -exec rm -rf {} +
echo "Done."

echo "[3/6] Refreshing Virtual Environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "[4/6] Verifying Database..."
python3 -c "from database.init_db import init_db; init_db()"
mkdir -p backend/uploads
echo "Done."

echo "[5/6] Re-training AI Model..."
python3 model/train_model.py
echo "Done."

echo "[6/6] Repair Complete!"
echo ""
echo "If frontend issues persist, clear your browser cache/localStorage."
echo ""

read -p "Start the server now? (y/n): " start
if [[ $start == "y" ]]; then
    python3 app.py
fi
