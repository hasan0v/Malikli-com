#!/bin/bash

# =============================================================================
# MALIKLI.COM - SYSTEMD SERVICE SETUP (Alternative to PM2)
# =============================================================================
# This script creates systemd services for the application
# Use this if you prefer systemd over PM2
# =============================================================================

set -e

DOMAIN="malikli1992.com"
APP_USER="malikli"
APP_DIR="/var/www/malikli1992.com"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "Creating systemd services for Malikli.com..."

# Create backend service
sudo tee /etc/systemd/system/malikli-backend.service > /dev/null << EOF
[Unit]
Description=Malikli.com Django Backend
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=exec
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$BACKEND_DIR
Environment=DJANGO_SETTINGS_MODULE=backend.settings
Environment=PYTHONPATH=$BACKEND_DIR
ExecStartPre=/bin/bash -c 'cd $BACKEND_DIR && source venv/bin/activate && python manage.py migrate --noinput'
ExecStartPre=/bin/bash -c 'cd $BACKEND_DIR && source venv/bin/activate && python manage.py collectstatic --noinput --clear'
ExecStart=/bin/bash -c 'cd $BACKEND_DIR && source venv/bin/activate && exec gunicorn --bind 127.0.0.1:8000 --workers 3 --timeout 120 --max-requests 1000 --preload backend.wsgi:application'
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$APP_DIR
ProtectHome=yes

[Install]
WantedBy=multi-user.target
EOF

# Create frontend service
sudo tee /etc/systemd/system/malikli-frontend.service > /dev/null << EOF
[Unit]
Description=Malikli.com Next.js Frontend
After=network.target
Requires=malikli-backend.service

[Service]
Type=exec
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$FRONTEND_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$APP_DIR
ProtectHome=yes

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable services
sudo systemctl daemon-reload
sudo systemctl enable malikli-backend.service
sudo systemctl enable malikli-frontend.service

echo "✅ Systemd services created and enabled!"
echo ""
echo "Service management commands:"
echo "• Start services:    sudo systemctl start malikli-backend malikli-frontend"
echo "• Stop services:     sudo systemctl stop malikli-backend malikli-frontend"
echo "• Restart services:  sudo systemctl restart malikli-backend malikli-frontend"
echo "• Check status:      sudo systemctl status malikli-backend malikli-frontend"
echo "• View logs:         sudo journalctl -u malikli-backend -f"
echo "• View logs:         sudo journalctl -u malikli-frontend -f"
