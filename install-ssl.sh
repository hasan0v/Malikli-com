#!/bin/bash

# =============================================================================
# SSL Certificate Installation for malikli1992.com
# =============================================================================

echo "=== INSTALLING SSL CERTIFICATE ==="
echo ""

# Install certbot if not already installed
echo "1. Installing certbot..."
sudo dnf install -y certbot python3-certbot-nginx

echo ""
echo "2. Getting SSL certificate for malikli1992.com..."
echo "This will automatically configure Nginx for HTTPS"

# Get SSL certificate
sudo certbot --nginx -d malikli1992.com -d www.malikli1992.com --non-interactive --agree-tos --email admin@malikli1992.com

echo ""
echo "3. Testing SSL certificate..."
if sudo test -f "/etc/letsencrypt/live/malikli1992.com/fullchain.pem"; then
    echo "✅ SSL certificate installed successfully!"
    
    # Test the certificate
    echo "Certificate details:"
    sudo openssl x509 -in /etc/letsencrypt/live/malikli1992.com/fullchain.pem -noout -dates
    
    # Restart nginx to apply changes
    echo ""
    echo "4. Restarting Nginx..."
    sudo systemctl restart nginx
    
    echo ""
    echo "5. Testing website access..."
    sleep 3
    
    echo "HTTP test:"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://malikli1992.com/
    
    echo "HTTPS test:"
    curl -s -o /dev/null -w "HTTPS Status: %{http_code}\n" https://malikli1992.com/
    
    echo ""
    echo "✅ SSL setup complete! Your website should now be accessible at:"
    echo "   https://malikli1992.com"
    
else
    echo "❌ SSL certificate installation failed!"
    echo "Let's check what went wrong..."
    sudo certbot certificates
fi

echo ""
echo "=== SSL INSTALLATION COMPLETE ==="
