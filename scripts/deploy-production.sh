#!/bin/bash

# =============================================================================
# MALIKLI.COM - PRODUCTION DEPLOYMENT SCRIPT FOR ALMALINUX
# =============================================================================
# This script deploys the complete Malikli.com application to production
# Domain: malikli1992.com
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
PROJECT_NAME="malikli-store"
BRANCH="main"

# Derived paths
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SCRIPTS_DIR="$APP_DIR/scripts"
LOGS_DIR="$APP_DIR/logs"

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

# Function to check if service is running
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
        printf '  %s\n' "${missing_vars[@]}"
        return 1
    fi
    
    print_success "$env_file validation passed!"
    return 0
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if running as app user
    if [[ "$USER" != "$APP_USER" ]]; then
        print_error "This script must be run as user '$APP_USER'"
        print_error "Switch to $APP_USER: sudo su - $APP_USER"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ "$PWD" != "$APP_DIR" ]]; then
        print_error "This script must be run from $APP_DIR"
        print_error "Change directory: cd $APP_DIR"
        exit 1
    fi
    
    # Check required commands
    local required_commands=("node" "npm" "python3" "pip3" "git" "pm2")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            print_error "Required command '$cmd' not found."
            print_error "Please run the server setup script first."
            exit 1
        fi
    done
    
    print_success "Prerequisites check passed!"
}

# Function to backup current deployment
backup_deployment() {
    print_step "Creating deployment backup..."
    
    local backup_dir="$APP_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup current code if it exists
    if [[ -d "$BACKEND_DIR" ]]; then
        cp -r "$BACKEND_DIR" "$backup_dir/backend_backup"
    fi
    
    if [[ -d "$FRONTEND_DIR" ]]; then
        cp -r "$FRONTEND_DIR" "$backup_dir/frontend_backup"
    fi
    
    # Backup PM2 configuration
    if pm2 list | grep -q "$PROJECT_NAME"; then
        pm2 dump > "$backup_dir/pm2_processes.json"
    fi
    
    print_success "Backup created at $backup_dir"
}

# Function to pull latest code
pull_code() {
    print_step "Pulling latest code from repository..."
    
    # If git repo exists, pull latest changes
    if [[ -d ".git" ]]; then
        git fetch origin
        git reset --hard origin/$BRANCH
        git clean -fd
    else
        print_error "No git repository found. Please clone the repository first:"
        print_error "git clone https://github.com/hasan0v/Malikli-com.git $APP_DIR"
        exit 1
    fi
    
    print_success "Code updated to latest version!"
}

# Function to setup environment files
setup_environment() {
    print_step "Setting up environment files..."
    
    # Backend environment
    if [[ ! -f "$BACKEND_DIR/.env" ]]; then
        if [[ -f "$BACKEND_DIR/.env.production.template" ]]; then
            cp "$BACKEND_DIR/.env.production.template" "$BACKEND_DIR/.env"
            print_warning "Backend .env file created from template."
            print_warning "Please edit $BACKEND_DIR/.env with your actual values!"
        else
            print_error "No backend environment template found!"
            exit 1
        fi
    fi
    
    # Frontend environment
    if [[ ! -f "$FRONTEND_DIR/.env.local" ]]; then
        if [[ -f "$FRONTEND_DIR/.env.production.template" ]]; then
            cp "$FRONTEND_DIR/.env.production.template" "$FRONTEND_DIR/.env.local"
            print_warning "Frontend .env.local file created from template."
            print_warning "Please edit $FRONTEND_DIR/.env.local with your actual values!"
        else
            print_error "No frontend environment template found!"
            exit 1
        fi
    fi
    
    print_success "Environment files ready!"
}

