#!/bin/bash

# =============================================================================
# HTTP-Only Configuration for malikli1992.com (Temporary Fix)
# =============================================================================

echo "=== SETTING UP HTTP-ONLY CONFIGURATION ==="
echo ""

# Create HTTP-only Nginx configuration
echo "1. Creating HTTP-only Nginx configuration..."

sudo tee /etc/nginx/sites-available/malikli-store > /dev/null << 'EOF'
server {
    listen 80;
    server_name malikli1992.com www.malikli1992.com;

    # Security headers (basic)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
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

echo "2. Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid!"
    
    echo ""
    echo "3. Reloading Nginx..."
    sudo systemctl reload nginx
    
    echo ""
    echo "4. Testing website access..."
    sleep 3
    
    echo "HTTP test:"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://malikli1992.com/
    
    echo ""
    echo "✅ HTTP-only setup complete! Your website should now be accessible at:"
    echo "   http://malikli1992.com"
    echo ""
    echo "⚠️  Note: This is HTTP-only (not secure). Install SSL later with:"
    echo "   ./install-ssl.sh"
    
else
    echo "❌ Nginx configuration is invalid!"
    sudo nginx -t
fi

echo ""
echo "=== HTTP-ONLY SETUP COMPLETE ==="
