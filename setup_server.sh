#!/bin/bash

# Malikli Store Server Setup Script for AlmaLinux
# This script automates the server setup process

set -e  # Exit on any error

echo "🚀 Starting Malikli Store server setup..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Run as a regular user with sudo privileges."
    exit 1
fi

# Variables (customize these)
APP_DIR="/home/deployuser/Malikli-son---Preview/"
DOMAIN="app.malikli.com"
BACKEND_PORT="8000"
FRONTEND_PORT="3000"

print_step "Step 1: Updating system packages..."
sudo dnf update -y

print_step "Step 2: Installing EPEL repository..."
sudo dnf install -y epel-release

print_step "Step 3: Installing Node.js 20 LTS from NodeSource..."
# Remove old nodejs if present
sudo dnf remove -y nodejs npm
# Install Node.js 20 LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

print_step "Step 4: Installing other required packages..."
print_step "Step 4: Installing other required packages..."
sudo dnf install -y \
    git \
    curl \
    wget \
    nginx \
    certbot \
    python3-certbot-nginx \
    python3 \
    python3-pip \
    postgresql-devel \
    gcc \
    python3-devel \
    firewalld \
    htop \
    vim

print_step "Step 5: Installing PM2 process manager..."
sudo npm install -g pm2

print_step "Step 6: Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

print_step "Step 7: Setting up firewall..."
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow necessary ports
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-port=22/tcp

# Reload firewall
sudo firewall-cmd --reload

print_step "Step 8: Configuring Nginx..."

# Create sites directories
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# Add include directive to main nginx.conf if not present
if ! grep -q "include /etc/nginx/sites-enabled" /etc/nginx/nginx.conf; then
    sudo sed -i '/http {/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
fi

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

print_step "Step 9: Setting up PM2 log directory..."
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

print_step "Step 10: Installing Python global packages..."
pip3 install --user --upgrade pip setuptools wheel

print_status "✅ Basic server setup completed!"

echo ""
print_step "Next steps:"
echo "1. Clone your repository to $APP_DIR"
echo "2. Set up environment variables"
echo "3. Install application dependencies"
echo "4. Configure Nginx site"
echo "5. Set up SSL certificate"
echo "6. Start applications with PM2"

echo ""
print_warning "Important reminders:"
echo "- Update DNS records to point $DOMAIN to this server's IP"
echo "- Prepare your environment variables (.env files)"
echo "- Make sure your database (Supabase) is accessible from this server"
echo "- Configure your Cloudflare R2 credentials"
echo "- Set up your Resend email service credentials"

echo ""
print_status "Server setup completed! You can now proceed with application deployment."

# Show system information
echo ""
print_step "System Information:"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "Kernel: $(uname -r)"
echo "Memory: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $4 " available"}')"
echo "Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
echo "Python: $(python3 --version)"
echo "Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)"

echo ""
print_status "Setup script completed successfully! 🎉"
