#!/bin/bash
# scripts/setup-cron-jobs.sh
# Script to set up cron jobs for inventory management

# Make sure we're in the right directory
cd "$(dirname "$0")/../backend"

echo "Setting up cron jobs for inventory management..."

# Create the cron job entries
cat << 'EOF' > /tmp/malikli_cron_jobs
# Malikli.com Inventory Management Cron Jobs

# Clean up expired inventory reservations every 5 minutes
*/5 * * * * cd /path/to/your/project/backend && python manage.py cleanup_expired_reservations >> /var/log/malikli/inventory_cleanup.log 2>&1

# Check pending payments and update order statuses every 15 minutes
*/15 * * * * cd /path/to/your/project/backend && python manage.py check_pending_payments --cleanup-reservations >> /var/log/malikli/payment_check.log 2>&1

# Clean up old sessions daily at 2 AM
0 2 * * * cd /path/to/your/project/backend && python manage.py cleanup_sessions >> /var/log/malikli/session_cleanup.log 2>&1

# Generate low stock report daily at 9 AM
0 9 * * * cd /path/to/your/project/backend && python manage.py cleanup_expired_reservations --dry-run | grep "Low stock" >> /var/log/malikli/low_stock_report.log 2>&1

EOF

echo "Cron job template created at /tmp/malikli_cron_jobs"
echo ""
echo "To install these cron jobs:"
echo "1. Edit /tmp/malikli_cron_jobs and update the path to your project"
echo "2. Create log directory: sudo mkdir -p /var/log/malikli && sudo chown $USER:$USER /var/log/malikli"
echo "3. Install cron jobs: crontab /tmp/malikli_cron_jobs"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To edit cron jobs: crontab -e"
