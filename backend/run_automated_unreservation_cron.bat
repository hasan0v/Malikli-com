@echo off
REM Production Automated Unreservation Cron Job for Windows
REM This script runs the automated unreservation every 5 minutes

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%
set VENV_DIR=%BACKEND_DIR%\venv
set PYTHON_EXE=%VENV_DIR%\Scripts\python.exe
set UNRESERVATION_SCRIPT=%BACKEND_DIR%\automated_unreservation_standalone.py
set LOG_FILE=%BACKEND_DIR%\automated_unreservation_cron.log

REM Check if virtual environment exists
if not exist "%PYTHON_EXE%" (
    echo [%date% %time%] ERROR: Virtual environment not found at %VENV_DIR% >> "%LOG_FILE%"
    exit /b 1
)

REM Check if unreservation script exists
if not exist "%UNRESERVATION_SCRIPT%" (
    echo [%date% %time%] ERROR: Unreservation script not found at %UNRESERVATION_SCRIPT% >> "%LOG_FILE%"
    exit /b 1
)

REM Change to backend directory
cd /d "%BACKEND_DIR%"

REM Run the unreservation script
echo [%date% %time%] Starting automated unreservation cron job >> "%LOG_FILE%"

"%PYTHON_EXE%" "%UNRESERVATION_SCRIPT%" --max-age-minutes 15 >> "%LOG_FILE%" 2>&1

if errorlevel 1 (
    echo [%date% %time%] ERROR: Unreservation script failed with exit code %errorlevel% >> "%LOG_FILE%"
    exit /b 1
) else (
    echo [%date% %time%] Unreservation script completed successfully >> "%LOG_FILE%"
)

exit /b 0
