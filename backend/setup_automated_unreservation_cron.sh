#!/bin/bash

# Automated Unreservation Cron Job Setup Script
# This script sets up a cron job for automated unreservation system

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
VENV_DIR="$BACKEND_DIR/venv"
PYTHON_EXE="$VENV_DIR/bin/python"
MANAGE_PY="$BACKEND_DIR/manage.py"

# Configuration
CRON_INTERVAL="*/5"  # Every 5 minutes
MAX_AGE_MINUTES="15"
LOG_FILE="$BACKEND_DIR/automated_unreservation.log"
LOCK_FILE="$BACKEND_DIR/automated_unreservation.lock"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

check_requirements() {
    log "Checking requirements..."
    
    # Check if virtual environment exists
    if [[ ! -f "$PYTHON_EXE" ]]; then
        error "Virtual environment not found at $VENV_DIR"
        error "Please ensure the virtual environment is set up correctly."
        exit 1
    fi
    
    # Check if manage.py exists
    if [[ ! -f "$MANAGE_PY" ]]; then
        error "Django manage.py not found at $MANAGE_PY"
        exit 1
    fi
    
    # Test Django command
    log "Testing Django command..."
    if ! "$PYTHON_EXE" "$MANAGE_PY" automated_unreservation --help >/dev/null 2>&1; then
        error "automated_unreservation command not available"
        exit 1
    fi
    
    log "Requirements check passed"
}

generate_cron_script() {
    local script_path="$BACKEND_DIR/run_automated_unreservation.sh"
    
    log "Generating cron execution script..."
    
    cat > "$script_path" << EOF
#!/bin/bash

# Automated unreservation cron execution script
# Generated automatically - do not edit manually

set -e

BACKEND_DIR="$BACKEND_DIR"
VENV_DIR="$VENV_DIR"
PYTHON_EXE="$PYTHON_EXE"
MANAGE_PY="$MANAGE_PY"
LOG_FILE="$LOG_FILE"
LOCK_FILE="$LOCK_FILE"
MAX_AGE_MINUTES="$MAX_AGE_MINUTES"

# Function to log with timestamp
log_with_timestamp() {
    echo "[\\$(date +'%Y-%m-%d %H:%M:%S')] \\$1" >> "\\$LOG_FILE"
}

# Function to acquire lock
acquire_lock() {
    if [[ -f "\\$LOCK_FILE" ]]; then
        local existing_pid=\\$(cat "\\$LOCK_FILE" 2>/dev/null || echo "")
        if [[ -n "\\$existing_pid" ]] && kill -0 "\\$existing_pid" 2>/dev/null; then
            log_with_timestamp "Another instance is already running (PID: \\$existing_pid)"
            exit 0
        else
            log_with_timestamp "Removing stale lock file"
            rm -f "\\$LOCK_FILE"
        fi
    fi
    
    echo \\$\\$ > "\\$LOCK_FILE"
    log_with_timestamp "Acquired lock (PID: \\$\\$)"
}

# Function to release lock
release_lock() {
    rm -f "\\$LOCK_FILE"
    log_with_timestamp "Released lock"
}

# Function to cleanup on exit
cleanup() {
    release_lock
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    log_with_timestamp "Starting automated unreservation cron job"
    
    # Change to backend directory
    cd "\\$BACKEND_DIR"
    
    # Acquire lock
    acquire_lock
    
    # Execute the automated unreservation command
    if "\\$PYTHON_EXE" "\\$MANAGE_PY" automated_unreservation \\
        --max-age-minutes "\\$MAX_AGE_MINUTES" \\
        --check-payments \\
        --quiet >> "\\$LOG_FILE" 2>&1; then
        log_with_timestamp "Automated unreservation completed successfully"
    else
        log_with_timestamp "ERROR: Automated unreservation failed"
        exit 1
    fi
}

# Run main function
main
EOF

    chmod +x "$script_path"
    log "Cron execution script created at $script_path"
}

