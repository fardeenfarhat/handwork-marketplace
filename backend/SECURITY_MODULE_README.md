# Security Module Documentation

## Overview

The Handwork Marketplace Security Module provides comprehensive security measures and data protection features to safeguard the application against common web vulnerabilities and ensure GDPR compliance. This module implements multiple layers of security including input validation, rate limiting, encryption, file security, audit logging, and privacy controls.

## Table of Contents

1. [Architecture](#architecture)
2. [Components](#components)
3. [Installation & Setup](#installation--setup)
4. [Usage Examples](#usage-examples)
5. [Configuration](#configuration)
6. [API Endpoints](#api-endpoints)
7. [Security Features](#security-features)
8. [GDPR Compliance](#gdpr-compliance)
9. [Monitoring & Alerts](#monitoring--alerts)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Architecture

The security module follows a layered architecture approach:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Security        │  │ Rate Limiting   │                  │
│  │ Endpoints       │  │ Middleware      │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│                   Security Core                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Validation  │ │ Encryption  │ │ File        │           │
│  │ & Sanitize  │ │ Manager     │ │ Security    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                 Compliance & Audit                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ GDPR        │ │ Security    │ │ Monitoring  │           │
│  │ Compliance  │ │ Audit Log   │ │ & Alerts    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                   Data Layer                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Audit Logs Database                        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Input Validation (`app/core/validation.py`)

Provides comprehensive input validation and sanitization:

- **Email validation** with format checking
- **Phone number validation** with international support
- **Password strength validation** with complexity requirements
- **HTML sanitization** to prevent XSS attacks
- **SQL injection pattern detection**
- **File upload validation**
- **Search query sanitization**

### 2. Rate Limiting (`app/core/rate_limiting.py`)

Implements multiple rate limiting strategies:

- **Token bucket algorithm** for general rate limiting
- **Sliding window rate limiting** for specific endpoints
- **DDoS protection** with suspicious activity detection
- **IP blocking** for malicious behavior
- **Automatic cleanup** of expired data

### 3. Encryption (`app/core/encryption.py`)

Handles all encryption needs:

- **Symmetric encryption** using Fernet for sensitive data
- **PII protection** with additional security measures
- **File encryption** using AES for uploaded files
- **Password hashing** with PBKDF2
- **Secure token generation**

### 4. File Security (`app/core/file_security.py`)

Secures file uploads:

- **File type validation** by extension and MIME type
- **Content analysis** and malware detection
- **Image validation** and corruption checking
- **Virus scanning** with ClamAV integration
- **Secure file storage** with encryption

### 5. GDPR Compliance (`app/core/gdpr_compliance.py`)

Ensures data privacy compliance:

- **Data export** for portability rights
- **Data deletion** for right to be forgotten
- **Data anonymization** while preserving business records
- **Processing transparency** information
- **Retention policy** enforcement

### 6. Security Audit (`app/core/security_audit.py`)

Comprehensive audit logging and monitoring:

- **Security event logging** with 20+ event types
- **Threat pattern detection** for common attacks
- **Real-time monitoring** with automated alerts
- **Security analytics** and reporting
- **Admin dashboard** integration

## Installation & Setup

### Prerequisites

```bash
pip install psutil bleach email-validator cryptography pillow python-magic
```

### Database Setup

The security module requires the `audit_logs` table. Run the following to create it:

```python
from app.db.database import engine
from app.db.models import Base
Base.metadata.create_all(bind=engine)
```

### Environment Variables

Add these to your `.env` file:

```env
# Security Settings
SECRET_KEY=your-super-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
VERIFICATION_TOKEN_EXPIRE_HOURS=24
PASSWORD_RESET_TOKEN_EXPIRE_HOURS=1

# File Upload Settings
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760

# Rate Limiting (optional overrides)
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST_SIZE=200
```

## Usage Examples

### Input Validation

```python
from app.core.validation import InputValidator, validate_request_data

# Basic validation
validator = InputValidator()
is_valid_email = validator.validate_email("user@example.com")
is_strong_password = validator.validate_password("MyStr0ng!Pass")

# Sanitize user input
clean_html = validator.sanitize_html("<script>alert('xss')</script><p>Safe content</p>")
safe_filename = validator.sanitize_filename("../../../etc/passwd")

# Request data validation
validation_rules = {
    'email': {
        'required': True,
        'type': str,
        'validator': validator.validate_email
    },
    'password': {
        'required': True,
        'type': str,
        'min_length': 8,
        'validator': validator.validate_password
    }
}

validated_data = validate_request_data(request_data, validation_rules)
```

### Encryption

```python
from app.core.encryption import encryption_manager, pii_protection

# Encrypt sensitive data
encrypted_data = encryption_manager.encrypt_sensitive_data("sensitive information")
decrypted_data = encryption_manager.decrypt_sensitive_data(encrypted_data)

# PII protection
email_protection = pii_protection.protect_email("user@example.com")
# Returns: {'encrypted': '...', 'hash': '...'}

# File encryption
with open('sensitive_file.pdf', 'rb') as f:
    file_content = f.read()
encrypted_file = encryption_manager.encrypt_file_content(file_content)
```

### File Security

```python
from app.core.file_security import secure_file_upload
from fastapi import UploadFile

# Secure file upload
async def upload_file(file: UploadFile, user_id: int):
    try:
        result = secure_file_upload.save_file_securely(
            file=file,
            category='profile_images',
            user_id=user_id
        )
        return result
    except HTTPException as e:
        # Handle security rejection
        return {"error": e.detail}
```

### Security Audit Logging

```python
from app.core.security_audit import (
    log_login_attempt, 
    log_data_access, 
    log_suspicious_activity,
    security_audit_logger,
    SecurityEventType,
    SecurityLevel
)

# Log login attempt
log_login_attempt(
    user_id=123,
    success=True,
    request=request,
    details={"method": "password"}
)

# Log data access
log_data_access(
    user_id=123,
    resource="user_profile",
    action="read",
    request=request
)

# Log custom security event
security_audit_logger.log_security_event(
    event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
    severity=SecurityLevel.HIGH,
    user_id=123,
    request=request,
    details={"description": "Multiple failed login attempts"}
)
```

### GDPR Compliance

```python
from app.core.gdpr_compliance import gdpr_compliance

# Export user data
user_data = await gdpr_compliance.export_user_data(user_id=123, db=db_session)

# Delete user data (right to be forgotten)
deletion_summary = await gdpr_compliance.delete_user_data(
    user_id=123, 
    db=db_session,
    keep_legal_records=True
)

# Get data processing information
processing_info = await gdpr_compliance.get_data_processing_info(
    user_id=123, 
    db=db_session
)
```

## Configuration

### Rate Limiting Configuration

Customize rate limits in `app/core/rate_limiting.py`:

```python
# Endpoint-specific limits
endpoint_limits = {
    '/api/v1/auth/login': {'requests': 5, 'window': 300},  # 5 per 5 minutes
    '/api/v1/auth/register': {'requests': 3, 'window': 3600},  # 3 per hour
    '/api/v1/jobs': {'requests': 100, 'window': 3600},  # 100 per hour
    'default': {'requests': 1000, 'window': 3600}  # Default limit
}
```

### File Upload Configuration

Configure allowed file types in `app/core/file_security.py`:

```python
ALLOWED_FILE_TYPES = {
    'images': {
        'extensions': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        'mime_types': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        'max_size': 10 * 1024 * 1024,  # 10MB
    },
    'documents': {
        'extensions': ['.pdf', '.doc', '.docx', '.txt'],
        'mime_types': ['application/pdf', 'application/msword', 'text/plain'],
        'max_size': 25 * 1024 * 1024,  # 25MB
    }
}
```

### Data Retention Policies

Configure retention periods in `app/core/gdpr_compliance.py`:

```python
data_retention_periods = {
    'user_profiles': 365 * 7,  # 7 years
    'job_postings': 365 * 3,   # 3 years
    'messages': 365 * 2,       # 2 years
    'payment_records': 365 * 7, # 7 years (legal requirement)
    'audit_logs': 365 * 6,     # 6 years
}
```

## API Endpoints

### Security Management Endpoints

All security endpoints require admin privileges and are prefixed with `/api/v1/security/`:

#### GET `/audit-logs`
Retrieve security audit logs with filtering options.

**Query Parameters:**
- `start_time`: Filter logs from this timestamp
- `end_time`: Filter logs until this timestamp
- `event_type`: Filter by specific event type
- `user_id`: Filter by user ID
- `ip_address`: Filter by IP address
- `severity`: Filter by severity level
- `limit`: Maximum number of logs (default: 100, max: 1000)

**Response:**
```json
{
  "events": [
    {
      "event_type": "login_success",
      "user_id": 123,
      "ip_address": "192.168.1.1",
      "timestamp": "2024-01-01T12:00:00Z",
      "severity": "low",
      "details": {...}
    }
  ],
  "total_count": 50,
  "filters_applied": {...}
}
```

#### GET `/security-summary`
Get security metrics summary for a specified time period.

**Query Parameters:**
- `hours`: Time period in hours (default: 24, max: 168)

**Response:**
```json
{
  "time_period_hours": 24,
  "total_events": 1250,
  "events_by_type": {
    "login_success": 800,
    "login_failure": 45,
    "suspicious_activity": 12
  },
  "events_by_severity": {
    "low": 1100,
    "medium": 120,
    "high": 25,
    "critical": 5
  },
  "top_ips": {
    "192.168.1.1": 150,
    "10.0.0.1": 89
  }
}
```

#### GET `/threat-analysis`
Get detailed threat analysis and security recommendations.

**Query Parameters:**
- `hours`: Analysis time period (default: 24, max: 168)

**Response:**
```json
{
  "time_period_hours": 24,
  "suspicious_activities": {
    "total_count": 15,
    "by_type": {
      "sql_injection_attempt": 8,
      "xss_attempt": 4,
      "suspicious_activity": 3
    },
    "top_ips": {
      "192.168.1.100": 8,
      "10.0.0.50": 4
    }
  },
  "failed_logins": {
    "total_count": 45,
    "by_ip": {
      "192.168.1.200": 12,
      "10.0.0.75": 8
    }
  },
  "recommendations": [
    "Consider blocking IPs with multiple failed attempts",
    "Review security policies due to high suspicious activity"
  ]
}
```

## Security Features

### Protection Against Common Attacks

#### 1. Cross-Site Scripting (XSS)
- HTML sanitization with allowlist approach
- Content Security Policy headers
- Input encoding and validation

#### 2. SQL Injection
- Parameterized queries (SQLAlchemy ORM)
- Input validation and sanitization
- Pattern detection in search queries

#### 3. Cross-Site Request Forgery (CSRF)
- CSRF token validation
- SameSite cookie attributes
- Origin header verification

#### 4. File Upload Attacks
- File type validation by extension and content
- Malware signature detection
- File size limits and virus scanning
- Secure file storage with encryption

#### 5. Brute Force Attacks
- Rate limiting with progressive delays
- Account lockout mechanisms
- IP-based blocking for suspicious activity

#### 6. Data Breaches
- Encryption at rest for sensitive data
- PII protection with additional security layers
- Secure key management
- Access logging and monitoring

### Security Headers

The application automatically adds security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## GDPR Compliance

### Data Subject Rights

The module implements all GDPR data subject rights:

#### 1. Right to Access (Article 15)
```python
# Export all user data
user_data = await gdpr_compliance.export_user_data(user_id, db)
```

#### 2. Right to Rectification (Article 16)
- Standard CRUD operations with audit logging
- Data validation ensures accuracy

#### 3. Right to Erasure (Article 17)
```python
# Delete user data with legal record retention
deletion_summary = await gdpr_compliance.delete_user_data(
    user_id, db, keep_legal_records=True
)
```

#### 4. Right to Restrict Processing (Article 18)
```python
# Anonymize data while preserving business records
anonymization_summary = await gdpr_compliance.anonymize_user_data(user_id, db)
```

#### 5. Right to Data Portability (Article 20)
- JSON export format for easy data transfer
- Structured data with relationships preserved

#### 6. Right to Object (Article 21)
- Opt-out mechanisms for marketing communications
- Processing basis documentation

### Legal Basis Documentation

```python
# Get processing information for transparency
processing_info = await gdpr_compliance.get_data_processing_info(user_id, db)
```

Returns detailed information about:
- Data categories and types
- Processing purposes
- Legal basis for each type
- Retention periods
- Third-party sharing
- User rights
- Contact information

### Data Retention

Automated cleanup based on retention policies:

```python
# Run periodic cleanup
cleanup_summary = await gdpr_compliance.cleanup_expired_data(db)
```

## Monitoring & Alerts

### Real-time Security Monitoring

The security monitor runs continuously and checks for:

- **Failed login thresholds**: 10+ failures per IP per hour
- **Suspicious activities**: 5+ suspicious events per hour
- **Critical events**: Any critical security event
- **Data access anomalies**: 50+ data access events per user per hour

### Alert Configuration

Customize alert thresholds in `app/core/security_audit.py`:

```python
alert_thresholds = {
    'failed_logins_per_ip': 10,  # per hour
    'suspicious_activities': 5,   # per hour
    'critical_events': 1,        # any critical event
    'data_access_anomaly': 50,   # per hour per user
}
```

### Security Metrics

Available metrics include:
- Request counts by endpoint
- Error rates and response times
- Security event frequencies
- User activity patterns
- System resource usage

## Best Practices

### 1. Input Validation
```python
# Always validate and sanitize user input
validated_data = validate_request_data(request.json(), validation_rules)

# Use type hints and Pydantic models
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
```

### 2. Authentication & Authorization
```python
# Use dependency injection for auth
from app.core.deps import get_current_user, get_current_admin_user

@router.get("/protected")
async def protected_endpoint(current_user: User = Depends(get_current_user)):
    # Endpoint logic here
    pass
```

### 3. Logging Security Events
```python
# Log all security-relevant actions
log_data_access(user_id, "user_profile", "read", request)
log_admin_action(admin_id, "user_deletion", f"user_{user_id}", request)
```

### 4. Error Handling
```python
# Don't expose sensitive information in errors
try:
    # Sensitive operation
    pass
except Exception as e:
    logger.error(f"Operation failed: {str(e)}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

### 5. File Uploads
```python
# Always validate file uploads
scan_result = secure_file_upload.save_file_securely(file, "documents", user_id)
if not scan_result:
    raise HTTPException(status_code=400, detail="File upload rejected")
```

## Troubleshooting

### Common Issues

#### 1. Rate Limiting Too Aggressive
**Symptom**: Legitimate users getting rate limited
**Solution**: Adjust rate limits in `rate_limiting.py`

```python
# Increase limits for specific endpoints
endpoint_limits['/api/v1/jobs'] = {'requests': 200, 'window': 3600}
```

#### 2. File Upload Rejections
**Symptom**: Valid files being rejected
**Solution**: Check file type configuration and logs

```python
# Enable debug logging
import logging
logging.getLogger('app.core.file_security').setLevel(logging.DEBUG)
```

#### 3. Encryption Errors
**Symptom**: Cannot decrypt previously encrypted data
**Solution**: Verify SECRET_KEY hasn't changed

```python
# Check if key derivation is consistent
from app.core.encryption import encryption_manager
test_data = "test"
encrypted = encryption_manager.encrypt_sensitive_data(test_data)
decrypted = encryption_manager.decrypt_sensitive_data(encrypted)
assert test_data == decrypted
```

#### 4. Database Connection Issues
**Symptom**: Audit logging fails
**Solution**: Verify database connection and table creation

```python
# Manually create tables
from app.db.database import engine
from app.db.models import Base
Base.metadata.create_all(bind=engine)
```

### Performance Optimization

#### 1. Database Indexes
Ensure proper indexing for audit logs:

```sql
CREATE INDEX idx_audit_logs_timestamp_severity ON audit_logs(timestamp, severity);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX idx_audit_logs_ip_timestamp ON audit_logs(ip_address, timestamp);
```

#### 2. Memory Management
Configure cleanup intervals:

```python
# Adjust cleanup frequency in monitoring loop
await asyncio.sleep(300)  # Clean up every 5 minutes
```

#### 3. Rate Limiter Optimization
```python
# Adjust token bucket parameters
token_buckets[ip] = {
    'tokens': 100,      # Initial tokens
    'capacity': 100,    # Max tokens
    'refill_rate': 10   # Tokens per second
}
```

### Debugging

Enable debug logging for security components:

```python
import logging

# Enable debug logging for all security modules
logging.getLogger('app.core.validation').setLevel(logging.DEBUG)
logging.getLogger('app.core.security_audit').setLevel(logging.DEBUG)
logging.getLogger('app.core.rate_limiting').setLevel(logging.DEBUG)
logging.getLogger('app.core.file_security').setLevel(logging.DEBUG)
```

## Security Checklist

Before deploying to production:

- [ ] Change default SECRET_KEY
- [ ] Configure proper rate limits
- [ ] Set up SSL/TLS certificates
- [ ] Configure security headers
- [ ] Set up log monitoring and alerting
- [ ] Test file upload restrictions
- [ ] Verify encryption/decryption works
- [ ] Test GDPR data export/deletion
- [ ] Configure backup and recovery
- [ ] Set up intrusion detection
- [ ] Review and test all security endpoints
- [ ] Conduct security penetration testing

## Support

For security-related issues or questions:

1. Check the troubleshooting section above
2. Review application logs for error details
3. Test individual components using the usage examples
4. Consult the FastAPI and SQLAlchemy documentation for framework-specific issues

## License

This security module is part of the Handwork Marketplace application and follows the same licensing terms.