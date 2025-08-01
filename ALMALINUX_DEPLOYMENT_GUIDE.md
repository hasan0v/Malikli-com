# 🚀 AlmaLinux Production Deployment Guide - Automated Unreservation System

## 📋 Overview

This guide provides step-by-step instructions for deploying the automated unreservation system on your AlmaLinux production server. The system will automatically clean up expired inventory reservations every 5 minutes.

## 🖥️ Server Requirements

### Minimum Specifications
- **OS**: AlmaLinux 9+
- **RAM**: 2GB minimum (4GB recommended)
- **Storage**: 20GB SSD minimum
- **CPU**: 2 cores minimum
- **Network**: Stable internet connection

### Software Prerequisites
- Python 3.11+
- PostgreSQL client libraries
- Git
- Systemd or Cron
- Virtual environment support

## 🏗️ Step 1: Server Setup

### Option A: Use Automated Setup Script (Recommended)
```bash
# Download and run the AlmaLinux setup script
cd /tmp
wget https://raw.githubusercontent.com/hasan0v/Malikli-com/main/scripts/setup-almalinux-server.sh
chmod +x setup-almalinux-server.sh
./setup-almalinux-server.sh
```

### Option B: Manual Setup
```bash
# Update system
sudo dnf update -y
sudo dnf install -y epel-release
sudo dnf config-manager --set-enabled crb

# Install Python 3.11 and dependencies
sudo dnf install -y python3.11 python3.11-devel python3.11-pip
sudo dnf install -y postgresql-devel gcc git

# Create application user
sudo useradd -m -s /bin/bash malikli
sudo usermod -aG wheel malikli

# Create application directory
sudo mkdir -p /var/www/malikli1992.com
sudo chown -R malikli:malikli /var/www/malikli1992.com
```

## 📁 Step 2: Deploy Application Code

### Clone Repository
```bash
# Switch to application user
sudo su - malikli

# Clone the repository
cd /var/www/malikli1992.com
git clone https://github.com/hasan0v/Malikli-com.git .

# Set proper permissions
chmod +x backend/*.sh
chmod +x scripts/*.sh
```

### Setup Python Virtual Environment
```bash
cd /var/www/malikli1992.com/backend

# Create virtual environment with Python 3.11
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install dependencies
pip install -r requirements.txt

# Install additional packages for standalone script
pip install psycopg2-binary python-dotenv
```

## 🔧 Step 3: Configure Environment

### Create Environment Configuration
```bash
cd /var/www/malikli1992.com/backend

# Create .env file with database configuration
cat > .env << 'EOF'
# Supabase Database Configuration
DATABASE_URL=postgresql://postgres.xxxxxxxx:your_password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# Django Configuration
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=malikli1992.com,www.malikli1992.com

# Automated Unreservation Settings
UNRESERVATION_MAX_AGE_MINUTES=15
UNRESERVATION_BATCH_SIZE=100
UNRESERVATION_LOG_LEVEL=INFO
EOF

# Secure the environment file
chmod 600 .env
```

### Test Database Connection
```bash
# Test with standalone script
python automated_unreservation_standalone.py --dry-run --verbose

# Test with Django command
python manage.py automated_unreservation --dry-run --verbose
```

## ⚙️ Step 4: Choose Deployment Method

### Method 1: Systemd Timer (Recommended for Production)

#### Create Systemd Service
```bash
# Create the service file
sudo tee /etc/systemd/system/malikli-unreservation.service > /dev/null << 'EOF'
[Unit]
Description=Malikli Automated Unreservation
After=network.target

[Service]
Type=oneshot
User=malikli
Group=malikli
WorkingDirectory=/var/www/malikli1992.com/backend
Environment=PYTHONPATH=/var/www/malikli1992.com/backend
ExecStart=/var/www/malikli1992.com/backend/venv/bin/python /var/www/malikli1992.com/backend/automated_unreservation_standalone.py --quiet
StandardOutput=journal
StandardError=journal
EOF

# Create the timer file
sudo tee /etc/systemd/system/malikli-unreservation.timer > /dev/null << 'EOF'
[Unit]
Description=Run Malikli Automated Unreservation every 5 minutes
Requires=malikli-unreservation.service

[Timer]
OnCalendar=*:*:0/5
Persistent=true
AccuracySec=1s

[Install]
WantedBy=timers.target
EOF

# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable malikli-unreservation.timer
sudo systemctl start malikli-unreservation.timer

# Check timer status
sudo systemctl status malikli-unreservation.timer
sudo systemctl list-timers malikli-unreservation.timer
```