install_cron_job() {
    local cron_script="$BACKEND_DIR/run_automated_unreservation.sh"
    local cron_entry="$CRON_INTERVAL * * * * $cron_script"
    
    log "Installing cron job..."
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "$cron_script"; then
        warn "Cron job already exists. Removing existing entry..."
        crontab -l 2>/dev/null | grep -v "$cron_script" | crontab -
    fi
    
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    
    log "Cron job installed successfully"
    log "Schedule: Every 5 minutes"
    log "Script: $cron_script"
    log "Log file: $LOG_FILE"
}

remove_cron_job() {
    local cron_script="$BACKEND_DIR/run_automated_unreservation.sh"
    
    log "Removing cron job..."
    
    if crontab -l 2>/dev/null | grep -q "$cron_script"; then
        crontab -l 2>/dev/null | grep -v "$cron_script" | crontab -
        log "Cron job removed successfully"
    else
        warn "Cron job not found"
    fi
}

show_status() {
    local cron_script="$BACKEND_DIR/run_automated_unreservation.sh"
    
    log "Automated Unreservation Status:"
    echo "================================"
    
    # Check cron job
    if crontab -l 2>/dev/null | grep -q "$cron_script"; then
        echo -e "${GREEN}✓${NC} Cron job is installed"
        echo "  Schedule: Every 5 minutes"
        echo "  Script: $cron_script"
    else
        echo -e "${RED}✗${NC} Cron job is not installed"
    fi
    
    # Check lock file
    if [[ -f "$LOCK_FILE" ]]; then
        local pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}⚠${NC} Currently running (PID: $pid)"
        else
            echo -e "${YELLOW}⚠${NC} Stale lock file found"
        fi
    else
        echo -e "${GREEN}✓${NC} No active processes"
    fi
    
    # Check log file
    if [[ -f "$LOG_FILE" ]]; then
        local log_size=$(du -h "$LOG_FILE" | cut -f1)
        local last_entry=$(tail -n 1 "$LOG_FILE" 2>/dev/null || echo "No entries")
        echo -e "${GREEN}✓${NC} Log file exists ($log_size)"
        echo "  Last entry: $last_entry"
    else
        echo -e "${YELLOW}⚠${NC} Log file not found"
    fi
}

test_run() {
    log "Running test cleanup (dry-run mode)..."
    
    cd "$BACKEND_DIR"
    if "$PYTHON_EXE" "$MANAGE_PY" automated_unreservation --dry-run --verbose; then
        log "Test run completed successfully"
    else
        error "Test run failed"
        exit 1
    fi
}

show_logs() {
    if [[ -f "$LOG_FILE" ]]; then
        echo "Recent automated unreservation logs:"
        echo "==================================="
        tail -n 50 "$LOG_FILE"
    else
        warn "Log file not found at $LOG_FILE"
    fi
}

show_help() {
    echo
    echo "Automated Unreservation Cron Job Setup"
    echo "======================================="
    echo
    echo "Usage: $0 [ACTION]"
    echo
    echo "Actions:"
    echo "  install  - Install the cron job for automated unreservation"
    echo "  remove   - Remove the cron job"
    echo "  status   - Show current status"
    echo "  test     - Run a test cleanup (dry-run mode)"
    echo "  logs     - Show recent log entries"
    echo "  help     - Show this help message"
    echo
    echo "The cron job automatically cleans up expired product reservations"
    echo "every 5 minutes for orders older than 15 minutes with unpaid status."
    echo
    echo "Configuration:"
    echo "  Interval: Every 5 minutes"
    echo "  Max age: $MAX_AGE_MINUTES minutes"
    echo "  Log file: $LOG_FILE"
    echo
    echo "Examples:"
    echo "  $0 install"
    echo "  $0 status"
    echo "  $0 test"
    echo
}

# Main script logic
case "${1:-help}" in
    install)
        check_requirements
        generate_cron_script
        install_cron_job
        ;;
    remove)
        remove_cron_job
        ;;
    status)
        show_status
        ;;
    test)
        check_requirements
        test_run
        ;;
    logs)
        show_logs
        ;;
    help|*)
        show_help
        ;;
esac
