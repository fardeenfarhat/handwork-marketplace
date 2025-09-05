# Deployment Guide

This document provides comprehensive instructions for deploying the Handwork Marketplace application to staging and production environments.

## Prerequisites

- Docker and Docker Compose installed
- Git repository access
- Environment variables configured
- SSL certificates for production
- Domain names configured

## Environment Variables

Create `.env` files for each environment with the following variables:

### Required Variables

```bash
# Database
DATABASE_URL=sqlite:///./handwork_marketplace.db

# Authentication
JWT_SECRET_KEY=your-jwt-secret-key

# Payment Processing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_WEBHOOK_ID=your-paypal-webhook-id

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key

# Notifications
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@handworkmarketplace.com
FIREBASE_SERVER_KEY=your-firebase-server-key

# Monitoring & Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_EMAIL=alerts@handworkmarketplace.com
GRAFANA_ADMIN_PASSWORD=secure-password

# Deployment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
```

## Deployment Methods

### 1. Automated Deployment (Recommended)

Use the deployment script for automated deployments:

```bash
# Deploy to staging
./backend/scripts/deploy.sh --environment staging

# Deploy to production
./backend/scripts/deploy.sh --environment production

# Deploy with options
./backend/scripts/deploy.sh \
  --environment production \
  --skip-tests \
  --timeout 600

# Rollback deployment
./backend/scripts/deploy.sh \
  --environment production \
  --rollback
```

### 2. Manual Deployment

#### Staging Deployment

```bash
# 1. Pull latest code
git pull origin develop

# 2. Run tests
cd backend && python -m pytest
cd ../admin-web && npm test
cd ../mobile && npm test

# 3. Create database backup
cd ../backend
python scripts/backup_database.py --action backup

# 4. Deploy with Docker Compose
cd ..
docker-compose -f docker-compose.staging.yml down
docker-compose -f docker-compose.staging.yml pull
docker-compose -f docker-compose.staging.yml up -d

# 5. Run migrations
cd backend
python scripts/migrate_database.py --action migrate

# 6. Health check
curl -f https://staging-api.handworkmarketplace.com/health
```

#### Production Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Run comprehensive tests
cd backend && python -m pytest --cov=app
cd ../admin-web && npm test -- --coverage
cd ../mobile && npm test -- --coverage

# 3. Create database backup
cd ../backend
python scripts/backup_database.py --action backup

# 4. Deploy with Docker Compose
cd ..
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 5. Run migrations
cd backend
python scripts/migrate_database.py --action migrate

# 6. Health check
curl -f https://api.handworkmarketplace.com/health
```

## CI/CD Pipeline

The project includes GitHub Actions workflows for automated testing and deployment:

### Workflows

1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
   - Runs on push to `main` and `develop` branches
   - Executes backend, admin-web, and mobile tests
   - Performs security scanning
   - Builds and pushes Docker images
   - Deploys to staging/production

2. **Mobile Build** (`.github/workflows/mobile-build.yml`)
   - Builds iOS and Android apps
   - Publishes to app stores
   - Handles over-the-air updates

### Required Secrets

Configure the following secrets in your GitHub repository:

```
# Deployment
STAGING_HOST=staging.handworkmarketplace.com
STAGING_USER=deploy
STAGING_SSH_KEY=<private-key>
PRODUCTION_HOST=handworkmarketplace.com
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=<private-key>

# Environment URLs
STAGING_URL=https://staging-api.handworkmarketplace.com
PRODUCTION_URL=https://api.handworkmarketplace.com

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Mobile App Deployment
EXPO_TOKEN=<expo-token>
EXPO_APPLE_ID=<apple-id>
EXPO_APPLE_ID_PASSWORD=<app-specific-password>
EXPO_ANDROID_KEYSTORE_PASSWORD=<keystore-password>
EXPO_ANDROID_KEY_PASSWORD=<key-password>
```

## Database Management

### Migrations

```bash
# Create new migration
python scripts/migrate_database.py --action create --name "add_user_preferences"

# Run pending migrations
python scripts/migrate_database.py --action migrate

# Check migration status
python scripts/migrate_database.py --action status

