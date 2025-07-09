# Malikli.com - AlmaLinux Production Deployment Guide

## Overview

This repository contains a complete production deployment setup for **Malikli.com** on AlmaLinux server. The application consists of:

- **Backend**: Django REST API with Gunicorn
- **Frontend**: Next.js application
- **Database**: Supabase PostgreSQL (external)
- **Storage**: Cloudflare R2
- **Email**: Resend service
- **Payments**: PayPro BPC integration
- **Domain**: malikli1992.com

## Prerequisites

### Server Requirements

- **OS**: AlmaLinux 9+ (recommended)
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: Minimum 20GB SSD
- **CPU**: 2+ cores recommended
- **Network**: Public IP with ports 80, 443, 22 accessible

### External Services Setup

Before deployment, ensure you have:

1. **Supabase Project**
   - PostgreSQL database URL
   - Connection string format: `postgresql://username:password@db.supabase.co:5432/postgres`

2. **Cloudflare R2 Storage**
   - Access Key ID
   - Secret Access Key
   - Bucket name
   - Custom domain (recommended)

3. **Resend Email Service**
   - API key
   - Verified domain

4. **PayPro BPC Account**
   - Shop ID
   - Secret key

5. **Domain Configuration**
   - DNS A record pointing to your server IP
   - Optional: www subdomain

## Installation Process

### Step 1: Server Setup

1. **Login to your AlmaLinux server**:
   ```bash
   ssh root@your-server-ip
   ```

2. **Create a non-root user with sudo privileges**:
   ```bash
   useradd -m -G wheel deployer
   passwd deployer
   ```

3. **Switch to the new user**:
   ```bash
   su - deployer
   ```

4. **Clone the repository**:
   ```bash
   sudo mkdir -p /var/www/malikli1992.com
   sudo chown deployer:deployer /var/www/malikli1992.com
   cd /var/www/malikli1992.com
   git clone https://github.com/hasan0v/Malikli-com.git .
   ```

5. **Run the server setup script**:
   ```bash
   chmod +x scripts/setup-almalinux-server.sh
   ./scripts/setup-almalinux-server.sh
   ```

   This script will install:
   - Python 3.11
   - Node.js 20 LTS
   - Nginx
   - Redis
   - PM2
   - SSL tools (Certbot)
   - Firewall configuration
   - System optimizations

### Step 2: Environment Configuration

1. **Configure backend environment**:
   ```bash
   cp backend/.env.production.template backend/.env
   nano backend/.env
   ```

   Fill in your actual values:
   ```env
   SECRET_KEY=your-super-secret-django-key
   DEBUG=False
   ALLOWED_HOSTS=malikli1992.com,www.malikli1992.com
   DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
   AWS_ACCESS_KEY_ID=your-r2-access-key
   AWS_SECRET_ACCESS_KEY=your-r2-secret-key
   AWS_STORAGE_BUCKET_NAME=your-bucket-name
   AWS_S3_ENDPOINT_URL=https://account-id.r2.cloudflarestorage.com
   AWS_S3_CUSTOM_DOMAIN=media.malikli1992.com
   RESEND_API_KEY=your-resend-api-key
   PAYPRO_BPC_SHOP_ID=your-shop-id
   PAYPRO_BPC_SECRET_KEY=your-secret-key
   ```

2. **Configure frontend environment**:
   ```bash
   cp frontend/.env.production.template frontend/.env.local
   nano frontend/.env.local
   ```

   Configure the API URL:
   ```env
   NEXT_PUBLIC_API_URL=https://malikli1992.com/api/v1
   NEXT_PUBLIC_MEDIA_URL=https://media.malikli1992.com/media
   ```

### Step 3: Application Deployment

1. **Switch to application user**:
   ```bash
   sudo su - malikli
   cd /var/www/malikli1992.com
   ```

2. **Run the deployment script**:
   ```bash
   chmod +x scripts/deploy-production.sh
   ./scripts/deploy-production.sh
   ```

   This script will:
   - Deploy backend with virtual environment
   - Run database migrations
   - Collect static files
   - Build and deploy frontend
   - Configure Nginx with SSL-ready setup
   - Setup PM2 process management
   - Configure SSL certificate (optional)
   - Verify deployment

### Step 4: SSL Certificate Setup

If not configured during deployment:

```bash
sudo certbot --nginx -d malikli1992.com -d www.malikli1992.com
```

### Step 5: Create Django Superuser

```bash
cd /var/www/malikli1992.com/backend
source venv/bin/activate
python manage.py createsuperuser
```

## File Structure

```
/var/www/malikli1992.com/
├── backend/                 # Django application
│   ├── .env                # Backend environment variables
│   ├── venv/               # Python virtual environment
│   ├── manage.py
│   └── ...
├── frontend/               # Next.js application
│   ├── .env.local         # Frontend environment variables
│   ├── .next/             # Built application
│   └── ...
├── scripts/               # Deployment scripts
│   ├── setup-almalinux-server.sh
│   ├── deploy-production.sh
│   └── maintenance.sh
├── logs/                  # Application logs
│   ├── pm2/
│   ├── django/
│   └── nginx/
├── backups/              # Automated backups
└── ecosystem.config.js   # PM2 configuration
```

## Service Management

### PM2 Process Management

- **Check status**: `pm2 status`
- **View logs**: `pm2 logs`
- **Restart services**: `pm2 restart all`
- **Stop services**: `pm2 stop all`
- **Monitor resources**: `pm2 monit`

