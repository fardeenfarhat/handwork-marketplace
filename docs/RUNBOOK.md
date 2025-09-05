# Handwork Marketplace Operations Runbook

## Overview

This runbook provides step-by-step procedures for common operational tasks, incident response, and maintenance activities for the Handwork Marketplace platform.

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Service Management](#service-management)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Incident Response](#incident-response)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Backup and Recovery](#backup-and-recovery)
7. [Performance Tuning](#performance-tuning)
8. [Security Operations](#security-operations)

## System Architecture Overview

### Components
- **Backend API**: Python FastAPI application
- **Database**: SQLite with WAL mode
- **Mobile App**: React Native (iOS/Android)
- **Admin Dashboard**: React web application
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus + Grafana
- **File Storage**: Local filesystem with backup

### Service Dependencies
```
Mobile App → Nginx → Backend API → SQLite Database
Admin Dashboard → Nginx → Backend API → SQLite Database
External Services: Stripe, PayPal, Firebase, Twilio, SendGrid
```

## Service Management

### Starting Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Start specific service
docker-compose -f docker-compose.prod.yml up -d backend

# View service status
docker-compose -f docker-compose.prod.yml ps
```

### Stopping Services

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop specific service
docker-compose -f docker-compose.prod.yml stop backend

# Force stop and remove containers
docker-compose -f docker-compose.prod.yml down --remove-orphans
```

### Service Health Checks

```bash
# Check API health
curl -f https://api.handworkmarketplace.com/health

# Check database connectivity
docker-compose -f docker-compose.prod.yml exec backend python -c "
from app.database import engine
try:
    engine.execute('SELECT 1')
    print('Database: OK')
except Exception as e:
    print(f'Database: ERROR - {e}')
"

# Check external service connectivity
docker-compose -f docker-compose.prod.yml exec backend python -c "
import requests
services = {
    'Stripe': 'https://api.stripe.com/v1/charges',
    'PayPal': 'https://api.paypal.com/v1/oauth2/token',
    'Firebase': 'https://fcm.googleapis.com/fcm/send'
}
for name, url in services.items():
    try:
        response = requests.get(url, timeout=5)
        print(f'{name}: OK ({response.status_code})')
    except Exception as e:
        print(f'{name}: ERROR - {e}')
"
```

### Log Management

```bash
# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f backend

# View logs for specific time period
docker-compose -f docker-compose.prod.yml logs --since="2024-01-01T00:00:00" backend

# Search logs for errors
docker-compose -f docker-compose.prod.yml logs backend | grep -i error

# Export logs to file
docker-compose -f docker-compose.prod.yml logs backend > backend_logs_$(date +%Y%m%d).log
```

## Monitoring and Alerting

### Key Metrics to Monitor

#### System Metrics
- CPU usage > 80%
- Memory usage > 85%
- Disk usage > 90%
- Network connectivity

#### Application Metrics
- API response time > 2 seconds
- Error rate > 5%
- Database connection pool exhaustion
- Failed payment transactions

#### Business Metrics
- New user registrations
- Job postings per day
- Successful job completions
- Revenue metrics

### Grafana Dashboard URLs
- System Overview: `https://monitoring.handworkmarketplace.com/d/system`
- API Performance: `https://monitoring.handworkmarketplace.com/d/api`
- Business Metrics: `https://monitoring.handworkmarketplace.com/d/business`

### Alert Response Procedures

#### High CPU Usage Alert
```bash
# 1. Check current processes
docker-compose -f docker-compose.prod.yml exec backend top

# 2. Check for memory leaks
docker stats

# 3. Scale horizontally if needed
docker-compose -f docker-compose.prod.yml up -d --scale backend=2

# 4. Investigate root cause
docker-compose -f docker-compose.prod.yml logs backend | grep -E "(error|exception|timeout)"
```

#### Database Connection Issues
```bash
# 1. Check database file permissions
ls -la backend/handwork_marketplace.db

# 2. Check database locks
docker-compose -f docker-compose.prod.yml exec backend python -c "
import sqlite3
conn = sqlite3.connect('handwork_marketplace.db')
cursor = conn.execute('PRAGMA wal_checkpoint;')
print('WAL checkpoint completed')
conn.close()
"

# 3. Restart database connections
docker-compose -f docker-compose.prod.yml restart backend
```

#### Payment Processing Failures
```bash
# 1. Check Stripe webhook status
curl -H "Authorization: Bearer sk_live_..." \
     https://api.stripe.com/v1/webhook_endpoints

# 2. Verify webhook endpoint accessibility
curl -X POST https://api.handworkmarketplace.com/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"test": true}'

# 3. Check payment logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i "payment\|stripe\|paypal"
```

## Incident Response

### Severity Levels

#### P0 - Critical (Response: Immediate)
- Complete service outage
- Data loss or corruption
- Security breach
- Payment processing completely down

#### P1 - High (Response: 1 hour)
- Partial service outage
- Performance degradation affecting >50% users
- Payment processing errors >10%

#### P2 - Medium (Response: 4 hours)
- Minor feature issues
- Performance degradation affecting <50% users
- Non-critical third-party service issues

#### P3 - Low (Response: 24 hours)
- Cosmetic issues
- Documentation updates
- Enhancement requests

### Incident Response Checklist

#### Immediate Response (0-15 minutes)
- [ ] Acknowledge the incident
- [ ] Assess severity level
- [ ] Notify stakeholders if P0/P1
- [ ] Begin investigation
- [ ] Document timeline

#### Investigation (15-60 minutes)
- [ ] Check system metrics and logs
- [ ] Identify root cause
- [ ] Implement immediate mitigation
- [ ] Test mitigation effectiveness
- [ ] Update stakeholders

#### Resolution (1-4 hours)
- [ ] Implement permanent fix
- [ ] Verify system stability
- [ ] Monitor for recurrence
- [ ] Update documentation
- [ ] Conduct post-incident review

### Common Incident Scenarios

#### Scenario 1: API Completely Down
```bash
# 1. Check container status
docker-compose -f docker-compose.prod.yml ps

# 2. Check logs for errors
docker-compose -f docker-compose.prod.yml logs backend --tail=100

# 3. Restart services
docker-compose -f docker-compose.prod.yml restart backend

# 4. If restart fails, rollback to previous version
git checkout previous-stable-tag
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

#### Scenario 2: Database Corruption
```bash
# 1. Stop all services
docker-compose -f docker-compose.prod.yml down

# 2. Check database integrity
sqlite3 backend/handwork_marketplace.db "PRAGMA integrity_check;"

# 3. If corrupted, restore from backup
cp /var/backups/handwork-marketplace/handwork_marketplace_latest.db backend/handwork_marketplace.db

# 4. Restart services
docker-compose -f docker-compose.prod.yml up -d
```

#### Scenario 3: High Error Rate
```bash
# 1. Identify error patterns
docker-compose -f docker-compose.prod.yml logs backend | grep -E "ERROR|CRITICAL" | tail -50

# 2. Check for specific error types
docker-compose -f docker-compose.prod.yml logs backend | grep -E "(500|timeout|connection)" | wc -l

# 3. Scale services if needed
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# 4. Enable rate limiting if under attack
# Update nginx configuration with rate limiting
```

## Maintenance Procedures

### Scheduled Maintenance Window

#### Pre-Maintenance (1 hour before)
```bash
# 1. Notify users via app notification
curl -X POST https://api.handworkmarketplace.com/admin/notifications/broadcast \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"message": "Scheduled maintenance in 1 hour. Service may be briefly unavailable."}'

# 2. Create database backup
/usr/local/bin/backup-db.sh

# 3. Verify backup integrity
sqlite3 /var/backups/handwork-marketplace/handwork_marketplace_$(date +%Y%m%d).db "PRAGMA integrity_check;"
```

#### During Maintenance
```bash
# 1. Enable maintenance mode
docker-compose -f docker-compose.prod.yml exec nginx \
    cp /etc/nginx/maintenance.html /var/www/html/index.html

# 2. Stop services
docker-compose -f docker-compose.prod.yml down

# 3. Perform updates
git pull origin main
docker-compose -f docker-compose.prod.yml build --no-cache

# 4. Run database migrations
docker-compose -f docker-compose.prod.yml run backend alembic upgrade head

# 5. Start services
docker-compose -f docker-compose.prod.yml up -d

# 6. Verify functionality
curl -f https://api.handworkmarketplace.com/health
```

#### Post-Maintenance
```bash
# 1. Disable maintenance mode
docker-compose -f docker-compose.prod.yml exec nginx \
    rm /var/www/html/index.html

# 2. Monitor for issues
watch -n 30 'curl -s https://api.handworkmarketplace.com/health'

# 3. Notify users of completion
curl -X POST https://api.handworkmarketplace.com/admin/notifications/broadcast \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"message": "Maintenance completed. All services are now operational."}'
```

### Database Maintenance

#### Weekly Database Optimization
```bash
# 1. Run VACUUM to reclaim space
docker-compose -f docker-compose.prod.yml exec backend python -c "
import sqlite3
conn = sqlite3.connect('handwork_marketplace.db')
conn.execute('VACUUM;')
conn.close()
print('Database VACUUM completed')
"

# 2. Update statistics
docker-compose -f docker-compose.prod.yml exec backend python -c "
import sqlite3
conn = sqlite3.connect('handwork_marketplace.db')
conn.execute('ANALYZE;')
conn.close()
print('Database ANALYZE completed')
"

# 3. Check database size
du -h backend/handwork_marketplace.db
```

#### Monthly Index Optimization
```bash
# 1. Check index usage
docker-compose -f docker-compose.prod.yml exec backend python -c "
import sqlite3
conn = sqlite3.connect('handwork_marketplace.db')
cursor = conn.execute('SELECT name, sql FROM sqlite_master WHERE type=\"index\";')
for row in cursor:
    print(row)
conn.close()
"

# 2. Rebuild indexes if needed
docker-compose -f docker-compose.prod.yml exec backend python -c "
import sqlite3
conn = sqlite3.connect('handwork_marketplace.db')
conn.execute('REINDEX;')
conn.close()
print('Database REINDEX completed')
"
```

## Backup and Recovery

### Automated Backup Verification
```bash
#!/bin/bash
# /usr/local/bin/verify-backup.sh

BACKUP_DIR="/var/backups/handwork-marketplace"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.db | head -1)

# Test backup integrity
sqlite3 $LATEST_BACKUP "PRAGMA integrity_check;" > /tmp/backup_check.log

if grep -q "ok" /tmp/backup_check.log; then
    echo "Backup verification: PASSED"
    exit 0
else
    echo "Backup verification: FAILED"
    # Send alert
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
         -d '{"text": "Database backup verification failed!"}'
    exit 1
fi
```

### Disaster Recovery Procedures

#### Complete System Recovery
```bash
# 1. Provision new server
# 2. Install Docker and dependencies
# 3. Clone repository
git clone https://github.com/your-org/handwork-marketplace.git
cd handwork-marketplace

# 4. Restore database from backup
scp backup-server:/var/backups/handwork-marketplace/latest.db backend/handwork_marketplace.db

# 5. Configure environment
cp backend/.env.production backend/.env
# Update with actual values

# 6. Start services
docker-compose -f docker-compose.prod.yml up -d

# 7. Verify functionality
curl -f https://api.handworkmarketplace.com/health
```

## Performance Tuning

### Database Performance
```bash
# Enable WAL mode for better concurrency
docker-compose -f docker-compose.prod.yml exec backend python -c "
import sqlite3
conn = sqlite3.connect('handwork_marketplace.db')
conn.execute('PRAGMA journal_mode=WAL;')
conn.execute('PRAGMA synchronous=NORMAL;')
conn.execute('PRAGMA cache_size=10000;')
conn.execute('PRAGMA temp_store=memory;')
conn.close()
print('Database performance settings applied')
"
```

### API Performance Monitoring
```bash
# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.handworkmarketplace.com/jobs

# Where curl-format.txt contains:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n
```

## Security Operations

### Security Monitoring
```bash
# Check for failed login attempts
docker-compose -f docker-compose.prod.yml logs backend | grep -i "authentication failed" | wc -l

# Monitor for suspicious API calls
docker-compose -f docker-compose.prod.yml logs nginx | grep -E "(40[1-4]|50[0-5])" | tail -20

# Check SSL certificate expiry
echo | openssl s_client -servername api.handworkmarketplace.com -connect api.handworkmarketplace.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Security Incident Response
```bash
# Block suspicious IP
sudo ufw insert 1 deny from SUSPICIOUS_IP

# Rotate JWT secrets (requires app restart)
NEW_SECRET=$(openssl rand -hex 32)
sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$NEW_SECRET/" backend/.env
docker-compose -f docker-compose.prod.yml restart backend

# Force logout all users
docker-compose -f docker-compose.prod.yml exec backend python -c "
# Add script to invalidate all JWT tokens
print('All user sessions invalidated')
"
```

This runbook provides comprehensive operational procedures for maintaining the Handwork Marketplace platform. Keep it updated as the system evolves and new procedures are developed.