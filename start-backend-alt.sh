#!/bin/bash
# Alternative Django Backend Startup Script

# Set working directory
BACKEND_DIR="/home/deployuser/Malikli-son---Preview/backend"
cd "$BACKEND_DIR"

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export DJANGO_SETTINGS_MODULE=backend.settings
export PYTHONPATH="$BACKEND_DIR:$PYTHONPATH"

# Verify Django can be imported
python -c "import django; django.setup(); from backend.wsgi import application; print('Django OK')"

if [ $? -eq 0 ]; then
    echo "Django validation successful, starting gunicorn..."
    exec gunicorn \
        --bind 127.0.0.1:8000 \
        --workers 3 \
        --timeout 120 \
        --max-requests 1000 \
        --preload \
        --chdir "$BACKEND_DIR" \
        backend.wsgi:application
else
    echo "Django validation failed!"
    exit 1
fi