### Method 2: Cron Job (Alternative)

#### Setup Cron Job
```bash
# Switch to application user
sudo su - malikli

# Use the automated setup script
cd /var/www/malikli1992.com/backend
chmod +x setup_automated_unreservation_cron.sh
./setup_automated_unreservation_cron.sh install

# Verify cron job installation
./setup_automated_unreservation_cron.sh status
```

### Method 3: Background Service (Continuous)

#### Setup Background Service
```bash
# Create systemd service for continuous operation
sudo tee /etc/systemd/system/malikli-unreservation-daemon.service > /dev/null << 'EOF'
[Unit]
Description=Malikli Automated Unreservation Daemon
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=malikli
Group=malikli
WorkingDirectory=/var/www/malikli1992.com/backend
Environment=PYTHONPATH=/var/www/malikli1992.com/backend
ExecStart=/var/www/malikli1992.com/backend/venv/bin/python /var/www/malikli1992.com/backend/unreservation_scheduler.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=/var/www/malikli1992.com
ProtectHome=yes

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable malikli-unreservation-daemon.service
sudo systemctl start malikli-unreservation-daemon.service
```

## 📊 Step 5: Monitoring and Logging

### Setup Log Rotation
```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/malikli-unreservation > /dev/null << 'EOF'
/var/www/malikli1992.com/backend/automated_unreservation*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su malikli malikli
}
EOF
```

### Monitoring Commands
```bash
# Check systemd timer status
sudo systemctl status malikli-unreservation.timer
sudo journalctl -u malikli-unreservation.service -f

# Check cron job status (if using cron)
sudo su - malikli -c "cd /var/www/malikli1992.com/backend && ./setup_automated_unreservation_cron.sh status"

# View application logs
tail -f /var/www/malikli1992.com/backend/automated_unreservation*.log

# Check system resource usage
htop
systemctl status malikli-unreservation*
```

### Health Check Script
```bash
# Create health check script
cat > /var/www/malikli1992.com/backend/health_check.sh << 'EOF'
#!/bin/bash

BACKEND_DIR="/var/www/malikli1992.com/backend"
LOG_FILE="$BACKEND_DIR/health_check.log"

cd "$BACKEND_DIR"
source venv/bin/activate

# Run health check
python monitor_unreservation.py --check-health >> "$LOG_FILE" 2>&1

# Check exit code
if [ $? -eq 0 ]; then
    echo "[$(date)] Health check passed" >> "$LOG_FILE"
else
    echo "[$(date)] Health check failed" >> "$LOG_FILE"
    # Send alert (implement as needed)
    # mail -s "Malikli Health Check Failed" admin@malikli1992.com < "$LOG_FILE"
fi
EOF

chmod +x /var/www/malikli1992.com/backend/health_check.sh

# Add to cron for daily health checks
echo "0 8 * * * /var/www/malikli1992.com/backend/health_check.sh" | sudo crontab -u malikli -
```

## 🔐 Step 6: Security and Optimization

