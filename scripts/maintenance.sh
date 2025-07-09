#!/bin/bash

# =============================================================================
# MALIKLI.COM - MAINTENANCE AND MONITORING SCRIPT
# =============================================================================
# This script provides maintenance and monitoring utilities
# =============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
DOMAIN="malikli1992.com"
APP_USER="malikli"
APP_DIR="/var/www/malikli1992.com"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOGS_DIR="$APP_DIR/logs"

# Function to print colored output
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
print_success() { echo -e "${PURPLE}[SUCCESS]${NC} $1"; }
print_header() {
    echo -e "${CYAN}===============================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}===============================================${NC}"
}

# Function to check system status
check_system_status() {
    print_header "SYSTEM STATUS"
    
    echo "🖥️  System Information:"
    echo "   OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2)"
    echo "   Uptime: $(uptime -p)"
    echo "   Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo ""
    
    echo "💾 Memory Usage:"
    free -h
    echo ""
    
    echo "💽 Disk Usage:"
    df -h / /var /tmp
    echo ""
    
    echo "🔥 CPU Usage:"
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1"%"}'
    echo ""
    
    echo "🌐 Network Connections:"
    ss -tuln | grep -E ':(80|443|3000|8000|22)'
    echo ""
}

# Function to check service status
check_services() {
    print_header "SERVICE STATUS"
    
    services=("nginx" "firewalld" "redis")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            echo -e "✅ $service: ${GREEN}RUNNING${NC}"
        else
            echo -e "❌ $service: ${RED}STOPPED${NC}"
        fi
    done
    
    echo ""
    echo "📦 PM2 Processes:"
    pm2 status
    echo ""
}

# Function to check application health
check_app_health() {
    print_header "APPLICATION HEALTH"
    
    # Backend health check
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/admin/" | grep -q "200\|301\|302"; then
        echo -e "✅ Backend: ${GREEN}HEALTHY${NC}"
    else
        echo -e "❌ Backend: ${RED}UNHEALTHY${NC}"
    fi
    
    # Frontend health check
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/" | grep -q "200"; then
        echo -e "✅ Frontend: ${GREEN}HEALTHY${NC}"
    else
        echo -e "❌ Frontend: ${RED}UNHEALTHY${NC}"
    fi
    
    # Domain health check
    if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" | grep -q "200"; then
        echo -e "✅ Domain ($DOMAIN): ${GREEN}ACCESSIBLE${NC}"
    else
        echo -e "❌ Domain ($DOMAIN): ${RED}NOT ACCESSIBLE${NC}"
    fi
    
    echo ""
}

# Function to show logs
show_logs() {
    print_header "APPLICATION LOGS"
    
    echo "📊 Recent PM2 Logs:"
    pm2 logs --lines 10
    echo ""
    
    echo "🔍 Recent Nginx Error Logs:"
    sudo tail -n 10 /var/log/nginx/malikli_error.log 2>/dev/null || echo "No Nginx error logs found"
    echo ""
    
    echo "📈 Recent Django Logs:"
    tail -n 10 "$BACKEND_DIR/django.log" 2>/dev/null || echo "No Django logs found"
    echo ""
}

# Function to create backup
create_backup() {
    print_header "CREATING BACKUP"
    
    local backup_dir="$APP_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    print_step "Creating application backup..."
    
    # Backup code
    if [[ -d "$BACKEND_DIR" ]]; then
        tar -czf "$backup_dir/backend_code.tar.gz" -C "$APP_DIR" backend --exclude="backend/venv" --exclude="backend/__pycache__" --exclude="backend/.env"
    fi
    
    if [[ -d "$FRONTEND_DIR" ]]; then
        tar -czf "$backup_dir/frontend_code.tar.gz" -C "$APP_DIR" frontend --exclude="frontend/node_modules" --exclude="frontend/.next" --exclude="frontend/.env.local"
    fi
    
    # Backup configurations
    cp -r /etc/nginx/sites-available "$backup_dir/nginx_config" 2>/dev/null || true
    pm2 dump > "$backup_dir/pm2_processes.json" 2>/dev/null || true
    
    # Backup environment files (without sensitive data)
    if [[ -f "$BACKEND_DIR/.env" ]]; then
        grep -v -E "(SECRET_KEY|PASSWORD|API_KEY)" "$BACKEND_DIR/.env" > "$backup_dir/backend_env_template.txt" 2>/dev/null || true
    fi
    
    # Create backup info
    cat > "$backup_dir/backup_info.txt" << EOF
Backup Created: $(date)
Domain: $DOMAIN
Application Directory: $APP_DIR
System: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)
Kernel: $(uname -r)
Git Commit: $(cd "$APP_DIR" && git rev-parse HEAD 2>/dev/null || echo "Not available")
Git Branch: $(cd "$APP_DIR" && git branch --show-current 2>/dev/null || echo "Not available")
EOF
    
    # Calculate backup size
    local backup_size=$(du -sh "$backup_dir" | cut -f1)
    
    print_success "Backup created: $backup_dir ($backup_size)"
    
    # Clean old backups (keep last 5)
    print_step "Cleaning old backups..."
    find "$APP_DIR/backups" -maxdepth 1 -type d -name "20*" | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
    
    print_success "Backup process completed!"
}

