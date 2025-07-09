# 🚀 Malikli.com - Quick Start Deployment Guide

## Prerequisites

- AlmaLinux 9+ server with root access
- Domain `malikli1992.com` pointing to server IP
- External services configured:
  - Supabase PostgreSQL database
  - Cloudflare R2 storage
  - Resend email service
  - PayPro BPC payment gateway

## 📋 Step-by-Step Deployment

### 1. Initial Server Setup

```bash
# Login as root
ssh root@your-server-ip

# Create deployment user
useradd -m -G wheel malikli
passwd malikli

# Switch to deployment user
su - malikli

# Clone repository
sudo mkdir -p /var/www/malikli1992.com
sudo chown malikli:malikli /var/www/malikli1992.com
cd /var/www/malikli1992.com
git clone https://github.com/hasan0v/Malikli-com.git .
```

### 2. Run Server Setup

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run server setup (installs Python, Node.js, Nginx, etc.)
./scripts/setup-almalinux-server.sh
```

### 3. Configure Environment Variables

```bash
# Backend environment
cp backend/.env.production.template backend/.env
nano backend/.env  # Fill in your actual values

# Frontend environment
cp frontend/.env.production.template frontend/.env.local
nano frontend/.env.local  # Configure API URL
```

### 4. Deploy Application

```bash
# Run deployment script
./scripts/deploy-production.sh
```

### 5. Setup SSL Certificate

```bash
# Install SSL certificate
sudo certbot --nginx -d malikli1992.com -d www.malikli1992.com
```

### 6. Create Django Superuser

```bash
cd backend
source venv/bin/activate
python manage.py createsuperuser
```

## 🔧 Maintenance Commands

```bash
# Check system status
./scripts/maintenance.sh status

# Monitor application
./scripts/maintenance.sh monitor

# Create backup
./scripts/maintenance.sh backup

# Update application
./scripts/maintenance.sh update

# Restart services
./scripts/maintenance.sh restart
```

## 📊 Access Your Application

- **Website**: https://malikli1992.com
- **Admin Panel**: https://malikli1992.com/admin/
- **API**: https://malikli1992.com/api/v1/

## 🆘 Need Help?

1. Check the full [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. Run diagnostics: `./scripts/maintenance.sh health`
3. Check logs: `./scripts/maintenance.sh logs`

## 📝 Environment Variables Template

### Backend (.env)
```env
SECRET_KEY=your-django-secret-key
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

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://malikli1992.com/api/v1
NEXT_PUBLIC_MEDIA_URL=https://media.malikli1992.com/media
```

---

**⚠️ Important**: Never commit `.env` files to version control!