# Function to validate environment
validate_environment() {
    print_step "Validating environment configuration..."
    
    # Backend required variables
    local backend_required_vars=(
        "SECRET_KEY"
        "DATABASE_URL"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_STORAGE_BUCKET_NAME"
        "AWS_S3_ENDPOINT_URL"
        "RESEND_API_KEY"
        "PAYPRO_BPC_SHOP_ID"
        "PAYPRO_BPC_SECRET_KEY"
    )
    
    # Frontend required variables
    local frontend_required_vars=(
        "NEXT_PUBLIC_API_URL"
    )
    
    validate_env_file "$BACKEND_DIR/.env" "${backend_required_vars[@]}" || exit 1
    validate_env_file "$FRONTEND_DIR/.env.local" "${frontend_required_vars[@]}" || exit 1
    
    print_success "Environment validation completed!"
}

# Function to deploy backend
deploy_backend() {
    print_header "DEPLOYING BACKEND"
    
    cd "$BACKEND_DIR"
    
    # Create virtual environment if it doesn't exist
    if [[ ! -d "venv" ]]; then
        print_step "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    print_step "Activating virtual environment..."
    source venv/bin/activate
    
    # Upgrade pip and install dependencies
    print_step "Installing Python dependencies..."
    pip install --upgrade pip setuptools wheel
    pip install -r requirements.txt
    pip install gunicorn
    
    # Run database migrations
    print_step "Running database migrations..."
    python manage.py migrate --noinput
    
    # Collect static files
    print_step "Collecting static files..."
    python manage.py collectstatic --noinput --clear
    
    # Test Django configuration
    print_step "Testing Django configuration..."
    python manage.py check --deploy
    
    # Create superuser if it doesn't exist (optional)
    print_step "Checking for superuser..."
    if python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); print('Superuser exists' if User.objects.filter(is_superuser=True).exists() else 'No superuser')"; then
        print_status "Superuser check completed."
    fi
    
    cd "$APP_DIR"
    print_success "Backend deployment completed!"
}

# Function to deploy frontend
deploy_frontend() {
    print_header "DEPLOYING FRONTEND"
    
    cd "$FRONTEND_DIR"

    # Check if .env.local exists
    if [[ ! -f ".env.local" ]]; then
        print_error ".env.local file not found in frontend directory"
        print_error "Please copy .env.production.template to .env.local and configure it"
        exit 1
    fi

    # Clear cache and install dependencies
    print_step "Installing Node.js dependencies..."
    rm -rf node_modules package-lock.json .next
    npm install

    # Build the application
    print_step "Building Next.js application..."
    npm run build

    # Test the build
    print_step "Testing Next.js build..."
    if [[ -d ".next" ]]; then
        print_success "Next.js build successful!"
    else
        print_error "Next.js build failed!"
        exit 1
    fi
    
    cd "$APP_DIR"
    print_success "Frontend deployment completed!"
}

