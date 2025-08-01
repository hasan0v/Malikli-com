#!/bin/bash

# =============================================================================
# MALIKLI.COM - AUTOMATED UNRESERVATION DEPLOYMENT (ALMALINUX)
# =============================================================================
# This script deploys the automated unreservation system on AlmaLinux server
# =============================================================================

set -e

# Configuration
APP_USER="malikli"
APP_DIR="/var/www/malikli1992.com"
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${CYAN}===============================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}===============================================${NC}"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as correct user
check_user() {
    if [[ "$(whoami)" != "$APP_USER" ]]; then
        print_error "This script must be run as user '$APP_USER'"
        print_error "Please run: sudo su - $APP_USER"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if in correct directory
    if [[ ! -d "$BACKEND_DIR" ]]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        print_error "Please ensure the application is deployed first"
        exit 1
    fi
    
    # Check if virtual environment exists
    if [[ ! -d "$VENV_DIR" ]]; then
        print_error "Virtual environment not found: $VENV_DIR"
        print_error "Please create virtual environment first"
        exit 1
    fi
    
    # Check if .env exists
    if [[ ! -f "$BACKEND_DIR/.env" ]]; then
        print_error "Environment file not found: $BACKEND_DIR/.env"
        print_error "Please configure environment variables first"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Test database connection
test_database() {
    print_step "Testing database connection..."
    
    cd "$BACKEND_DIR"
    source "$VENV_DIR/bin/activate"
    
    if python automated_unreservation_standalone.py --dry-run --quiet; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        print_error "Please check your .env configuration"
        exit 1
    fi
}

# Choose deployment method
choose_deployment_method() {
    print_step "Choose deployment method:"
    echo "1) Systemd Timer (Recommended for production)"
    echo "2) Cron Job (Traditional method)"
    echo "3) Background Service (Continuous operation)"
    echo "4) Manual setup (I'll configure myself)"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1) deploy_systemd_timer ;;
        2) deploy_cron_job ;;
        3) deploy_background_service ;;
        4) manual_setup ;;
        *) print_error "Invalid choice"; exit 1 ;;
    esac
}

# Deploy systemd timer
deploy_systemd_timer() {
    print_step "Setting up Systemd Timer..."
    
    # Create service file
    sudo tee /etc/systemd/system/malikli-unreservation.service > /dev/null << EOF
[Unit]
Description=Malikli Automated Unreservation
After=network.target

[Service]
Type=oneshot
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$BACKEND_DIR
Environment=PYTHONPATH=$BACKEND_DIR
ExecStart=$VENV_DIR/bin/python $BACKEND_DIR/automated_unreservation_standalone.py --quiet
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$APP_DIR
ProtectHome=yes
EOF

    # Create timer file
    sudo tee /etc/systemd/system/malikli-unreservation.timer > /dev/null << EOF
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

    # Enable and start
    sudo systemctl daemon-reload
    sudo systemctl enable malikli-unreservation.timer
    sudo systemctl start malikli-unreservation.timer
    
    print_success "Systemd Timer deployed successfully!"
    print_step "Status:"
    sudo systemctl status malikli-unreservation.timer --no-pager
}

# Deploy cron job
deploy_cron_job() {
    print_step "Setting up Cron Job..."
    
    cd "$BACKEND_DIR"
    if [[ -f "setup_automated_unreservation_cron.sh" ]]; then
        chmod +x setup_automated_unreservation_cron.sh
        ./setup_automated_unreservation_cron.sh install
        print_success "Cron job deployed successfully!"
        ./setup_automated_unreservation_cron.sh status
    else
        print_error "Cron setup script not found"
        exit 1
    fi
}

# Deploy background service
deploy_background_service() {
    print_step "Setting up Background Service..."
    
    sudo tee /etc/systemd/system/malikli-unreservation-daemon.service > /dev/null << EOF
[Unit]
Description=Malikli Automated Unreservation Daemon
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$BACKEND_DIR
Environment=PYTHONPATH=$BACKEND_DIR
ExecStart=$VENV_DIR/bin/python $BACKEND_DIR/unreservation_scheduler.py
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

    sudo systemctl daemon-reload
    sudo systemctl enable malikli-unreservation-daemon.service
    sudo systemctl start malikli-unreservation-daemon.service
    
    print_success "Background service deployed successfully!"
    print_step "Status:"
    sudo systemctl status malikli-unreservation-daemon.service --no-pager
}

# Manual setup instructions
manual_setup() {
    print_step "Manual Setup Instructions:"
    echo ""
    echo "1. For Systemd Timer:"
    echo "   sudo systemctl enable malikli-unreservation.timer"
    echo "   sudo systemctl start malikli-unreservation.timer"
    echo ""
    echo "2. For Cron Job:"
    echo "   cd $BACKEND_DIR"
    echo "   ./setup_automated_unreservation_cron.sh install"
    echo ""
    echo "3. For Background Service:"
    echo "   sudo systemctl enable malikli-unreservation-daemon.service"
    echo "   sudo systemctl start malikli-unreservation-daemon.service"
    echo ""
    print_success "Manual setup instructions provided"
}