### Firewall Configuration
```bash
# Configure firewall (if not already done)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### File Permissions
```bash
# Set proper file permissions
sudo chown -R malikli:malikli /var/www/malikli1992.com
sudo chmod -R 755 /var/www/malikli1992.com
sudo chmod 600 /var/www/malikli1992.com/backend/.env
sudo chmod +x /var/www/malikli1992.com/backend/*.py
sudo chmod +x /var/www/malikli1992.com/backend/*.sh
```

### Database Connection Security
```bash
# Ensure SSL connection in .env
echo "PGSSLMODE=require" >> /var/www/malikli1992.com/backend/.env
```

## 📈 Step 7: Performance Optimization

### System Optimization
```bash
# Optimize system settings
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Increase file descriptor limits
echo "malikli soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "malikli hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

### Application Optimization
```bash
# Configure Python optimization
echo "export PYTHONOPTIMIZE=1" >> /var/www/malikli1992.com/backend/.env
echo "export PYTHONDONTWRITEBYTECODE=1" >> /var/www/malikli1992.com/backend/.env
```

## 🧪 Step 8: Testing and Validation

### Run Initial Tests
```bash
cd /var/www/malikli1992.com/backend
source venv/bin/activate

# Test standalone script
python automated_unreservation_standalone.py --dry-run --verbose

# Test Django command
python manage.py automated_unreservation --dry-run --verbose

# Test monitoring
python monitor_unreservation.py --check-health
```

### Load Testing
```bash
# Create test data script
cat > test_load.py << 'EOF'
import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from orders.models import InventoryReservation, Order
from products.models import ProductVariant

# Create test reservations (adjust as needed)
for i in range(100):
    # Create test logic here
    pass

print("Test data created")
EOF

# Run load test
python test_load.py
```

## 📋 Step 9: Deployment Checklist

### Pre-Deployment
- [ ] Server setup completed
- [ ] Python virtual environment created
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Application code deployed

### Deployment
- [ ] Systemd timer/service created and enabled
- [ ] OR Cron job installed and tested
- [ ] Log rotation configured
- [ ] Health checks implemented
- [ ] Monitoring setup completed

### Post-Deployment
- [ ] System is running automated unreservation every 5 minutes
- [ ] Logs are being generated correctly
- [ ] No expired reservations accumulating
- [ ] Performance is optimal
- [ ] Security measures in place

## 🚨 Troubleshooting

### Common Issues

#### Permission Errors
```bash
# Fix ownership
sudo chown -R malikli:malikli /var/www/malikli1992.com
sudo chmod 600 /var/www/malikli1992.com/backend/.env
```

#### Database Connection Issues
```bash
# Test connection
cd /var/www/malikli1992.com/backend
source venv/bin/activate
python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings'); import django; django.setup(); from django.db import connection; print('Connection:', connection.ensure_connection())"
```

#### Service Not Starting
```bash
# Check service logs
sudo journalctl -u malikli-unreservation.service -f
sudo systemctl status malikli-unreservation.timer

# Restart services
sudo systemctl restart malikli-unreservation.timer
```

### Log Locations
```bash
# Application logs
/var/www/malikli1992.com/backend/automated_unreservation*.log

# System logs
sudo journalctl -u malikli-unreservation.service
sudo journalctl -u malikli-unreservation.timer

# Cron logs (if using cron)
/var/log/cron
/var/www/malikli1992.com/backend/automated_unreservation.log
```

## 📞 Support Commands

### Quick Status Check
```bash
# One-liner status check
sudo systemctl is-active malikli-unreservation.timer && echo "Timer is running" || echo "Timer is not running"

# Check last execution
sudo journalctl -u malikli-unreservation.service --since "1 hour ago" | tail -10
```

### Emergency Stop
```bash
# Stop all automation
sudo systemctl stop malikli-unreservation.timer
sudo systemctl stop malikli-unreservation-daemon.service

# Remove cron job (if using cron)
sudo su - malikli -c "cd /var/www/malikli1992.com/backend && ./setup_automated_unreservation_cron.sh remove"
```

### Manual Execution
```bash
# Run once manually
cd /var/www/malikli1992.com/backend
source venv/bin/activate
python automated_unreservation_standalone.py --verbose
```

## 🎯 Production Best Practices

1. **Use Systemd Timer** for production environments (most reliable)
2. **Monitor logs regularly** to ensure smooth operation
3. **Set up alerts** for failures (email, Slack, etc.)
4. **Keep backups** of configuration files
5. **Test on staging** before deploying to production
6. **Use SSL/TLS** for all database connections
7. **Implement proper log rotation** to prevent disk space issues
8. **Monitor system resources** (CPU, memory, disk)

## ✅ Success Indicators

Your deployment is successful when:

- ✅ Systemd timer shows as active and running
- ✅ No expired reservations accumulate beyond 15 minutes
- ✅ Logs show regular cleanup activities every 5 minutes
- ✅ No error messages in application or system logs
- ✅ Database connections are stable
- ✅ System performance remains optimal

## 🚀 You're Ready for Production!

Your automated unreservation system is now deployed and running on AlmaLinux. The system will:

- **Automatically clean up** expired reservations every 5 minutes
- **Log all activities** for monitoring and debugging
- **Handle errors gracefully** with proper retry mechanisms
- **Maintain data integrity** with atomic transactions
- **Scale efficiently** with optimized database queries

**Your inventory management is now fully automated! 🎉**
