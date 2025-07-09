#!/bin/bash
# Django Backend Startup Script for PM2

# Change to the backend directory
cd /home/deployuser/Malikli-son---Preview/backend

# Activate virtual environment
source venv/bin/activate

# Set Django settings module
export DJANGO_SETTINGS_MODULE=backend.settings

# Export Python path to include the current directory
export PYTHONPATH=/home/deployuser/Malikli-son---Preview/backend:$PYTHONPATH

# Start gunicorn with the correct module path
exec gunicorn --bind 127.0.0.1:8000 --workers 3 --timeout 120 --max-requests 1000 --preload --chdir /home/deployuser/Malikli-son---Preview/backend backend.wsgi:application
