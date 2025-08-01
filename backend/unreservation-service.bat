@echo off
REM Automated Unreservation Service Management Script
REM This script manages the automated unreservation background service

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%
set VENV_DIR=%BACKEND_DIR%\venv
set PYTHON_EXE=%VENV_DIR%\Scripts\python.exe
set SCHEDULER_SCRIPT=%BACKEND_DIR%\unreservation_scheduler.py

REM Check if virtual environment exists
if not exist "%PYTHON_EXE%" (
    echo ERROR: Virtual environment not found at %VENV_DIR%
    echo Please ensure the virtual environment is set up correctly.
    pause
    exit /b 1
)

REM Parse command line arguments
set ACTION=%1
if "%ACTION%"=="" set ACTION=help

if "%ACTION%"=="start" goto start_service
if "%ACTION%"=="stop" goto stop_service
if "%ACTION%"=="status" goto check_status
if "%ACTION%"=="restart" goto restart_service
if "%ACTION%"=="test" goto test_run
if "%ACTION%"=="help" goto show_help

echo Invalid action: %ACTION%
goto show_help

:start_service
echo Starting automated unreservation service...
"%PYTHON_EXE%" "%SCHEDULER_SCRIPT%" --interval 5 --max-age 15
if errorlevel 1 (
    echo Failed to start service
    pause
    exit /b 1
)
echo Service started successfully
goto end

:stop_service
echo Stopping automated unreservation service...
"%PYTHON_EXE%" "%SCHEDULER_SCRIPT%" --stop
if errorlevel 1 (
    echo Failed to stop service or service not running
) else (
    echo Service stopped successfully
)
goto end

:check_status
echo Checking automated unreservation service status...
"%PYTHON_EXE%" "%SCHEDULER_SCRIPT%" --status
if errorlevel 1 (
    echo Service is NOT running
) else (
    echo Service is running
)
goto end

:restart_service
echo Restarting automated unreservation service...
call :stop_service
timeout /t 3 /nobreak > nul
call :start_service
goto end

:test_run
echo Running a test cleanup (one-time execution)...
"%PYTHON_EXE%" manage.py automated_unreservation --dry-run --verbose
if errorlevel 1 (
    echo Test run failed
    pause
    exit /b 1
)
echo Test run completed
goto end

:show_help
echo.
echo Automated Unreservation Service Management
echo =========================================
echo.
echo Usage: %~nx0 [ACTION]
echo.
echo Actions:
echo   start    - Start the automated unreservation service
echo   stop     - Stop the automated unreservation service
echo   status   - Check if the service is running
echo   restart  - Restart the service (stop + start)
echo   test     - Run a test cleanup (dry-run mode)
echo   help     - Show this help message
echo.
echo The service automatically cleans up expired product reservations
echo every 5 minutes for orders older than 15 minutes with unpaid status.
echo.
echo Examples:
echo   %~nx0 start
echo   %~nx0 status
echo   %~nx0 test
echo.
goto end

:end
endlocal