# Setup log rotation
setup_log_rotation() {
    print_step "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/malikli-unreservation > /dev/null << EOF
$BACKEND_DIR/automated_unreservation*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su $APP_USER $APP_USER
}
EOF

    print_success "Log rotation configured"
}

# Setup monitoring
setup_monitoring() {
    print_step "Setting up monitoring..."
    
    # Create health check script
    cat > "$BACKEND_DIR/health_check.sh" << EOF
#!/bin/bash
BACKEND_DIR="$BACKEND_DIR"
LOG_FILE="\$BACKEND_DIR/health_check.log"

cd "\$BACKEND_DIR"
source venv/bin/activate

# Run health check
if python monitor_unreservation.py --check-health >> "\$LOG_FILE" 2>&1; then
    echo "[\$(date)] Health check passed" >> "\$LOG_FILE"
else
    echo "[\$(date)] Health check failed" >> "\$LOG_FILE"
fi
EOF

    chmod +x "$BACKEND_DIR/health_check.sh"
    
    # Add to cron for daily health checks
    (crontab -l 2>/dev/null; echo "0 8 * * * $BACKEND_DIR/health_check.sh") | crontab -
    
    print_success "Health monitoring configured"
}

# Run tests
run_tests() {
    print_step "Running validation tests..."
    
    cd "$BACKEND_DIR"
    source "$VENV_DIR/bin/activate"
    
    # Test standalone script
    print_step "Testing standalone script..."
    if python automated_unreservation_standalone.py --dry-run --verbose; then
        print_success "Standalone script test passed"
    else
        print_error "Standalone script test failed"
        return 1
    fi
    
    # Test Django command
    print_step "Testing Django command..."
    if python manage.py automated_unreservation --dry-run --verbose; then
        print_success "Django command test passed"
    else
        print_warning "Django command test failed (this is acceptable if standalone works)"
    fi
    
    # Test monitoring
    print_step "Testing monitoring..."
    if python monitor_unreservation.py --check-health; then
        print_success "Monitoring test passed"
    else
        print_warning "Monitoring test failed"
    fi
    
    print_success "Validation tests completed"
}

# Show deployment summary
show_summary() {
    print_header "DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo ""
    print_success "✅ Automated unreservation system is now active!"
    echo ""
    echo "Configuration:"
    echo "• Cleanup interval: Every 5 minutes"
    echo "• Reservation timeout: 15 minutes"
    echo "• User: $APP_USER"
    echo "• Directory: $BACKEND_DIR"
    echo ""
    echo "Monitoring Commands:"
    echo "• Check status: sudo systemctl status malikli-unreservation*"
    echo "• View logs: tail -f $BACKEND_DIR/automated_unreservation*.log"
    echo "• System logs: sudo journalctl -u malikli-unreservation* -f"
    echo "• Health check: $BACKEND_DIR/health_check.sh"
    echo ""
    echo "Management Commands:"
    echo "• Manual run: cd $BACKEND_DIR && source venv/bin/activate && python automated_unreservation_standalone.py --verbose"
    echo "• Stop automation: sudo systemctl stop malikli-unreservation*"
    echo "• Start automation: sudo systemctl start malikli-unreservation*"
    echo ""
    print_success "🚀 Your inventory management is now fully automated!"
}

# Main function
main() {
    print_header "MALIKLI AUTOMATED UNRESERVATION DEPLOYMENT"
    echo "This script will deploy the automated unreservation system"
    echo "for cleaning up expired inventory reservations every 5 minutes."
    echo ""
    
    read -p "Do you want to continue? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_step "Deployment cancelled by user"
        exit 0
    fi
    
    # Run deployment steps
    check_user
    check_prerequisites
    test_database
    choose_deployment_method
    setup_log_rotation
    setup_monitoring
    run_tests
    show_summary
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    test)
        check_user
        check_prerequisites
        test_database
        run_tests
        ;;
    status)
        echo "Checking automation status..."
        if sudo systemctl is-active malikli-unreservation.timer >/dev/null 2>&1; then
            echo "✅ Systemd timer is active"
            sudo systemctl status malikli-unreservation.timer --no-pager
        elif crontab -l 2>/dev/null | grep -q "automated_unreservation"; then
            echo "✅ Cron job is active"
            crontab -l | grep automated_unreservation
        elif sudo systemctl is-active malikli-unreservation-daemon.service >/dev/null 2>&1; then
            echo "✅ Background service is active"
            sudo systemctl status malikli-unreservation-daemon.service --no-pager
        else
            echo "❌ No automation found"
        fi
        ;;
    logs)
        echo "Recent automation logs:"
        if [[ -f "$BACKEND_DIR/automated_unreservation.log" ]]; then
            tail -20 "$BACKEND_DIR/automated_unreservation.log"
        elif [[ -f "$BACKEND_DIR/automated_unreservation_cron.log" ]]; then
            tail -20 "$BACKEND_DIR/automated_unreservation_cron.log"
        else
            echo "No log files found"
        fi
        ;;
    help|*)
        echo "Usage: $0 [ACTION]"
        echo ""
        echo "Actions:"
        echo "  deploy  - Deploy the automated unreservation system (default)"
        echo "  test    - Test the system without deploying"
        echo "  status  - Check current automation status"
        echo "  logs    - Show recent logs"
        echo "  help    - Show this help"
        echo ""
        ;;
esac
