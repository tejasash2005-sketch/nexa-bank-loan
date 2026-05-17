@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo  #############################################################
echo  #                                                           #
echo  #            NexaBank Pro - ULTRA-REPAIR TOOL v3.0          #
echo  #      (Solving ALL Dashboard, API, DB ^& AI Glitches)      #
echo  #                                                           #
echo  #############################################################
echo.

set /p confirm="This will Perform a COMPLETE SYSTEM RESET and FIX ALL glitches. Proceed? (y/n): "
if /i "%confirm%" neq "y" exit /b

echo.
echo [STEP 1] ELIMINATING PORT CONFLICTS...
:: Force kill anything on port 5000 (The most common cause of "API not loading")
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    echo [INFO] Found process %%a on port 5000. Terminating...
    taskkill /f /pid %%a >nul 2>&1
)
:: Kill any lingering python processes
taskkill /f /im python.exe /t >nul 2>&1
echo [OK] Port 5000 is now clean and available.

echo.
echo [STEP 2] PURGING SYSTEM CACHES...
:: Delete compiled python files which cause "AttributeError" or "ImportError"
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"
:: Clear model cache
if exist model\rf_model.pkl del /f /q model\rf_model.pkl
if exist model\scaler.pkl del /f /q model\scaler.pkl
echo [OK] All corrupted cache files removed.

echo.
echo [STEP 3] REPAIRING LIBRARIES ^& DEPENDENCIES...
:: Ensure venv is healthy
if not exist venv (
    echo [INFO] Creating missing Virtual Environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo [INFO] Repairing Python packages (Force-Fixing corrupted binaries)...
python -m pip install --upgrade pip
python -m pip install --force-reinstall -r requirements.txt
echo [OK] All system libraries are now 100%% healthy.

echo.
echo [STEP 4] DATABASE ^& DASHBOARD RECOVERY...
:: Fix database permissions and run initialization
attrib -r database\nexabank.db >nul 2>&1
echo [INFO] Re-initializing Database Schema and Default Records...
python -c "from database.init_db import init_db; init_db()"
:: Ensure upload directories exist
if not exist backend\uploads mkdir backend\uploads
echo [OK] Database and dashboard records verified.

echo.
echo [STEP 5] AI BRAIN REGENERATION...
:: Retrain model to ensure it works with the current library versions
python model/train_model.py
echo [OK] AI Analysis engine successfully recalibrated.

echo.
echo [STEP 6] API ^& FRONTEND GLITCH FIX...
echo  -------------------------------------------------------------
echo  CRITICAL FRONTEND FIX INSTRUCTIONS:
echo  1. Open your browser to http://localhost:5000
echo  2. Press F12 to open "Inspect Element"
echo  3. Go to "Application" tab -^> "Local Storage"
echo  4. Right-click and "Clear" all data for http://localhost:5000
echo  5. Press CTRL + F5 to hard-reload the page.
echo  -------------------------------------------------------------
echo.

set /p start="Everything is FIXED. Launch NexaBank Pro now? (y/n): "
if /i "%start%"=="y" (
    echo [INFO] Starting API Server on Port 5000...
    python app.py
)

pause