# Function to configure Nginx
configure_nginx() {
    print_header "CONFIGURING NGINX"
    
    # Create Nginx configuration
    cat > "/tmp/nginx-$PROJECT_NAME.conf" << 'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name malikli1992.com www.malikli1992.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name malikli1992.com www.malikli1992.com;

    # SSL Configuration (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/malikli1992.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/malikli1992.com/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' https:; connect-src 'self' https:; media-src 'self' https:; object-src 'none'; frame-src 'none';" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml;

    # Client settings
    client_max_body_size 20M;
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;

    # Logging
    access_log /var/log/nginx/malikli_access.log;
    error_log /var/log/nginx/malikli_error.log;

    # API routes - proxy to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files for Django
    location /static/ {
        alias /var/www/malikli1992.com/backend/staticfiles_collected/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }

    # Next.js static files
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Next.js image optimization
    location /_next/image {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Robots.txt
    location /robots.txt {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }

    # Sitemap
    location /sitemap.xml {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }

    # Next.js application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Security: Block access to sensitive files
    location ~ /\.(ht|git|env) {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /\.well-known {
        allow all;
    }
}
EOF

    # Install Nginx configuration
    sudo cp "/tmp/nginx-$PROJECT_NAME.conf" "/etc/nginx/sites-available/$PROJECT_NAME"
    sudo ln -sf "/etc/nginx/sites-available/$PROJECT_NAME" "/etc/nginx/sites-enabled/"
    
    # Remove default site if it exists
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    if sudo nginx -t; then
        print_success "Nginx configuration is valid!"
    else
        print_error "Nginx configuration is invalid!"
        exit 1
    fi
    
    print_success "Nginx configured successfully!"
}

# Function to setup PM2 processes
setup_pm2() {
    print_header "SETTING UP PM2 PROCESSES"
    
    # Create necessary log directories
    mkdir -p "$LOGS_DIR"/{pm2,django,nginx}
    
    # Create PM2 ecosystem configuration
    cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'malikli-backend',
      cwd: '$BACKEND_DIR',
      script: './start-backend.sh',
      env: {
        NODE_ENV: 'production',
        DJANGO_SETTINGS_MODULE: 'backend.settings'
      },
      error_file: '$LOGS_DIR/pm2/malikli-backend-error.log',
      out_file: '$LOGS_DIR/pm2/malikli-backend-out.log',
      log_file: '$LOGS_DIR/pm2/malikli-backend.log',
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      autorestart: true
    },
    {
      name: 'malikli-frontend',
      cwd: '$FRONTEND_DIR',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: $FRONTEND_PORT
      },
      error_file: '$LOGS_DIR/pm2/malikli-frontend-error.log',
      out_file: '$LOGS_DIR/pm2/malikli-frontend-out.log',
      log_file: '$LOGS_DIR/pm2/malikli-frontend.log',
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      autorestart: true
    }
  ]
};
EOF

    # Create backend start script (replaces any old start-backend.sh with new one)
    cat > "$BACKEND_DIR/start-backend.sh" << EOF
#!/bin/bash
# Django Backend Startup Script for PM2

cd $BACKEND_DIR

# Activate virtual environment
source venv/bin/activate

# Set Django settings module
export DJANGO_SETTINGS_MODULE=backend.settings

# Export Python path
export PYTHONPATH=$BACKEND_DIR:\$PYTHONPATH

# Create log directories if they don't exist
mkdir -p $LOGS_DIR/django

# Start gunicorn with simpler configuration
exec gunicorn --bind 127.0.0.1:$BACKEND_PORT --workers 3 --timeout 120 --max-requests 1000 --preload --chdir $BACKEND_DIR backend.wsgi:application
EOF

    chmod +x "$BACKEND_DIR/start-backend.sh"
    
    # Stop existing PM2 processes
    pm2 delete all 2>/dev/null || true
    
    # Start new PM2 processes
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup
    print_warning "Please run the command shown above (if any) as root to complete PM2 startup setup."
    
    print_success "PM2 processes configured and started!"
}

# Function to setup SSL certificate
setup_ssl() {
    print_step "Setting up SSL certificate..."
    
    # Check if certificate already exists
    if sudo test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
        print_success "SSL certificate already exists for $DOMAIN"
        return 0
    fi
    
    print_warning "SSL certificate not found for $DOMAIN"
    read -p "Do you want to install SSL certificate now? (y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Get SSL certificate
        sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN"
        
        if sudo test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
            print_success "SSL certificate installed successfully!"
        else
            print_error "SSL certificate installation failed!"
            return 1
        fi
    else
        print_warning "SSL certificate not installed. Site will use HTTP configuration."
        
        # Create temporary HTTP-only configuration
        cat > "/tmp/nginx-$PROJECT_NAME-http.conf" << 'EOF'
server {
    listen 80;
    server_name malikli1992.com www.malikli1992.com;

    # Security headers (basic)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client settings
    client_max_body_size 20M;

    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /var/www/malikli1992.com/backend/staticfiles_collected/;
        expires 30d;
    }

    # Next.js application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
        sudo cp "/tmp/nginx-$PROJECT_NAME-http.conf" "/etc/nginx/sites-available/$PROJECT_NAME"
    fi
}

