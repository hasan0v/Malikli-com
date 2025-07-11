@echo off 
cd /d "%~dp0..\backend" 
python manage.py cleanup_expired_reservations >> ..\logs\cleanup.log 2>&1 
