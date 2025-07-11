@echo off
REM Setup script for inventory and payment monitoring automation (Windows)
REM This script sets up scheduled tasks for automated inventory management

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%..\backend"
set "PYTHON_EXEC=python"

echo 🚀 Setting up Malikli.com Inventory Monitoring System
echo Backend directory: %BACKEND_DIR%

REM Check if we're in the right directory
if not exist "%BACKEND_DIR%\manage.py" (
    echo ❌ Error: manage.py not found in %BACKEND_DIR%
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

echo ✅ Django project found

REM Test management commands
echo 🧪 Testing management commands...

echo   Testing cleanup_expired_reservations...
cd /d "%BACKEND_DIR%"
%PYTHON_EXEC% manage.py cleanup_expired_reservations --dry-run

if errorlevel 1 (
    echo   ❌ cleanup_expired_reservations failed
    pause
    exit /b 1
) else (
    echo   ✅ cleanup_expired_reservations working
)

echo   Testing check_pending_payments...
%PYTHON_EXEC% manage.py check_pending_payments --dry-run --max-age-hours 1

if errorlevel 1 (
    echo   ❌ check_pending_payments failed
    pause
    exit /b 1
) else (
    echo   ✅ check_pending_payments working
)

REM Create monitoring scripts
echo 📝 Creating monitoring scripts...

REM Create cleanup script
echo @echo off > "%SCRIPT_DIR%cleanup-reservations.bat"
echo cd /d "%%~dp0..\backend" >> "%SCRIPT_DIR%cleanup-reservations.bat"
echo python manage.py cleanup_expired_reservations ^>^> ..\logs\cleanup.log 2^>^&1 >> "%SCRIPT_DIR%cleanup-reservations.bat"

REM Create payment monitoring script
echo @echo off > "%SCRIPT_DIR%check-payments.bat"
echo cd /d "%%~dp0..\backend" >> "%SCRIPT_DIR%check-payments.bat"
echo python manage.py check_pending_payments --cleanup-reservations --max-age-hours 24 --auto-timeout-hours 2 ^>^> ..\logs\payments.log 2^>^&1 >> "%SCRIPT_DIR%check-payments.bat"

REM Create comprehensive monitoring script
echo @echo off > "%SCRIPT_DIR%full-monitoring.bat"
echo cd /d "%%~dp0..\backend" >> "%SCRIPT_DIR%full-monitoring.bat"
echo echo %%date%% %%time%%: Starting comprehensive monitoring... ^>^> ..\logs\monitoring.log >> "%SCRIPT_DIR%full-monitoring.bat"
echo python manage.py cleanup_expired_reservations ^>^> ..\logs\monitoring.log 2^>^&1 >> "%SCRIPT_DIR%full-monitoring.bat"
echo python manage.py check_pending_payments --cleanup-reservations --check-orphaned-reservations --max-age-hours 48 --auto-timeout-hours 2 --verbose ^>^> ..\logs\monitoring.log 2^>^&1 >> "%SCRIPT_DIR%full-monitoring.bat"
echo echo %%date%% %%time%%: Monitoring complete ^>^> ..\logs\monitoring.log >> "%SCRIPT_DIR%full-monitoring.bat"
echo echo ---------------------------------------- ^>^> ..\logs\monitoring.log >> "%SCRIPT_DIR%full-monitoring.bat"

echo ✅ Monitoring scripts created

REM Create logs directory
if not exist "%SCRIPT_DIR%..\logs" mkdir "%SCRIPT_DIR%..\logs"
if not exist "%SCRIPT_DIR%..\logs\cleanup.log" echo. > "%SCRIPT_DIR%..\logs\cleanup.log"
if not exist "%SCRIPT_DIR%..\logs\payments.log" echo. > "%SCRIPT_DIR%..\logs\payments.log"
if not exist "%SCRIPT_DIR%..\logs\monitoring.log" echo. > "%SCRIPT_DIR%..\logs\monitoring.log"

echo ✅ Log files created

REM Display Windows Task Scheduler setup instructions
echo.
echo 📅 WINDOWS TASK SCHEDULER SETUP
echo ================================
echo.
echo To set up automated monitoring, create Windows Scheduled Tasks:
echo.
echo 1. Open Task Scheduler (taskschd.msc)
echo 2. Click "Create Basic Task" and follow these setups:
echo.
echo TASK 1: Cleanup Expired Reservations
echo - Name: Malikli Cleanup Reservations
echo - Trigger: Daily, repeat every 15 minutes for 1 day
echo - Action: Start a program
echo - Program: %SCRIPT_DIR%cleanup-reservations.bat
echo.
echo TASK 2: Check Payment Statuses  
echo - Name: Malikli Check Payments
echo - Trigger: Daily, repeat every 1 hour for 1 day
echo - Action: Start a program
echo - Program: %SCRIPT_DIR%check-payments.bat
echo.
echo TASK 3: Full Monitoring
echo - Name: Malikli Full Monitoring
echo - Trigger: Daily at 6:00 AM and 6:00 PM
echo - Action: Start a program
echo - Program: %SCRIPT_DIR%full-monitoring.bat
echo.

REM Display manual usage
echo 🔧 MANUAL USAGE
echo ===============
echo.
echo Cleanup expired reservations:
echo   %SCRIPT_DIR%cleanup-reservations.bat
echo.
echo Check payment statuses:
echo   %SCRIPT_DIR%check-payments.bat
echo.
echo Full monitoring (recommended for troubleshooting):
echo   %SCRIPT_DIR%full-monitoring.bat
echo.

REM Display Django command usage
echo 🐍 DJANGO COMMANDS
echo ==================
echo.
echo For testing and debugging, you can run Django commands directly:
echo.
echo cd /d %BACKEND_DIR%
echo.
echo # Dry run cleanup (see what would be cleaned)
echo python manage.py cleanup_expired_reservations --dry-run --verbose
echo.
echo # Check payments with detailed output
echo python manage.py check_pending_payments --dry-run --verbose --max-age-hours 24
echo.
echo # Force timeout old orders
echo python manage.py check_pending_payments --force-timeout --auto-timeout-hours 1 --dry-run
echo.
echo # Check for orphaned reservations
echo python manage.py check_pending_payments --check-orphaned-reservations --dry-run
echo.

echo ✅ Setup complete! Check the logs directory for monitoring output.
echo 📍 Logs location: %SCRIPT_DIR%..\logs\

echo.
echo Press any key to exit...
pause >nul
