#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#   NexaBank Pro — Full Stack Setup & Run Script
# ═══════════════════════════════════════════════════════════════════

set -e

echo ""
echo "🏦 ══════════════════════════════════════════════"
echo "   NexaBank Pro — AI Loan Portal (Full Stack)"
echo "════════════════════════════════════════════════"
echo ""

# 1. Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 not found. Please install Python 3.9+"
  exit 1
fi
echo "✅ Python $(python3 --version)"

# 2. Virtual environment
if [ ! -d "venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate
echo "✅ Virtual environment activated"

# 3. Install dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt
echo "✅ Dependencies installed"

# 4. Initialize database
echo "🗄️  Initializing database..."
python3 -c "
import sys, os
sys.path.insert(0, os.getcwd())
from database.init_db import init_db
init_db()
"
echo "✅ Database ready"

# 5. Train ML model if needed
if [ ! -f "model/rf_model.pkl" ]; then
  echo "🤖 Training ML model (one-time ~30 seconds)..."
  python3 -c "
import sys, os
sys.path.insert(0, os.getcwd())
from model.train_model import train
train()
"
  echo "✅ ML model trained"
fi

# 6. Create uploads dir
mkdir -p backend/uploads

echo ""
echo "🚀 ══════════════════════════════════════════════"
echo "   Starting NexaBank Pro Server..."
echo "════════════════════════════════════════════════"
echo ""
echo "   🌐 App URL  : http://localhost:5000"
echo "   📖 API URL  : http://localhost:5000/api"
echo "   🏦 Admin    : admin / admin123"
echo "   👤 User     : user / user123"
echo ""
echo "   Press Ctrl+C to stop"
echo "════════════════════════════════════════════════"
echo ""

python3 app.py
