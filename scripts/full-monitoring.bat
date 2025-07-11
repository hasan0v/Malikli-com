@echo off 
cd /d "%~dp0..\backend" 
echo %date% %time%: Starting comprehensive monitoring... >> ..\logs\monitoring.log 
python manage.py cleanup_expired_reservations >> ..\logs\monitoring.log 2>&1 
python manage.py check_pending_payments --cleanup-reservations --check-orphaned-reservations --max-age-hours 48 --auto-timeout-hours 2 --verbose >> ..\logs\monitoring.log 2>&1 
echo %date% %time%: Monitoring complete >> ..\logs\monitoring.log 
echo ---------------------------------------- >> ..\logs\monitoring.log 
