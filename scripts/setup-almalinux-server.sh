#!/bin/bash

# =============================================================================
# MALIKLI.COM - ALMALINUX SERVER SETUP SCRIPT
# =============================================================================
# This script sets up a complete production environment for Malikli.com
# on AlmaLinux 9 server
#
# Domain: malikli1992.com
# Backend: Django REST API
# Frontend: Next.js
# Database: Supabase PostgreSQL (external)
# Storage: Cloudflare R2
# =============================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="malikli1992.com"
APP_USER="malikli"
APP_DIR="/var/www/malikli1992.com"
BACKEND_PORT="8000"
FRONTEND_PORT="3000"
NODE_VERSION="20"
PYTHON_VERSION="3.11"

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

print_success() {
    echo -e "${PURPLE}[SUCCESS]${NC} $1"
}

print_header() {
    echo -e "${CYAN}===============================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}===============================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should NOT be run as root!"
        print_error "Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Function to check sudo privileges
check_sudo() {
    if ! sudo -n true 2>/dev/null; then
        print_error "This script requires sudo privileges."
        print_error "Please make sure your user has sudo access."
        exit 1
    fi
}

# Function to detect AlmaLinux version
detect_os() {
    if [[ -f /etc/almalinux-release ]]; then
        local version=$(cat /etc/almalinux-release | grep -oP '\d+\.\d+')
        print_status "Detected AlmaLinux $version"
        
        if [[ $(echo "$version >= 9.0" | bc -l) -eq 1 ]]; then
            print_success "AlmaLinux version is supported!"
        else
            print_warning "AlmaLinux version might not be fully supported. Recommended: 9.0+"
        fi
    else
        print_error "This script is designed for AlmaLinux. Detected OS might not be supported."
        read -p "Do you want to continue anyway? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to update system
update_system() {
    print_step "Updating system packages..."
    sudo dnf update -y
    sudo dnf install -y epel-release
    sudo dnf config-manager --set-enabled crb  # Enable CodeReady Builder
    print_success "System updated successfully!"
}

# Function to install basic dependencies
install_basic_deps() {
    print_step "Installing basic dependencies..."
    
    sudo dnf groupinstall -y "Development Tools"
    sudo dnf install -y \
        curl \
        wget \
        git \
        vim \
        nano \
        htop \
        tree \
        unzip \
        tar \
        gzip \
        openssl \
        openssl-devel \
        libffi-devel \
        zlib-devel \
        bzip2-devel \
        readline-devel \
        sqlite-devel \
        xz-devel \
        tk-devel \
        postgresql-devel \
        gcc \
        gcc-c++ \
        make \
        automake \
        autoconf \
        libtool \
        pkg-config
    
    print_success "Basic dependencies installed!"
}

# Function to install Python 3.11
install_python() {
    print_step "Installing Python $PYTHON_VERSION..."
    
    # Install Python 3.11 from DNF
    sudo dnf install -y python3.11 python3.11-devel python3.11-pip
    
    # Create symlinks for easier access
    sudo ln -sf /usr/bin/python3.11 /usr/local/bin/python3
    sudo ln -sf /usr/bin/pip3.11 /usr/local/bin/pip3
    
    # Upgrade pip
    python3 -m pip install --user --upgrade pip setuptools wheel
    
    # Install virtualenv
    python3 -m pip install --user virtualenv
    
    print_status "Python version: $(python3 --version)"
    print_success "Python $PYTHON_VERSION installed successfully!"
}

# Function to install Node.js
install_nodejs() {
    print_step "Installing Node.js $NODE_VERSION LTS..."
    
    # Install Node.js 20 LTS from NodeSource repository
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
    sudo dnf install -y nodejs
    
    # Install global npm packages
    sudo npm install -g pm2 yarn
    
    print_status "Node.js version: $(node --version)"
    print_status "npm version: $(npm --version)"
    print_status "PM2 version: $(pm2 --version)"
    print_success "Node.js $NODE_VERSION installed successfully!"
}

# Function to install and configure Nginx
install_nginx() {
    print_step "Installing and configuring Nginx..."
    
    sudo dnf install -y nginx
    
    # Create sites directories
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    # Backup original nginx.conf
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
    
    # Update nginx.conf to include sites-enabled
    if ! grep -q "include /etc/nginx/sites-enabled" /etc/nginx/nginx.conf; then
        sudo sed -i '/include \/etc\/nginx\/conf\.d\/\*\.conf;/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
    fi
    
    # Start and enable nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    print_success "Nginx installed and configured!"
}

# Function to install Redis (optional but recommended)
install_redis() {
    print_step "Installing Redis..."
    
    sudo dnf install -y redis
    
    # Configure Redis
    sudo systemctl start redis
    sudo systemctl enable redis
    
    # Test Redis connection
    if redis-cli ping | grep -q "PONG"; then
        print_success "Redis installed and running!"
    else
        print_warning "Redis installation completed but service might not be running properly."
    fi
}

# Function to install SSL certificate tools
install_ssl_tools() {
    print_step "Installing SSL certificate tools..."
    
    sudo dnf install -y certbot python3-certbot-nginx
    
    print_success "Certbot installed for SSL certificates!"
}

# Function to configure firewall
configure_firewall() {
    print_step "Configuring firewall..."
    
    # Start and enable firewalld
    sudo systemctl start firewalld
    sudo systemctl enable firewalld
    
    # Allow necessary services and ports
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-port=22/tcp
    
    # Reload firewall
    sudo firewall-cmd --reload
    
    print_success "Firewall configured!"
}

# Function to create application user
create_app_user() {
    print_step "Creating application user '$APP_USER'..."
    
    # Create user if doesn't exist
    if ! id "$APP_USER" &>/dev/null; then
        sudo useradd -m -s /bin/bash "$APP_USER"
        print_status "User '$APP_USER' created."
    else
        print_status "User '$APP_USER' already exists."
    fi
    
    # Add user to necessary groups
    sudo usermod -aG wheel "$APP_USER"  # sudo access
    
    # Create application directory
    sudo mkdir -p "$APP_DIR"
    sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    sudo chmod 755 "$APP_DIR"
    
    print_success "Application user and directory created!"
}

# Function to setup log directories
setup_logging() {
    print_step "Setting up logging directories..."
    
    # Create log directories
    sudo mkdir -p /var/log/malikli
    sudo mkdir -p /var/log/pm2
    sudo mkdir -p /var/log/nginx
    
    # Set proper permissions
    sudo chown -R "$APP_USER:$APP_USER" /var/log/malikli
    sudo chown -R "$APP_USER:$APP_USER" /var/log/pm2
    
    print_success "Logging directories created!"
}

# Function to configure SELinux (if enabled)
configure_selinux() {
    print_step "Configuring SELinux..."
    
    if command_exists getenforce && [[ $(getenforce) != "Disabled" ]]; then
        print_status "SELinux is enabled. Configuring policies..."
        
        # Allow nginx to connect to backend services
        sudo setsebool -P httpd_can_network_connect 1
        sudo setsebool -P httpd_can_network_relay 1
        
        # Allow nginx to serve static files
        sudo setsebool -P httpd_enable_homedirs 1
        
        print_success "SELinux configured for web applications!"
    else
        print_status "SELinux is disabled or not available."
    fi
}

# Function to install additional monitoring tools
install_monitoring() {
    print_step "Installing monitoring tools..."
    
    sudo dnf install -y \
        htop \
        iotop \
        nethogs \
        ncdu \
        fail2ban
    
    # Configure fail2ban
    sudo systemctl start fail2ban
    sudo systemctl enable fail2ban
    
    print_success "Monitoring tools installed!"
}

# Function to optimize system settings
optimize_system() {
    print_step "Optimizing system settings..."
    
    # Increase file descriptor limits
    echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
    echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
    
    # Configure swappiness for better performance
    echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
    
    # Network optimizations
    echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
    echo "net.ipv4.tcp_max_syn_backlog = 65536" | sudo tee -a /etc/sysctl.conf
    
    # Apply sysctl changes
    sudo sysctl -p
    
    print_success "System optimizations applied!"
}

# Function to create deployment directories
create_deployment_structure() {
    print_step "Creating deployment directory structure..."
    
    sudo -u "$APP_USER" mkdir -p "$APP_DIR"/{scripts,logs,backups,ssl}
    sudo -u "$APP_USER" mkdir -p "$APP_DIR"/logs/{nginx,django,pm2}
    
    print_success "Deployment structure created!"
}

# Main installation function
main() {
    print_header "MALIKLI.COM - ALMALINUX SERVER SETUP"
    echo "This script will set up a complete production environment for:"
    echo "• Domain: $DOMAIN"
    echo "• Application Directory: $APP_DIR"
    echo "• Python Version: $PYTHON_VERSION"
    echo "• Node.js Version: $NODE_VERSION"
    echo ""
    
    read -p "Do you want to continue with the installation? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Installation cancelled by user."
        exit 0
    fi
    
    # Pre-installation checks
    check_root
    check_sudo
    detect_os
    
    # System setup
    update_system
    install_basic_deps
    
    # Language and runtime installations
    install_python
    install_nodejs
    
    # Web server and services
    install_nginx
    install_redis
    install_ssl_tools
    
    # Security and monitoring
    configure_firewall
    configure_selinux
    install_monitoring
    
    # Application setup
    create_app_user
    setup_logging
    create_deployment_structure
    
    # System optimizations
    optimize_system
    
    # Final steps
    print_header "INSTALLATION COMPLETED SUCCESSFULLY!"
    echo ""
    print_success "✅ AlmaLinux server setup completed!"
    echo ""
    print_step "System Information:"
    echo "• OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2)"
    echo "• Kernel: $(uname -r)"
    echo "• Memory: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "• Disk Space: $(df -h / | awk 'NR==2 {print $4 " available"}')"
    echo "• Python: $(python3 --version)"
    echo "• Node.js: $(node --version)"
    echo "• Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)"
    echo "• Redis: $(redis-cli --version | cut -d' ' -f2)"
    echo ""
    print_step "Next Steps:"
    echo "1. Clone your repository to $APP_DIR"
    echo "2. Configure environment variables (.env files)"
    echo "3. Run the deployment script"
    echo "4. Configure DNS to point $DOMAIN to this server"
    echo "5. Set up SSL certificate with Let's Encrypt"
    echo ""
    print_warning "Important Notes:"
    echo "• Application user created: $APP_USER"
    echo "• Application directory: $APP_DIR"
    echo "• Make sure to configure your environment variables"
    echo "• Update DNS records for $DOMAIN"
    echo "• Prepare your Supabase, Cloudflare R2, and Resend credentials"
    echo ""
    print_success "Server setup completed! You can now proceed with application deployment."
}

# Run main function
main "$@"
