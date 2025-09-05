# Handwork Marketplace Deployment Guide

## Overview

This guide covers the complete deployment process for the Handwork Marketplace platform, including backend API, mobile app, admin dashboard, and infrastructure setup.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Backend Deployment](#backend-deployment)
4. [Mobile App Deployment](#mobile-app-deployment)
5. [Admin Dashboard Deployment](#admin-dashboard-deployment)
6. [Infrastructure Setup](#infrastructure-setup)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- Docker and Docker Compose
- Node.js 18+ and npm/yarn
- Python 3.11+
- Git
- SSL certificates for HTTPS
- Domain names configured

### Required Accounts
- AWS/DigitalOcean/VPS hosting account
- Stripe account (live keys)
- PayPal business account
- Google Cloud Console (OAuth & FCM)
- Facebook Developer account
- Apple Developer account
- Twilio account
- SendGrid account

## Environment Setup

### 1. Server Requirements

**Minimum Production Server Specs:**
- 2 CPU cores
- 4GB RAM
- 50GB SSD storage
- Ubuntu 20.04 LTS or similar

**Recommended Production Server Specs:**
- 4 CPU cores
- 8GB RAM
- 100GB SSD storage
- Load balancer for high availability

### 2. Domain Configuration

Configure the following DNS records:
```
A     handworkmarketplace.com          -> YOUR_SERVER_IP
A     api.handworkmarketplace.com      -> YOUR_SERVER_IP
A     admin.handworkmarketplace.com    -> YOUR_SERVER_IP
CNAME www.handworkmarketplace.com      -> handworkmarketplace.com
```

### 3. SSL Certificate Setup

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d handworkmarketplace.com -d www.handworkmarketplace.com
sudo certbot --nginx -d api.handworkmarketplace.com
sudo certbot --nginx -d admin.handworkmarketplace.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Backend Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reboot to apply Docker group changes
sudo reboot
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/handwork-marketplace.git
cd handwork-marketplace

# Create production environment file
cp backend/.env.production backend/.env

# Update environment variables with actual values
nano backend/.env

# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Create admin user
docker-compose -f docker-compose.prod.yml exec backend python create_admin_user.py
```

### 3. Environment Variables Configuration

Update `backend/.env` with production values:

```bash
# Generate secure keys
JWT_SECRET_KEY=$(openssl rand -hex 32)
SECRET_KEY=$(openssl rand -hex 32)

# Payment keys (from Stripe/PayPal dashboards)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth keys (from respective developer consoles)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# ... etc
```

### 4. Database Backup Setup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/handwork-marketplace"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="/path/to/handwork_marketplace.db"

mkdir -p $BACKUP_DIR
cp $DB_FILE $BACKUP_DIR/handwork_marketplace_$DATE.db
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
```

```bash
# Make executable and schedule
sudo chmod +x /usr/local/bin/backup-db.sh
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-db.sh
```

## Mobile App Deployment

### 1. iOS Deployment

#### Prerequisites
- Apple Developer Account ($99/year)
- Xcode 14+ on macOS
- iOS Distribution Certificate
- App Store Connect access

#### Build Process
```bash
cd mobile

# Install dependencies
npm install

# Configure environment
cp .env.production .env

# iOS build
npx expo build:ios --type archive

# Or using EAS Build (recommended)
npx eas build --platform ios --profile production
```

#### App Store Submission
1. Open Xcode and archive the app
2. Upload to App Store Connect
3. Fill out app metadata in App Store Connect
4. Submit for review

### 2. Android Deployment

#### Prerequisites
- Google Play Console account ($25 one-time)
- Android keystore file
- Google Play signing key

#### Build Process
```bash
cd mobile

# Generate keystore (first time only)
keytool -genkey -v -keystore handwork-marketplace.keystore -alias handwork-marketplace -keyalg RSA -keysize 2048 -validity 10000

# Build APK/AAB
npx expo build:android --type app-bundle

# Or using EAS Build (recommended)
npx eas build --platform android --profile production
```

#### Google Play Submission
1. Upload AAB to Google Play Console
2. Fill out store listing information
3. Set up content rating and pricing
4. Submit for review

### 3. App Store Metadata

#### iOS App Store
- **App Name**: Handwork Marketplace
- **Subtitle**: Find skilled workers for any job
- **Keywords**: handwork, marketplace, services, workers, jobs
- **Description**: Connect with skilled professionals for construction, plumbing, electrical, cleaning, and more manual work services.
- **Category**: Business
- **Age Rating**: 4+

#### Google Play Store
- **Title**: Handwork Marketplace
- **Short Description**: Find skilled workers for any job
- **Full Description**: [Same as iOS]
- **Category**: Business
- **Content Rating**: Everyone

## Admin Dashboard Deployment

### 1. Build and Deploy

```bash
cd admin-web

# Install dependencies
npm install

# Build for production
npm run build

# Deploy using Docker
docker build -f Dockerfile.prod -t handwork-admin .
docker run -d -p 3000:3000 --name handwork-admin handwork-admin
```

### 2. Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name admin.handworkmarketplace.com;
    
    ssl_certificate /etc/letsencrypt/live/admin.handworkmarketplace.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.handworkmarketplace.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Infrastructure Setup

### 1. Load Balancer Configuration

```nginx
upstream backend {
    server backend1:8000;
    server backend2:8000;
}

server {
    listen 443 ssl;
    server_name api.handworkmarketplace.com;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Firewall Configuration

```bash
# UFW firewall setup
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow from 10.0.0.0/8 to any port 8000  # Internal API access
```

### 3. Monitoring Setup

```bash
# Install monitoring stack
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Configure Prometheus targets
# Configure Grafana dashboards
# Set up alerting rules
```

## Monitoring and Logging

### 1. Application Monitoring

- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **AlertManager**: Alert notifications

### 2. Log Management

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/handwork-marketplace
```

```
/var/log/handwork-marketplace/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

### 3. Health Checks

```bash
# API health check
curl -f https://api.handworkmarketplace.com/health

# Database health check
docker-compose exec backend python -c "from app.database import engine; engine.execute('SELECT 1')"
```

## Troubleshooting

### Common Issues

#### 1. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew --dry-run
```

#### 2. Database Connection Issues
```bash
# Check database file permissions
ls -la backend/handwork_marketplace.db

# Check container logs
docker-compose logs backend
```

#### 3. Payment Integration Issues
```bash
# Test Stripe webhook
curl -X POST https://api.handworkmarketplace.com/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

#### 4. Mobile App Build Issues
```bash
# Clear Expo cache
npx expo r -c

# Check build logs
npx eas build:list
```

### Emergency Procedures

#### 1. Rollback Deployment
```bash
# Rollback to previous version
git checkout previous-stable-tag
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

#### 2. Database Recovery
```bash
# Restore from backup
cp /var/backups/handwork-marketplace/handwork_marketplace_YYYYMMDD.db backend/handwork_marketplace.db
docker-compose restart backend
```

#### 3. Service Restart
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

## Security Checklist

- [ ] SSL certificates installed and auto-renewing
- [ ] Firewall configured with minimal open ports
- [ ] Environment variables secured (no hardcoded secrets)
- [ ] Database backups automated
- [ ] Log rotation configured
- [ ] Monitoring and alerting active
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Regular security updates scheduled

## Performance Optimization

### 1. Database Optimization
- Enable SQLite WAL mode
- Add appropriate indexes
- Regular VACUUM operations

### 2. API Optimization
- Enable response compression
- Implement caching strategies
- Use connection pooling

### 3. Mobile App Optimization
- Enable code splitting
- Optimize image sizes
- Implement lazy loading

## Maintenance Schedule

### Daily
- Monitor system health
- Check error logs
- Verify backup completion

### Weekly
- Review performance metrics
- Update dependencies (staging first)
- Security scan

### Monthly
- Full system backup
- Performance optimization review
- Security audit

This deployment guide provides a comprehensive approach to deploying the Handwork Marketplace platform in a production environment with proper security, monitoring, and maintenance procedures.