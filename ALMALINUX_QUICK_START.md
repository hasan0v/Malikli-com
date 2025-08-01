# 🚀 AlmaLinux Deployment - Quick Start Guide

## 📋 TL;DR - Deploy in 5 Minutes

### Step 1: Server Setup (if not done already)
```bash
# Run the server setup script
wget https://raw.githubusercontent.com/hasan0v/Malikli-com/main/scripts/setup-almalinux-server.sh
chmod +x setup-almalinux-server.sh
./setup-almalinux-server.sh
```

### Step 2: Deploy Application
```bash
# Switch to application user
sudo su - malikli

# Clone repository
cd /var/www/malikli1992.com
git clone https://github.com/hasan0v/Malikli-com.git .

# Setup virtual environment
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install psycopg2-binary python-dotenv
```

### Step 3: Configure Environment
```bash
# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres.xxxxxxxx:your_password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=malikli1992.com,www.malikli1992.com
UNRESERVATION_MAX_AGE_MINUTES=15
EOF

chmod 600 .env
```

### Step 4: Deploy Automated Unreservation
```bash
# Use the automated deployment script
chmod +x deploy_unreservation_almalinux.sh
./deploy_unreservation_almalinux.sh
```

### Step 5: Verify Deployment
```bash
# Check status
./deploy_unreservation_almalinux.sh status

# View logs
./deploy_unreservation_almalinux.sh logs

# Manual test
source venv/bin/activate
python automated_unreservation_standalone.py --dry-run --verbose
```

## 🎯 Deployment Options

### Option 1: Systemd Timer (Recommended)
- **Best for**: Production servers
- **Advantages**: Most reliable, integrated with systemd
- **Command**: Choose option 1 in deployment script

### Option 2: Cron Job (Traditional)
- **Best for**: Simple setups, traditional environments
- **Advantages**: Well-known, easy to debug
- **Command**: Choose option 2 in deployment script

### Option 3: Background Service (Continuous)
- **Best for**: High-frequency cleanup requirements
- **Advantages**: Always running, immediate response
- **Command**: Choose option 3 in deployment script

## 📊 Monitoring Commands

```bash
# Check systemd timer status
sudo systemctl status malikli-unreservation.timer

# Check cron job status
crontab -l | grep automated_unreservation

# View application logs
tail -f /var/www/malikli1992.com/backend/automated_unreservation*.log

# View system logs
sudo journalctl -u malikli-unreservation.service -f

# Run health check
/var/www/malikli1992.com/backend/health_check.sh

# Manual execution
cd /var/www/malikli1992.com/backend
source venv/bin/activate
python automated_unreservation_standalone.py --verbose
```

## 🔧 Management Commands

```bash
# Start automation
sudo systemctl start malikli-unreservation.timer

# Stop automation
sudo systemctl stop malikli-unreservation.timer

# Restart automation
sudo systemctl restart malikli-unreservation.timer

# Check automation status
sudo systemctl is-active malikli-unreservation.timer

# View recent executions
sudo journalctl -u malikli-unreservation.service --since "1 hour ago"
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Permission Denied
```bash
sudo chown -R malikli:malikli /var/www/malikli1992.com
sudo chmod 600 /var/www/malikli1992.com/backend/.env
```

#### 2. Database Connection Failed
```bash
# Test connection
cd /var/www/malikli1992.com/backend
source venv/bin/activate
python -c "
import os
import psycopg2
from urllib.parse import urlparse

# Load .env
with open('.env') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip()
            break

# Test connection
result = urlparse(db_url)
conn = psycopg2.connect(
    database=result.path[1:],
    user=result.username,
    password=result.password,
    host=result.hostname,
    port=result.port
)
print('Database connection successful!')
conn.close()
"
```

#### 3. Service Won't Start
```bash
# Check service logs
sudo journalctl -u malikli-unreservation.service -f

# Check file permissions
ls -la /var/www/malikli1992.com/backend/automated_unreservation_standalone.py

# Test script directly
cd /var/www/malikli1992.com/backend
source venv/bin/activate
python automated_unreservation_standalone.py --dry-run --verbose
```

#### 4. No Logs Generated
```bash
# Check log directory permissions
ls -la /var/www/malikli1992.com/backend/

# Create log file manually
touch /var/www/malikli1992.com/backend/automated_unreservation.log
chown malikli:malikli /var/www/malikli1992.com/backend/automated_unreservation.log
```

## 📈 Performance Optimization

### System Optimization
```bash
# Optimize system settings (run as root)
echo "vm.swappiness=10" >> /etc/sysctl.conf
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
sysctl -p

# Increase file limits
echo "malikli soft nofile 65536" >> /etc/security/limits.conf
echo "malikli hard nofile 65536" >> /etc/security/limits.conf
```

### Database Connection Optimization
```bash
# Add to .env for better performance
echo "PGSSLMODE=require" >> /var/www/malikli1992.com/backend/.env
echo "PGCONNECT_TIMEOUT=10" >> /var/www/malikli1992.com/backend/.env
echo "PGCOMMAND_TIMEOUT=30" >> /var/www/malikli1992.com/backend/.env
```

## 🔐 Security Best Practices

```bash
# Secure the .env file
chmod 600 /var/www/malikli1992.com/backend/.env

# Configure firewall
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Enable fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

## ✅ Success Verification

Your deployment is successful when you see:

1. **✅ Timer is active**: `sudo systemctl is-active malikli-unreservation.timer` returns "active"
2. **✅ Regular executions**: Logs show execution every 5 minutes
3. **✅ No expired reservations**: Database doesn't accumulate expired reservations
4. **✅ Clean logs**: No error messages in logs
5. **✅ Health checks pass**: Health check script runs without errors

## 📞 Quick Support Commands

```bash
# One-liner status check
sudo systemctl is-active malikli-unreservation.timer && echo "✅ Running" || echo "❌ Not running"

# Quick log check
tail -5 /var/www/malikli1992.com/backend/automated_unreservation*.log

# Emergency stop
sudo systemctl stop malikli-unreservation.timer

# Emergency start
sudo systemctl start malikli-unreservation.timer

# Full restart
sudo systemctl restart malikli-unreservation.timer && echo "✅ Restarted"
```

## 🎉 You're Done!

After successful deployment:

- **✅ Automated cleanup** runs every 5 minutes
- **✅ 15-minute timeout** for unpaid orders
- **✅ Production-ready** with monitoring and logging
- **✅ Safe execution** with locking and error handling
- **✅ Full monitoring** with health checks and alerts

Your AlmaLinux server is now running automated inventory management! 🚀

---

**Need the full detailed guide?** See `ALMALINUX_DEPLOYMENT_GUIDE.md` for comprehensive instructions.