# Rollback migration
python scripts/migrate_database.py --action rollback --version 20231201_120000
```

### Backups

```bash
# Create manual backup
python scripts/backup_database.py --action backup --compress

# List available backups
python scripts/backup_database.py --action list

# Restore from backup
python scripts/backup_database.py --action restore --restore-file backup_file.db.gz

# Cleanup old backups
python scripts/backup_database.py --action cleanup --days-to-keep 30
```

### Automated Backups

Set up automated backups using cron:

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/backend/scripts/cron_backup.sh

# Environment variables for backup script
export BACKUP_RETENTION_DAYS=30
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
export BACKUP_EMAIL=admin@handworkmarketplace.com
```

## Monitoring and Health Checks

### Health Check Endpoints

- **Basic Health**: `/health`
- **Detailed Health**: `/health/detailed`
- **Readiness Probe**: `/health/ready`
- **Liveness Probe**: `/health/live`
- **Metrics**: `/metrics`

### Monitoring Stack

Deploy the monitoring stack:

```bash
# Start monitoring services
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Grafana: http://localhost:3001 (admin/admin123)
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
```

### Alerts Configuration

Configure alerts in `monitoring/alertmanager/alertmanager.yml`:

- Slack notifications for critical alerts
- Email notifications for all alerts
- PagerDuty integration for production

## SSL/TLS Configuration

### Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d api.handworkmarketplace.com
sudo certbot --nginx -d admin.handworkmarketplace.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Manual Certificate Installation

1. Place certificates in `nginx/ssl/`
2. Update `nginx/nginx.conf` with certificate paths
3. Restart nginx container

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database file permissions
   ls -la handwork_marketplace.db
   
   # Verify database integrity
   sqlite3 handwork_marketplace.db "PRAGMA integrity_check;"
   ```

2. **Container Startup Issues**
   ```bash
   # Check container logs
   docker-compose logs backend
   docker-compose logs nginx
   
   # Check container status
   docker-compose ps
   ```

3. **Health Check Failures**
   ```bash
   # Test health endpoint directly
   curl -v http://localhost:8000/health
   
   # Check application logs
   docker-compose logs -f backend
   ```

4. **SSL Certificate Issues**
   ```bash
   # Test SSL configuration
   openssl s_client -connect api.handworkmarketplace.com:443
   
   # Check certificate expiration
   echo | openssl s_client -connect api.handworkmarketplace.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

### Log Locations

- Application logs: `backend/logs/`
- Deployment logs: `backend/logs/deploy.log`
- Backup logs: `backend/logs/backup.log`
- Nginx logs: `/var/log/nginx/` (inside container)

### Performance Optimization

1. **Database Optimization**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_jobs_category ON jobs(category);
   CREATE INDEX idx_bookings_status ON bookings(status);
   ```

2. **Container Resource Limits**
   ```yaml
   # In docker-compose files
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
           reservations:
             cpus: '1'
             memory: 1G
   ```

3. **Nginx Caching**
   ```nginx
   # Add to nginx configuration
   location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

## Security Considerations

1. **Environment Variables**: Never commit sensitive environment variables
2. **Database Access**: Restrict database file permissions (600)
3. **API Rate Limiting**: Configure appropriate rate limits in nginx
4. **SSL/TLS**: Use strong cipher suites and HSTS headers
5. **Container Security**: Run containers as non-root users
6. **Backup Encryption**: Encrypt database backups for production

## Rollback Procedures

### Automated Rollback

```bash
# Rollback using deployment script
./backend/scripts/deploy.sh --environment production --rollback
```

### Manual Rollback

```bash
# 1. Stop current deployment
docker-compose -f docker-compose.prod.yml down

# 2. Restore database from backup
cd backend
python scripts/backup_database.py --action restore --restore-file latest_backup.db.gz

# 3. Revert to previous Docker images
# (Tag and track image versions in production)
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify health
curl -f https://api.handworkmarketplace.com/health
```

## Support and Maintenance

- Monitor application health regularly
- Review and rotate secrets quarterly
- Update dependencies monthly
- Perform disaster recovery tests quarterly
- Review and update documentation as needed

For additional support, contact the development team or refer to the project documentation.