### Nginx Management

- **Check status**: `sudo systemctl status nginx`
- **Restart**: `sudo systemctl restart nginx`
- **Reload config**: `sudo systemctl reload nginx`
- **Test config**: `sudo nginx -t`
- **View logs**: `sudo tail -f /var/log/nginx/malikli_error.log`

### System Services

- **Check all services**: `systemctl status nginx redis firewalld`
- **View system logs**: `sudo journalctl -f`

## Maintenance Operations

Use the maintenance script for common operations:

```bash
# Check system status
./scripts/maintenance.sh status

# Check application health
./scripts/maintenance.sh health

# View logs
./scripts/maintenance.sh logs

# Create backup
./scripts/maintenance.sh backup

# Restart services
./scripts/maintenance.sh restart

# Update application
./scripts/maintenance.sh update

# Check SSL certificate
./scripts/maintenance.sh ssl

# Monitor dashboard
./scripts/maintenance.sh monitor

# System cleanup
./scripts/maintenance.sh cleanup
```

## Monitoring and Logs

### Application URLs

- **Frontend**: https://malikli1992.com
- **API**: https://malikli1992.com/api/v1/
- **Admin**: https://malikli1992.com/admin/
- **Health Check**: https://malikli1992.com/health

### Log Locations

- **PM2 Logs**: `/var/www/malikli1992.com/logs/pm2/`
- **Django Logs**: `/var/www/malikli1992.com/backend/django.log`
- **Nginx Logs**: `/var/log/nginx/malikli_*.log`
- **System Logs**: `journalctl -u nginx -u redis`

### Key Metrics to Monitor

- **Response Time**: Backend and frontend response times
- **Error Rates**: 4xx/5xx HTTP errors
- **Resource Usage**: CPU, memory, disk usage
- **SSL Certificate**: Expiration dates
- **Database**: Connection and query performance

## Security Considerations

### Firewall Configuration

```bash
# Check firewall status
sudo firewall-cmd --list-all

# Open additional ports if needed
sudo firewall-cmd --permanent --add-port=PORT/tcp
sudo firewall-cmd --reload
```

### SSL Certificate

- **Auto-renewal**: Certbot sets up automatic renewal
- **Check renewal**: `sudo certbot renew --dry-run`
- **Force renewal**: `sudo certbot renew --force-renewal`

### Security Headers

The Nginx configuration includes:
- HSTS (HTTP Strict Transport Security)
- Content Security Policy
- XSS Protection
- Frame Options
- Content Type Options

## Backup Strategy

### Automated Backups

The maintenance script creates backups including:
- Application code (excluding dependencies)
- Configuration files
- Environment templates (without secrets)
- PM2 process configuration

### Manual Database Backup

Since using Supabase, backups are managed by Supabase. For additional safety:

```bash
# Export database (if needed)
pg_dump DATABASE_URL > backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   # Check PM2 logs
   pm2 logs
   
   # Check system resources
   free -h
   df -h
   ```

2. **Permission issues**:
   ```bash
   # Fix ownership
   sudo chown -R malikli:malikli /var/www/malikli1992.com
   ```

3. **SSL certificate issues**:
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew if needed
   sudo certbot renew
   ```

4. **Database connection issues**:
   ```bash
   # Test database connection
   cd /var/www/malikli1992.com/backend
   source venv/bin/activate
   python manage.py dbshell
   ```

### Performance Issues

1. **High CPU usage**:
   - Check PM2 processes: `pm2 list`
   - Monitor with: `htop`
   - Consider increasing worker count

2. **High memory usage**:
   - Check memory limits in PM2 config
   - Monitor with: `free -h`
   - Consider adding swap space

3. **Slow response times**:
   - Check database query performance
   - Review Nginx logs for slow requests
   - Consider enabling Redis caching

## Updates and Deployments

### Regular Updates

1. **Security updates**:
   ```bash
   sudo dnf update -y
   ```

2. **Application updates**:
   ```bash
   ./scripts/maintenance.sh update
   ```

3. **Dependencies updates**:
   ```bash
   # Backend
   cd backend && source venv/bin/activate
   pip install --upgrade -r requirements.txt
   
   # Frontend
   cd frontend
   npm update
   ```

### Rollback Procedure

If deployment fails:

1. **Restore from backup**:
   ```bash
   # Find latest backup
   ls -la /var/www/malikli1992.com/backups/
   
   # Restore code (adjust path)
   tar -xzf backups/YYYYMMDD_HHMMSS/backend_code.tar.gz
   tar -xzf backups/YYYYMMDD_HHMMSS/frontend_code.tar.gz
   ```

2. **Restart services**:
   ```bash
   pm2 restart all
   sudo systemctl restart nginx
   ```

## Support and Maintenance

### Regular Maintenance Tasks

- **Weekly**: Check logs and system status
- **Monthly**: Update system packages
- **Quarterly**: Review and update dependencies
- **Semi-annually**: Review and update SSL certificates

### Contact Information

For deployment support:
- Repository: https://github.com/hasan0v/Malikli-com
- Issues: Use GitHub Issues for bug reports
- Documentation: This README and inline script comments

## License

This deployment configuration is part of the Malikli.com project. See the main project for licensing information.

---

**Note**: Always test deployments in a staging environment before applying to production. Keep environment variables secure and never commit them to version control.
