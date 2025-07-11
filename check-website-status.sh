#!/bin/bash

# =============================================================================
# Website Status Checker for malikli1992.com
# =============================================================================

echo "=== WEBSITE STATUS DIAGNOSTIC ==="
echo ""

# Check local services
echo "1. Checking local services..."
echo "Backend (port 8000):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8000/admin/ || echo "Backend not responding"

echo "Frontend (port 3000):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/ || echo "Frontend not responding"

echo ""
echo "2. Checking Nginx status..."
sudo systemctl status nginx --no-pager -l

echo ""
echo "3. Checking Nginx configuration..."
sudo nginx -t

echo ""
echo "4. Checking if ports are listening..."
echo "Port 80 (HTTP):"
sudo netstat -tlnp | grep :80 || echo "Port 80 not listening"
echo "Port 443 (HTTPS):"
sudo netstat -tlnp | grep :443 || echo "Port 443 not listening"
echo "Port 8000 (Backend):"
sudo netstat -tlnp | grep :8000 || echo "Port 8000 not listening"
echo "Port 3000 (Frontend):"
sudo netstat -tlnp | grep :3000 || echo "Port 3000 not listening"

echo ""
echo "5. Checking DNS resolution..."
nslookup malikli1992.com

echo ""
echo "6. Checking SSL certificate..."
if [[ -f "/etc/letsencrypt/live/malikli1992.com/fullchain.pem" ]]; then
    echo "SSL certificate exists"
    sudo openssl x509 -in /etc/letsencrypt/live/malikli1992.com/fullchain.pem -noout -dates
else
    echo "SSL certificate not found"
fi

echo ""
echo "7. Checking Nginx sites..."
echo "Available sites:"
ls -la /etc/nginx/sites-available/
echo ""
echo "Enabled sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "8. Checking firewall..."
sudo firewall-cmd --list-all

echo ""
echo "9. Testing external access..."
echo "Testing HTTP:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://malikli1992.com/ || echo "HTTP not accessible"
echo "Testing HTTPS:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://malikli1992.com/ || echo "HTTPS not accessible"

echo ""
echo "10. Checking recent Nginx error logs..."
echo "Last 10 lines of Nginx error log:"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No Nginx error log found"

echo ""
echo "=== DIAGNOSTIC COMPLETE ==="