# Function to restart services
restart_services() {
    print_step "Restarting services..."
    
    # Restart Nginx
    sudo systemctl restart nginx
    
    # Restart PM2 processes
    pm2 restart all
    
    print_success "Services restarted!"
}

# Function to verify deployment
verify_deployment() {
    print_header "VERIFYING DEPLOYMENT"
    
    sleep 5  # Wait for services to start
    
    # Check Nginx status
    if sudo systemctl is-active --quiet nginx; then
        print_success "✅ Nginx is running"
    else
        print_error "❌ Nginx is not running"
    fi
    
    # Check PM2 processes
    if pm2 list | grep -q "online"; then
        print_success "✅ PM2 processes are running"
    else
        print_error "❌ PM2 processes are not running properly"
    fi
    
    # Check backend health
    if curl -s "http://localhost:$BACKEND_PORT/admin/" > /dev/null; then
        print_success "✅ Backend is responding"
    else
        print_error "❌ Backend is not responding"
    fi
    
    # Check frontend health
    if curl -s "http://localhost:$FRONTEND_PORT/" > /dev/null; then
        print_success "✅ Frontend is responding"
    else
        print_error "❌ Frontend is not responding"
    fi
    
    # Show process status
    print_step "Process Status:"
    pm2 status
    
    print_success "Deployment verification completed!"
}

# Function to show deployment summary
show_summary() {
    print_header "DEPLOYMENT SUMMARY"
    echo ""
    print_success "🎉 Malikli.com deployment completed successfully!"
    echo ""
    echo "📊 Application Information:"
    echo "• Domain: https://$DOMAIN"
    echo "• Frontend: https://$DOMAIN"
    echo "• API: https://$DOMAIN/api/v1/"
    echo "• Admin: https://$DOMAIN/admin/"
    echo "• Application Directory: $APP_DIR"
    echo ""
    echo "🔧 Service Management:"
    echo "• Check PM2 status: pm2 status"
    echo "• View PM2 logs: pm2 logs"
    echo "• Restart PM2 services: pm2 restart all"
    echo "• View Nginx logs: sudo tail -f /var/log/nginx/malikli_error.log"
    echo "• Restart Nginx: sudo systemctl restart nginx"
    echo ""
    echo "📁 Important Directories:"
    echo "• Application: $APP_DIR"
    echo "• Backend: $BACKEND_DIR"
    echo "• Frontend: $FRONTEND_DIR"
    echo "• Logs: $LOGS_DIR"
    echo "• Backups: $APP_DIR/backups"
    echo ""
    echo "🔒 Security Notes:"
    echo "• SSL certificate status: $(sudo test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && echo "✅ Installed" || echo "❌ Not installed")"
    echo "• Firewall status: $(sudo systemctl is-active firewalld)"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Test your application: https://$DOMAIN"
    echo "2. Create Django superuser: cd $BACKEND_DIR && source venv/bin/activate && python manage.py createsuperuser"
    echo "3. Set up monitoring and alerts"
    echo "4. Configure automated backups"
    echo "5. Set up log rotation"
    echo ""
    print_success "Deployment completed! 🚀"
}

# Main deployment function
main() {
    print_header "MALIKLI.COM - PRODUCTION DEPLOYMENT"
    echo "This script will deploy your application to production on:"
    echo "• Domain: $DOMAIN"
    echo "• Directory: $APP_DIR"
    echo ""
    
    read -p "Do you want to continue with the deployment? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled by user."
        exit 0
    fi
    
    # Deployment steps
    check_prerequisites
    backup_deployment
    pull_code
    setup_environment
    validate_environment
    deploy_backend
    deploy_frontend
    configure_nginx
    setup_pm2
    setup_ssl
    restart_services
    verify_deployment
    show_summary
}

# Run main function
main "$@"
