#!/bin/bash

# Malikli Store Deployment Script
# This script deploys the complete application to production

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/home/deployuser/Malikli-son---Preview/"
DOMAIN="malikli1992.com"
BACKEND_PORT="8000"
FRONTEND_PORT="3000"
NGINX_SITE="malikli-store"

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a service is running
service_running() {
    systemctl is-active --quiet "$1"
}

# Function to validate environment file
validate_env_file() {
    local env_file="$1"
    local required_vars=("${@:2}")
    
    print_step "Validating $env_file..."
    
    if [[ ! -f "$env_file" ]]; then
        print_error "$env_file not found!"
        return 1
    fi
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file" || grep -q "^$var=$" "$env_file" || grep -q "^$var=your-" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing or invalid environment variables in $env_file:"
        printf '%s\n' "${missing_vars[@]}"
        return 1
    fi
    
    print_success "$env_file validation passed!"
    return 0
}

# Main deployment function
main() {
    echo "🚀 Starting Malikli Store deployment..."
    echo "==============================================="
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        print_error "Please do not run this script as root. Run as a regular user with sudo privileges."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "ecosystem.config.js" ]] || [[ ! -d "backend" ]] || [[ ! -d "frontend" ]]; then
        print_error "This script must be run from the project root directory."
        print_error "Make sure you have ecosystem.config.js, backend/, and frontend/ directories."
        exit 1
    fi
    
    # Check required commands
    print_step "Checking required commands..."
    local required_commands=("node" "npm" "python3" "pip3" "nginx" "pm2" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            print_error "Required command '$cmd' not found. Please run setup_server.sh first."
            exit 1
        fi
    done
    print_success "All required commands are available!"
    
    # Check if environment files exist
    print_step "Checking environment files..."
    if [[ ! -f "backend/.env" ]]; then
        print_warning "Backend .env file not found. Creating from template..."
        if [[ -f "backend/.env.production.example" ]]; then
            cp "backend/.env.production.example" "backend/.env"
            print_warning "Please edit backend/.env with your actual values before continuing."
            read -p "Press Enter after editing backend/.env file..."
        else
            print_error "No backend environment template found. Please create backend/.env manually."
            exit 1
        fi
    fi
    
    if [[ ! -f "frontend/.env.local" ]]; then
        print_warning "Frontend .env.local file not found. Creating from template..."
        if [[ -f "frontend/.env.production.example" ]]; then
            cp "frontend/.env.production.example" "frontend/.env.local"
            print_warning "Please edit frontend/.env.local with your actual values before continuing."
            read -p "Press Enter after editing frontend/.env.local file..."
        else
            print_error "No frontend environment template found. Please create frontend/.env.local manually."
            exit 1
        fi
    fi
    
    # Validate environment files
    print_step "Validating environment configuration..."
    backend_required_vars=("SECRET_KEY" "DATABASE_URL" "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "RESEND_API_KEY")
    frontend_required_vars=("NEXT_PUBLIC_API_URL")
    
    validate_env_file "backend/.env" "${backend_required_vars[@]}" || exit 1
    validate_env_file "frontend/.env.local" "${frontend_required_vars[@]}" || exit 1
    
    # Backend deployment
    print_step "Deploying backend..."
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [[ ! -d "venv" ]]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install/upgrade dependencies
    print_status "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn
    
    # Run database migrations
    print_status "Running database migrations..."
    python manage.py migrate
    
    # Collect static files
    print_status "Collecting static files..."
    python manage.py collectstatic --noinput
    
    # Test Django configuration
    print_status "Testing Django configuration..."
    python manage.py check --deploy
    
    cd ..
    
    # Frontend deployment
    print_step "Deploying frontend..."
    cd frontend
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm ci --production=false
    
    # Build the application
    print_status "Building Next.js application..."
    npm run build
    
    cd ..
    
    # Configure Nginx
    print_step "Configuring Nginx..."
    if [[ -f "nginx.conf.template" ]]; then
        sudo cp nginx.conf.template "/etc/nginx/sites-available/$NGINX_SITE"
        sudo ln -sf "/etc/nginx/sites-available/$NGINX_SITE" "/etc/nginx/sites-enabled/"
        
        # Test nginx configuration
        if sudo nginx -t; then
            print_success "Nginx configuration is valid!"
        else
            print_error "Nginx configuration is invalid. Please check the configuration."
            exit 1
        fi
    else
        print_warning "nginx.conf.template not found. Please configure Nginx manually."
    fi
    
    # Make startup scripts executable
    print_step "Setting up startup scripts..."
    chmod +x start-backend.sh
    
    # Start/restart PM2 processes
    print_step "Starting PM2 processes..."
    
    # Stop existing processes if they exist
    pm2 delete all 2>/dev/null || true
    
    # Start new processes
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script (only if not already done)
    if ! pm2 unstartup 2>/dev/null; then
        print_status "Setting up PM2 startup script..."
        pm2 startup
        print_warning "Please run the command shown above to complete PM2 startup setup."
    fi
    
    # Restart Nginx
    print_step "Restarting Nginx..."
    sudo systemctl restart nginx
    
    # Check services status
    print_step "Checking services status..."
    
    # Check PM2 processes
    echo "PM2 Processes:"
    pm2 status
    
    # Check Nginx status
    if service_running "nginx"; then
        print_success "Nginx is running!"
    else
        print_error "Nginx is not running!"
        sudo systemctl status nginx
    fi
    
    # SSL Certificate setup
    print_step "Checking SSL certificate..."
    if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
        print_success "SSL certificate for $DOMAIN already exists!"
    else
        print_warning "SSL certificate not found for $DOMAIN"
        read -p "Do you want to install SSL certificate now? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo certbot --nginx -d "$DOMAIN"
        else
            print_warning "SSL certificate not installed. Your site will only work with HTTP."
        fi
    fi
    
    # Final deployment verification
    print_step "Performing deployment verification..."
    
    # Check if backend is responding
    if curl -s "http://localhost:$BACKEND_PORT/admin/" > /dev/null; then
        print_success "Backend is responding!"
    else
        print_error "Backend is not responding on port $BACKEND_PORT"
    fi
    
    # Check if frontend is responding
    if curl -s "http://localhost:$FRONTEND_PORT/" > /dev/null; then
        print_success "Frontend is responding!"
    else
        print_error "Frontend is not responding on port $FRONTEND_PORT"
    fi
    
    # Deployment summary
    echo ""
    echo "🎉 Deployment completed!"
    echo "==============================================="
    echo "Your application should be available at:"
    echo "- Frontend: https://$DOMAIN"
    echo "- API: https://$DOMAIN/api/v1/"
    echo "- Admin: https://$DOMAIN/admin/"
    echo ""
    echo "Next steps:"
    echo "1. Verify your application is working correctly"
    echo "2. Create a Django superuser if you haven't already:"
    echo "   cd backend && source venv/bin/activate && python manage.py createsuperuser"
    echo "3. Set up monitoring and backups"
    echo "4. Configure your domain's DNS if not already done"
    echo ""
    echo "Useful commands:"
    echo "- Check PM2 status: pm2 status"
    echo "- View PM2 logs: pm2 logs"
    echo "- Restart services: pm2 restart all"
    echo "- View Nginx logs: sudo tail -f /var/log/nginx/error.log"
    echo ""
    print_success "Deployment script completed successfully! 🚀"
}

# Run main function
main "$@"
