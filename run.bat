@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo  NexaBank Pro - AI Loan Portal (Full Stack)
echo =============================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] 'python' command not found. Trying 'py'...
    py --version >nul 2>&1
    if !errorlevel! neq 0 (
        echo [ERROR] Python not found! Please install Python 3.9+ and add it to PATH.
        pause
        exit /b 1
    ) else (
        set PY_CMD=py
    )
) else (
    set PY_CMD=python
)

:: 2. Virtual environment
if not exist venv (
    echo [INFO] Creating virtual environment...
    !PY_CMD! -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

:: 3. Activate
echo [INFO] Activating virtual environment...
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo [ERROR] venv\Scripts\activate.bat not found.
    echo Please delete the 'venv' folder and run this again.
    pause
    exit /b 1
)

:: 4. Dependencies
echo [INFO] Checking/Installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies.
    echo Please check your internet connection or requirements.txt
    pause
    exit /b 1
)

:: 5. Init (handled by app.py, but doing a quick check here doesn't hurt)
if not exist backend\uploads mkdir backend\uploads

echo.
echo  App URL : http://localhost:5000
echo  Admin   : admin / admin123
echo  User    : user  / user123
echo  -----------------------------------
echo  Starting NexaBank Pro Server...
echo.

:: 6. Run
python app.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Application crashed or failed to start.
    echo Check the error message above for details.
    pause
)

pause
