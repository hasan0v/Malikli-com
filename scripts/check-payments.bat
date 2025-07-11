@echo off 
cd /d "%~dp0..\backend" 
python manage.py check_pending_payments --cleanup-reservations --max-age-hours 24 --auto-timeout-hours 2 >> ..\logs\payments.log 2>&1 