# Function to restart services
restart_services() {
    print_header "RESTARTING SERVICES"
    
    print_step "Restarting PM2 processes..."
    pm2 restart all
    
    print_step "Reloading Nginx..."
    sudo systemctl reload nginx
    
    sleep 3
    
    print_success "Services restarted successfully!"
    check_app_health
}

# Function to update application
update_application() {
    print_header "UPDATING APPLICATION"
    
    print_warning "This will update the application from the git repository."
    read -p "Continue? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    # Create backup before update
    create_backup
    
    # Pull latest code
    print_step "Pulling latest code..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
    
    # Update backend
    print_step "Updating backend dependencies..."
    cd "$BACKEND_DIR"
    source venv/bin/activate
    pip install -r requirements.txt
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput --clear
    
    # Update frontend
    print_step "Updating frontend..."
    cd "$FRONTEND_DIR"
    npm ci --production=false
    npm run build
    
    # Restart services
    cd "$APP_DIR"
    restart_services
    
    print_success "Application updated successfully!"
}

# Function to show SSL certificate info
check_ssl() {
    print_header "SSL CERTIFICATE STATUS"
    
    if sudo test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
        echo -e "✅ SSL Certificate: ${GREEN}INSTALLED${NC}"
        
        # Show certificate details
        echo ""
        echo "📋 Certificate Details:"
        sudo openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before|Not After)"
        
        # Check expiration
        local expiry_date=$(sudo openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -enddate -noout | cut -d= -f2)
        local expiry_epoch=$(date -d "$expiry_date" +%s)
        local current_epoch=$(date +%s)
        local days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        echo ""
        if [[ $days_left -gt 30 ]]; then
            echo -e "🗓️  Certificate expires in: ${GREEN}$days_left days${NC}"
        elif [[ $days_left -gt 7 ]]; then
            echo -e "🗓️  Certificate expires in: ${YELLOW}$days_left days${NC}"
        else
            echo -e "🗓️  Certificate expires in: ${RED}$days_left days${NC} - RENEWAL NEEDED!"
        fi
    else
        echo -e "❌ SSL Certificate: ${RED}NOT INSTALLED${NC}"
        echo ""
        echo "To install SSL certificate:"
        echo "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    fi
    echo ""
}

# Function to show resource usage
show_resource_usage() {
    print_header "RESOURCE USAGE"
    
    echo "📊 Top Processes by CPU:"
    ps aux --sort=-%cpu | head -11
    echo ""
    
    echo "📊 Top Processes by Memory:"
    ps aux --sort=-%mem | head -11
    echo ""
    
    echo "📊 PM2 Process Details:"
    pm2 monit
    echo ""
}

# Function to cleanup system
cleanup_system() {
    print_header "SYSTEM CLEANUP"
    
    print_step "Cleaning package cache..."
    sudo dnf clean all
    
    print_step "Cleaning log files..."
    sudo journalctl --vacuum-time=7d
    
    print_step "Cleaning PM2 logs..."
    pm2 flush
    
    print_step "Cleaning temporary files..."
    sudo find /tmp -type f -atime +7 -delete 2>/dev/null || true
    
    print_step "Cleaning old backups..."
    find "$APP_DIR/backups" -maxdepth 1 -type d -name "20*" | sort -r | tail -n +8 | xargs rm -rf 2>/dev/null || true
    
    print_success "System cleanup completed!"
}

# Function to show help
show_help() {
    echo "Malikli.com Maintenance Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  status      - Show system and application status"
    echo "  health      - Check application health"
    echo "  logs        - Show recent logs"
    echo "  backup      - Create application backup"
    echo "  restart     - Restart services"
    echo "  update      - Update application from git"
    echo "  ssl         - Check SSL certificate status"
    echo "  resources   - Show resource usage"
    echo "  cleanup     - Clean system files and logs"
    echo "  monitor     - Show comprehensive monitoring dashboard"
    echo "  help        - Show this help message"
    echo ""
}

# Function to show monitoring dashboard
show_monitor() {
    while true; do
        clear
        print_header "MALIKLI.COM - MONITORING DASHBOARD"
        echo "Press Ctrl+C to exit, 'r' to refresh manually"
        echo ""
        
        check_system_status
        check_services
        check_app_health
        
        echo "🔄 Auto-refresh in 30 seconds..."
        
        # Wait with ability to interrupt
        for i in {30..1}; do
            echo -ne "\r🔄 Auto-refresh in $i seconds... "
            sleep 1
        done
        echo ""
    done
}

# Main function
main() {
    case "${1:-status}" in
        status)
            check_system_status
            check_services
            ;;
        health)
            check_app_health
            ;;
        logs)
            show_logs
            ;;
        backup)
            create_backup
            ;;
        restart)
            restart_services
            ;;
        update)
            update_application
            ;;
        ssl)
            check_ssl
            ;;
        resources)
            show_resource_usage
            ;;
        cleanup)
            cleanup_system
            ;;
        monitor)
            show_monitor
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
