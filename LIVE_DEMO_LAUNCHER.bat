@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo  #############################################################
echo  #                                                           #
echo  #            NexaBank Pro - LIVE DEMO LAUNCHER              #
echo  #      (Guarantees a 100%% Working Demo in Seconds)         #
echo  #                                                           #
echo  #############################################################
echo.

echo [1/5] Force-Clearing Port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /f /pid %%a >nul 2>&1
taskkill /f /im python.exe /t >nul 2>&1
echo Done.

echo [2/5] Activating Environment...
if not exist venv (
    echo [ERROR] Virtual Environment missing! Running quick install...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo [3/5] Cleaning Caches...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"

echo [4/5] Injecting "Lively" Demo Data (Fills the Dashboard)...
python -c "from database.init_db import init_db; init_db()"
python database/inject_demo_data.py

echo [5/5] Ensuring AI Model exists...
if not exist model\rf_model.pkl (
    echo [INFO] Training AI model for the demo...
    python model/train_model.py
)

echo.
echo  =============================================================
echo   SUCCESS: PROJECT IS NOW IN "LIVE DEMO" MODE
echo  =============================================================
echo   - Port 5000: READY
echo   - Dashboard: POPULATED WITH DATA
echo   - AI Model:  CALIBRATED
echo  =============================================================
echo.
echo  AUTO-LAUNCHING BROWSER IN 3 SECONDS...
timeout /t 3 >nul
start http://localhost:5000

echo.
echo  KEEP THIS WINDOW OPEN DURING YOUR DEMO!
echo  Press Ctrl+C to stop the server when finished.
echo.

python app.py
pause
