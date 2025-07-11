#!/bin/bash

# Setup script for inventory and payment monitoring automation
# This script sets up cron jobs for automated inventory management

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")/backend"
PYTHON_EXEC="python"

echo "🚀 Setting up Malikli.com Inventory Monitoring System"
echo "Backend directory: $BACKEND_DIR"

# Check if we're in the right directory
if [ ! -f "$BACKEND_DIR/manage.py" ]; then
    echo "❌ Error: manage.py not found in $BACKEND_DIR"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "✅ Django project found"

# Test management commands
echo "🧪 Testing management commands..."

echo "  Testing cleanup_expired_reservations..."
cd "$BACKEND_DIR"
$PYTHON_EXEC manage.py cleanup_expired_reservations --dry-run --quiet

if [ $? -eq 0 ]; then
    echo "  ✅ cleanup_expired_reservations working"
else
    echo "  ❌ cleanup_expired_reservations failed"
    exit 1
fi

echo "  Testing check_pending_payments..."
$PYTHON_EXEC manage.py check_pending_payments --dry-run --max-age-hours 1 --verbose

if [ $? -eq 0 ]; then
    echo "  ✅ check_pending_payments working"
else
    echo "  ❌ check_pending_payments failed"
    exit 1
fi

# Create monitoring scripts
echo "📝 Creating monitoring scripts..."

# Create cleanup script
cat > "$SCRIPT_DIR/cleanup-reservations.sh" << 'EOF'
#!/bin/bash
# Automated inventory reservation cleanup
cd "$(dirname "$0")/../backend"
python manage.py cleanup_expired_reservations >> ../logs/cleanup.log 2>&1
EOF

# Create payment monitoring script
cat > "$SCRIPT_DIR/check-payments.sh" << 'EOF'
#!/bin/bash
# Automated payment status checking
cd "$(dirname "$0")/../backend"
python manage.py check_pending_payments --cleanup-reservations --max-age-hours 24 --auto-timeout-hours 2 >> ../logs/payments.log 2>&1
EOF

# Create comprehensive monitoring script
cat > "$SCRIPT_DIR/full-monitoring.sh" << 'EOF'
#!/bin/bash
# Comprehensive inventory and payment monitoring
cd "$(dirname "$0")/../backend"

echo "$(date): Starting comprehensive monitoring..." >> ../logs/monitoring.log

# 1. Clean expired reservations
python manage.py cleanup_expired_reservations >> ../logs/monitoring.log 2>&1

# 2. Check payment statuses and cleanup
python manage.py check_pending_payments \
    --cleanup-reservations \
    --check-orphaned-reservations \
    --max-age-hours 48 \
    --auto-timeout-hours 2 \
    --verbose >> ../logs/monitoring.log 2>&1

echo "$(date): Monitoring complete" >> ../logs/monitoring.log
echo "----------------------------------------" >> ../logs/monitoring.log
EOF

# Make scripts executable
chmod +x "$SCRIPT_DIR/cleanup-reservations.sh"
chmod +x "$SCRIPT_DIR/check-payments.sh" 
chmod +x "$SCRIPT_DIR/full-monitoring.sh"

echo "✅ Monitoring scripts created"

# Create logs directory
mkdir -p "$(dirname "$SCRIPT_DIR")/logs"
touch "$(dirname "$SCRIPT_DIR")/logs/cleanup.log"
touch "$(dirname "$SCRIPT_DIR")/logs/payments.log"
touch "$(dirname "$SCRIPT_DIR")/logs/monitoring.log"

echo "✅ Log files created"

# Display cron setup instructions
echo ""
echo "📅 CRON SETUP INSTRUCTIONS"
echo "=========================="
echo ""
echo "To set up automated monitoring, add these lines to your crontab:"
echo "(Run 'crontab -e' to edit)"
echo ""
echo "# Cleanup expired reservations every 15 minutes"
echo "*/15 * * * * $SCRIPT_DIR/cleanup-reservations.sh"
echo ""
echo "# Check payment statuses every hour"
echo "0 * * * * $SCRIPT_DIR/check-payments.sh"
echo ""
echo "# Comprehensive monitoring twice daily"
echo "0 6,18 * * * $SCRIPT_DIR/full-monitoring.sh"
echo ""
echo "OR for production servers with higher load:"
echo ""
echo "# More frequent cleanup (every 5 minutes)"
echo "*/5 * * * * $SCRIPT_DIR/cleanup-reservations.sh"
echo ""
echo "# Payment checks every 30 minutes"
echo "*/30 * * * * $SCRIPT_DIR/check-payments.sh"
echo ""

# Display manual usage
echo "🔧 MANUAL USAGE"
echo "==============="
echo ""
echo "Cleanup expired reservations:"
echo "  $SCRIPT_DIR/cleanup-reservations.sh"
echo ""
echo "Check payment statuses:"
echo "  $SCRIPT_DIR/check-payments.sh"
echo ""
echo "Full monitoring (recommended for troubleshooting):"
echo "  $SCRIPT_DIR/full-monitoring.sh"
echo ""

# Display Django command usage
echo "🐍 DJANGO COMMANDS"
echo "=================="
echo ""
echo "For testing and debugging, you can run Django commands directly:"
echo ""
echo "cd $BACKEND_DIR"
echo ""
echo "# Dry run cleanup (see what would be cleaned)"
echo "python manage.py cleanup_expired_reservations --dry-run --verbose"
echo ""
echo "# Check payments with detailed output"
echo "python manage.py check_pending_payments --dry-run --verbose --max-age-hours 24"
echo ""
echo "# Force timeout old orders"
echo "python manage.py check_pending_payments --force-timeout --auto-timeout-hours 1 --dry-run"
echo ""
echo "# Check for orphaned reservations"
echo "python manage.py check_pending_payments --check-orphaned-reservations --dry-run"
echo ""

echo "✅ Setup complete! Check the logs directory for monitoring output."
echo "📍 Logs location: $(dirname "$SCRIPT_DIR")/logs/"
