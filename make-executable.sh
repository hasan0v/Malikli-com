#!/bin/bash

# =============================================================================
# MALIKLI.COM - MAKE SCRIPTS EXECUTABLE
# =============================================================================
# This script makes all deployment scripts executable
# =============================================================================

echo "Making deployment scripts executable..."

# Make scripts executable
chmod +x scripts/setup-almalinux-server.sh
chmod +x scripts/deploy-production.sh
chmod +x scripts/maintenance.sh

echo "✅ All scripts are now executable!"
echo ""
echo "Available scripts:"
echo "• scripts/setup-almalinux-server.sh  - Initial server setup"
echo "• scripts/deploy-production.sh       - Deploy application"
echo "• scripts/maintenance.sh            - Maintenance utilities"
echo ""
echo "Usage examples:"
echo "  ./scripts/setup-almalinux-server.sh"
echo "  ./scripts/deploy-production.sh"
echo "  ./scripts/maintenance.sh status"
