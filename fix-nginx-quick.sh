#!/bin/bash

# Quick Nginx Configuration Fix
# Run this on your server to fix the nginx configuration syntax error

set -e

echo "🔧 NGINX CONFIGURATION QUICK FIX"
echo "==============================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

NGINX_CONFIG="/etc/nginx/nginx.conf"
PROJECT_DIR="/home/deployuser/Malikli-son---Preview/"

echo "📁 Nginx config file: $NGINX_CONFIG"
echo "📁 Project directory: $PROJECT_DIR"

# Backup current nginx config
echo "💾 Creating backup..."
cp "$NGINX_CONFIG" "$NGINX_CONFIG.broken.backup.$(date +%Y%m%d_%H%M%S)"

# Create a working nginx configuration
echo "⚙️  Creating fixed nginx configuration..."

cat > "$NGINX_CONFIG" << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Redirect HTTP to HTTPS for both domains
    server {
        listen 80;
        server_name malikli1992.com www.malikli1992.com;
        return 301 https://malikli1992.com$request_uri;
    }

    # Redirect HTTPS www to non-www
    server {
        listen 443 ssl http2;
        server_name www.malikli1992.com;

        # SSL Configuration for www subdomain
        ssl_certificate /etc/letsencrypt/live/malikli1992.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/malikli1992.com/privkey.pem;
        
        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Redirect www to non-www
        return 301 https://malikli1992.com$request_uri;
    }

    # Main HTTPS server block for primary domain
    server {
        listen 443 ssl http2;
        server_name malikli1992.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/malikli1992.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/malikli1992.com/privkey.pem;
        
        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https: blob:; font-src 'self' data: https:;" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

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

        # Client max body size for file uploads
        client_max_body_size 20M;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        fastcgi_send_timeout 600s;
        fastcgi_read_timeout 600s;

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
            
            # CORS headers for API
            add_header 'Access-Control-Allow-Origin' '$http_origin' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
            
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain; charset=utf-8';
                add_header 'Content-Length' 0;
                return 204;
            }
        }

        # Django admin - proxy to Django backend
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
            proxy_read_timeout 86400;
        }

        # Static files for Django admin
        location /static/ {
            alias /home/deployuser/Malikli-son---Preview/backend/staticfiles_collected/;
            expires 30d;
            add_header Cache-Control "public, no-transform";
            try_files $uri $uri/ =404;
        }

        # Media files
        location /media/ {
            alias /home/deployuser/Malikli-son---Preview/backend/local_media_debug/;
            expires 30d;
            add_header Cache-Control "public, no-transform";
            try_files $uri $uri/ =404;
        }

        # Next.js static files with long cache
        location /_next/static/ {
            proxy_pass http://127.0.0.1:3000;
            expires 365d;
            add_header Cache-Control "public, immutable";
        }

        # Next.js image optimization
        location /_next/image {
            proxy_pass http://127.0.0.1:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Next.js application - everything else
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
            
            # Handle Next.js routing
            try_files $uri $uri/ @nextjs;
        }

        # Fallback for Next.js routing
        location @nextjs {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Security: Block access to sensitive files
        location ~ /\.ht {
            deny all;
        }
        
        location ~ /\.git {
            deny all;
        }
        
        location ~ /\.env {
            deny all;
        }
    }
}
EOF

echo "✅ Nginx configuration created"

# Test the configuration
echo "🧪 Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration test passed!"
    
    # Start Nginx
    echo "🚀 Starting Nginx..."
    systemctl start nginx
    systemctl enable nginx
    
    echo ""
    echo "🎉 NGINX CONFIGURATION FIX COMPLETE!"
    echo "=================================="
    echo ""
    echo "✅ Nginx is now running with SSL for both domains"
    echo "✅ www.malikli1992.com redirects to malikli1992.com"
    echo ""
    echo "🔗 Test your domains:"
    echo "   https://malikli1992.com"
    echo "   https://www.malikli1992.com"
    echo ""
    echo "📋 Next steps:"
    echo "1. Start your Django backend: cd /home/deployuser/Malikli-son---Preview/backend && python manage.py runserver 127.0.0.1:8000"
    echo "2. Start your Next.js frontend: cd /home/deployuser/Malikli-son---Preview/frontend && npm run start"
    echo "3. Test both domains in your browser"
    
else
    echo "❌ Nginx configuration test failed!"
    echo "📋 Check nginx syntax with: nginx -t"
    echo "📋 Check nginx error log: tail -f /var/log/nginx/error.log"
    exit 1
fi
