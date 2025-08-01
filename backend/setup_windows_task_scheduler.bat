@echo off
REM Windows Task Scheduler Setup for Automated Unreservation
REM This script sets up a Windows Task Scheduler job to run every 5 minutes

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%
set CRON_SCRIPT=%BACKEND_DIR%\run_automated_unreservation_cron.bat
set TASK_NAME=MalikliAutomatedUnreservation

echo.
echo Automated Unreservation Task Scheduler Setup
echo ============================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: This script must be run as Administrator
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Parse command line arguments
set ACTION=%1
if "%ACTION%"=="" set ACTION=help

if "%ACTION%"=="install" goto install_task
if "%ACTION%"=="remove" goto remove_task
if "%ACTION%"=="status" goto check_status
if "%ACTION%"=="test" goto test_task
if "%ACTION%"=="help" goto show_help

echo Invalid action: %ACTION%
goto show_help

:install_task
echo Installing Windows Task Scheduler job...

REM Check if cron script exists
if not exist "%CRON_SCRIPT%" (
    echo ERROR: Cron script not found at %CRON_SCRIPT%
    pause
    exit /b 1
)

REM Remove existing task if it exists
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if not errorlevel 1 (
    echo Removing existing task...
    schtasks /delete /tn "%TASK_NAME%" /f
)

REM Create new task
echo Creating new task "%TASK_NAME%"...
schtasks /create /tn "%TASK_NAME%" ^
    /tr "\"%CRON_SCRIPT%\"" ^
    /sc minute ^
    /mo 5 ^
    /ru "SYSTEM" ^
    /rl highest ^
    /f

if errorlevel 1 (
    echo ERROR: Failed to create task
    pause
    exit /b 1
)

echo.
echo Task installed successfully!
echo Task Name: %TASK_NAME%
echo Schedule: Every 5 minutes
echo Script: %CRON_SCRIPT%
echo.
echo The task will start automatically. You can manage it through:
echo - Task Scheduler (taskschd.msc)
echo - Command: schtasks /query /tn "%TASK_NAME%" /v
echo.
goto end

:remove_task
echo Removing Windows Task Scheduler job...

schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if errorlevel 1 (
    echo Task "%TASK_NAME%" not found
    goto end
)

schtasks /delete /tn "%TASK_NAME%" /f
if errorlevel 1 (
    echo ERROR: Failed to remove task
    exit /b 1
)

echo Task "%TASK_NAME%" removed successfully
goto end

:check_status
echo Checking task status...

schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if errorlevel 1 (
    echo Task "%TASK_NAME%" is NOT installed
    goto end
)

echo Task "%TASK_NAME%" is installed
echo.
echo Detailed information:
schtasks /query /tn "%TASK_NAME%" /v /fo list

echo.
echo Recent execution history:
schtasks /query /tn "%TASK_NAME%" /fo table

goto end

:test_task
echo Running test execution...

if not exist "%CRON_SCRIPT%" (
    echo ERROR: Cron script not found at %CRON_SCRIPT%
    exit /b 1
)

echo Executing: "%CRON_SCRIPT%"
call "%CRON_SCRIPT%"

if errorlevel 1 (
    echo Test execution failed
    pause
    exit /b 1
)

echo Test execution completed successfully
goto end

:show_help
echo.
echo Windows Task Scheduler Setup for Automated Unreservation
echo ========================================================
echo.
echo Usage: %~nx0 [ACTION]
echo.
echo Actions:
echo   install  - Install the Windows Task Scheduler job
echo   remove   - Remove the Windows Task Scheduler job
echo   status   - Check if the task is installed and running
echo   test     - Run a test execution of the script
echo   help     - Show this help message
echo.
echo The task runs every 5 minutes and automatically cleans up
echo expired product reservations for unpaid orders older than 15 minutes.
echo.
echo Requirements:
echo - Must be run as Administrator
echo - Virtual environment must be set up in %BACKEND_DIR%\venv
echo - Database must be accessible
echo.
echo Examples:
echo   %~nx0 install
echo   %~nx0 status
echo   %~nx0 test
echo.
echo Management Commands:
echo   View task:    schtasks /query /tn "%TASK_NAME%" /v
echo   Run now:      schtasks /run /tn "%TASK_NAME%"
echo   Stop task:    schtasks /end /tn "%TASK_NAME%"
echo.
goto end

:end
endlocal
pause
