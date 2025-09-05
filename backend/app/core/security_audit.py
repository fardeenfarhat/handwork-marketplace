"""
Security audit logging and monitoring system
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session
from fastapi import Request
import hashlib
import ipaddress
from collections import defaultdict, deque
import asyncio

from app.core.config import settings
from app.db.database import get_db

logger = logging.getLogger(__name__)

class SecurityEventType(Enum):
    """Security event types for audit logging"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_SUCCESS = "password_reset_success"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    PERMISSION_DENIED = "permission_denied"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    DATA_DELETION = "data_deletion"
    FILE_UPLOAD = "file_upload"
    FILE_DOWNLOAD = "file_download"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    MALWARE_DETECTED = "malware_detected"
    SQL_INJECTION_ATTEMPT = "sql_injection_attempt"
    XSS_ATTEMPT = "xss_attempt"
    CSRF_ATTEMPT = "csrf_attempt"
    GDPR_DATA_EXPORT = "gdpr_data_export"
    GDPR_DATA_DELETION = "gdpr_data_deletion"
    ADMIN_ACTION = "admin_action"
    SYSTEM_ERROR = "system_error"

class SecurityLevel(Enum):
    """Security event severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_type: SecurityEventType
    user_id: Optional[int]
    ip_address: str
    user_agent: str
    timestamp: datetime
    details: Dict[str, Any]
    severity: SecurityLevel
    session_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    response_time: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['event_type'] = self.event_type.value
        data['severity'] = self.severity.value
        data['timestamp'] = self.timestamp.isoformat()
        return data

class SecurityAuditLogger:
    """Security audit logging system"""
    
    def __init__(self):
        self.event_buffer = deque(maxlen=10000)  # In-memory buffer for recent events
        self.threat_patterns = self._load_threat_patterns()
        self.suspicious_ips = defaultdict(list)  # Track suspicious IP activity
        self.failed_login_attempts = defaultdict(list)  # Track failed login attempts
        
    def _load_threat_patterns(self) -> Dict[str, List[str]]:
        """Load known threat patterns for detection"""
        return {
            'sql_injection': [
                r"(\bunion\b.*\bselect\b)",
                r"(\bselect\b.*\bfrom\b.*\bwhere\b)",
                r"(\bdrop\b.*\btable\b)",
                r"(\binsert\b.*\binto\b)",
                r"(\bupdate\b.*\bset\b)",
                r"(\bdelete\b.*\bfrom\b)",
                r"(\bor\b.*=.*\bor\b)",
                r"(\band\b.*=.*\band\b)",
                r"['\"];.*--",
                r"['\"].*\bor\b.*['\"].*=.*['\"]"
            ],
            'xss': [
                r"<script[^>]*>.*</script>",
                r"javascript:",
                r"vbscript:",
                r"onload\s*=",
                r"onerror\s*=",
                r"onclick\s*=",
                r"onmouseover\s*=",
                r"<iframe[^>]*>",
                r"eval\s*\(",
                r"document\.cookie",
                r"document\.write"
            ],
            'path_traversal': [
                r"\.\./",
                r"\.\.\\",
                r"%2e%2e%2f",
                r"%2e%2e\\",
                r"..%2f",
                r"..%5c"
            ],
            'command_injection': [
                r";\s*(ls|cat|pwd|whoami|id|uname)",
                r"\|\s*(ls|cat|pwd|whoami|id|uname)",
                r"&&\s*(ls|cat|pwd|whoami|id|uname)",
                r"`.*`",
                r"\$\(.*\)"
            ]
        }
    
    def log_security_event(
        self,
        event_type: SecurityEventType,
        severity: SecurityLevel,
        user_id: Optional[int] = None,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
        details: Dict[str, Any] = None,
        request: Optional[Request] = None
    ):
        """Log a security event"""
        try:
            # Extract request information if provided
            if request:
                ip_address = self._get_client_ip(request)
                user_agent = request.headers.get("User-Agent", "unknown")
                endpoint = str(request.url.path)
                method = request.method
            else:
                endpoint = None
                method = None
            
            # Create security event
            event = SecurityEvent(
                event_type=event_type,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                timestamp=datetime.utcnow(),
                details=details or {},
                severity=severity,
                endpoint=endpoint,
                method=method
            )
            
            # Add to buffer
            self.event_buffer.append(event)
            
            # Log to file/database
            self._persist_event(event)
            
            # Check for suspicious patterns
            self._analyze_event_for_threats(event)
            
            # Log to standard logger based on severity
            log_message = f"Security Event: {event_type.value} - User: {user_id} - IP: {ip_address}"
            if severity == SecurityLevel.CRITICAL:
                logger.critical(log_message, extra={"security_event": event.to_dict()})
            elif severity == SecurityLevel.HIGH:
                logger.error(log_message, extra={"security_event": event.to_dict()})
            elif severity == SecurityLevel.MEDIUM:
                logger.warning(log_message, extra={"security_event": event.to_dict()})
            else:
                logger.info(log_message, extra={"security_event": event.to_dict()})
                
        except Exception as e:
            logger.error(f"Failed to log security event: {str(e)}")
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded headers (behind proxy)
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else 'unknown'
    
    def _persist_event(self, event: SecurityEvent):
        """Persist security event to database"""
        try:
            db = next(get_db())
            from app.db.models import AuditLog
            
            audit_log = AuditLog(
                user_id=event.user_id,
                action=event.event_type.value,
                details=json.dumps(event.details),
                ip_address=event.ip_address,
                user_agent=event.user_agent,
                timestamp=event.timestamp,
                severity=event.severity.value,
                endpoint=event.endpoint,
                method=event.method
            )
            
            db.add(audit_log)
            db.commit()
            
        except Exception as e:
            logger.error(f"Failed to persist security event: {str(e)}")
    
    def _analyze_event_for_threats(self, event: SecurityEvent):
        """Analyze event for threat patterns"""
        try:
            # Track failed login attempts
            if event.event_type == SecurityEventType.LOGIN_FAILURE:
                self.failed_login_attempts[event.ip_address].append(event.timestamp)
                
                # Check for brute force attack
                recent_failures = [
                    t for t in self.failed_login_attempts[event.ip_address]
                    if t > datetime.utcnow() - timedelta(minutes=15)
                ]
                
                if len(recent_failures) >= 5:  # 5 failures in 15 minutes
                    self.log_security_event(
                        SecurityEventType.SUSPICIOUS_ACTIVITY,
                        SecurityLevel.HIGH,
                        ip_address=event.ip_address,
                        details={
                            "threat_type": "brute_force_attack",
                            "failed_attempts": len(recent_failures),
                            "time_window": "15_minutes"
                        }
                    )
            
            # Analyze request content for injection attempts
            if event.details and 'request_data' in event.details:
                request_data = str(event.details['request_data']).lower()
                
                for threat_type, patterns in self.threat_patterns.items():
                    for pattern in patterns:
                        import re
                        if re.search(pattern, request_data, re.IGNORECASE):
                            threat_event_type = {
                                'sql_injection': SecurityEventType.SQL_INJECTION_ATTEMPT,
                                'xss': SecurityEventType.XSS_ATTEMPT,
                                'path_traversal': SecurityEventType.SUSPICIOUS_ACTIVITY,
                                'command_injection': SecurityEventType.SUSPICIOUS_ACTIVITY
                            }.get(threat_type, SecurityEventType.SUSPICIOUS_ACTIVITY)
                            
                            self.log_security_event(
                                threat_event_type,
                                SecurityLevel.HIGH,
                                user_id=event.user_id,
                                ip_address=event.ip_address,
                                details={
                                    "threat_type": threat_type,
                                    "pattern_matched": pattern,
                                    "original_event": event.event_type.value
                                }
                            )
                            break
            
        except Exception as e:
            logger.error(f"Failed to analyze event for threats: {str(e)}")
    
    def get_security_events(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        event_types: Optional[List[SecurityEventType]] = None,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        severity: Optional[SecurityLevel] = None,
        limit: int = 100
    ) -> List[SecurityEvent]:
        """Retrieve security events based on filters"""
        try:
            db = next(get_db())
            from app.db.models import AuditLog
            
            query = db.query(AuditLog)
            
            if start_time:
                query = query.filter(AuditLog.timestamp >= start_time)
            if end_time:
                query = query.filter(AuditLog.timestamp <= end_time)
            if user_id:
                query = query.filter(AuditLog.user_id == user_id)
            if ip_address:
                query = query.filter(AuditLog.ip_address == ip_address)
            if severity:
                query = query.filter(AuditLog.severity == severity.value)
            if event_types:
                event_type_values = [et.value for et in event_types]
                query = query.filter(AuditLog.action.in_(event_type_values))
            
            audit_logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
            
            # Convert to SecurityEvent objects
            events = []
            for log in audit_logs:
                try:
                    event = SecurityEvent(
                        event_type=SecurityEventType(log.action),
                        user_id=log.user_id,
                        ip_address=log.ip_address,
                        user_agent=log.user_agent,
                        timestamp=log.timestamp,
                        details=json.loads(log.details) if log.details else {},
                        severity=SecurityLevel(log.severity) if log.severity else SecurityLevel.LOW,
                        endpoint=log.endpoint,
                        method=log.method
                    )
                    events.append(event)
                except (ValueError, json.JSONDecodeError):
                    # Skip invalid events
                    continue
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to retrieve security events: {str(e)}")
            return []
    
    def get_security_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get security summary for the specified time period"""
        try:
            start_time = datetime.utcnow() - timedelta(hours=hours)
            events = self.get_security_events(start_time=start_time, limit=10000)
            
            summary = {
                'time_period_hours': hours,
                'total_events': len(events),
                'events_by_type': defaultdict(int),
                'events_by_severity': defaultdict(int),
                'top_ips': defaultdict(int),
                'failed_logins': 0,
                'successful_logins': 0,
                'suspicious_activities': 0,
                'data_access_events': 0,
                'admin_actions': 0
            }
            
            for event in events:
                summary['events_by_type'][event.event_type.value] += 1
                summary['events_by_severity'][event.severity.value] += 1
                summary['top_ips'][event.ip_address] += 1
                
                if event.event_type == SecurityEventType.LOGIN_FAILURE:
                    summary['failed_logins'] += 1
                elif event.event_type == SecurityEventType.LOGIN_SUCCESS:
                    summary['successful_logins'] += 1
                elif event.event_type == SecurityEventType.SUSPICIOUS_ACTIVITY:
                    summary['suspicious_activities'] += 1
                elif event.event_type == SecurityEventType.DATA_ACCESS:
                    summary['data_access_events'] += 1
                elif event.event_type == SecurityEventType.ADMIN_ACTION:
                    summary['admin_actions'] += 1
            
            # Convert defaultdicts to regular dicts and get top IPs
            summary['events_by_type'] = dict(summary['events_by_type'])
            summary['events_by_severity'] = dict(summary['events_by_severity'])
            summary['top_ips'] = dict(sorted(summary['top_ips'].items(), key=lambda x: x[1], reverse=True)[:10])
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate security summary: {str(e)}")
            return {}

class SecurityMonitor:
    """Real-time security monitoring and alerting"""
    
    def __init__(self, audit_logger: SecurityAuditLogger):
        self.audit_logger = audit_logger
        self.alert_thresholds = {
            'failed_logins_per_ip': 10,  # per hour
            'suspicious_activities': 5,   # per hour
            'critical_events': 1,        # any critical event
            'data_access_anomaly': 50,   # per hour per user
        }
        self.monitoring_active = False
    
    async def start_monitoring(self):
        """Start real-time security monitoring"""
        self.monitoring_active = True
        logger.info("Security monitoring started")
        
        while self.monitoring_active:
            try:
                await self._check_security_alerts()
                await asyncio.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Security monitoring error: {str(e)}")
                await asyncio.sleep(30)
    
    def stop_monitoring(self):
        """Stop security monitoring"""
        self.monitoring_active = False
        logger.info("Security monitoring stopped")
    
    async def _check_security_alerts(self):
        """Check for security alert conditions"""
        try:
            # Get recent events (last hour)
            start_time = datetime.utcnow() - timedelta(hours=1)
            events = self.audit_logger.get_security_events(start_time=start_time, limit=1000)
            
            # Check for failed login threshold
            failed_logins_by_ip = defaultdict(int)
            suspicious_activities = 0
            critical_events = 0
            data_access_by_user = defaultdict(int)
            
            for event in events:
                if event.event_type == SecurityEventType.LOGIN_FAILURE:
                    failed_logins_by_ip[event.ip_address] += 1
                elif event.event_type == SecurityEventType.SUSPICIOUS_ACTIVITY:
                    suspicious_activities += 1
                elif event.severity == SecurityLevel.CRITICAL:
                    critical_events += 1
                elif event.event_type == SecurityEventType.DATA_ACCESS and event.user_id:
                    data_access_by_user[event.user_id] += 1
            
            # Check thresholds and trigger alerts
            for ip, count in failed_logins_by_ip.items():
                if count >= self.alert_thresholds['failed_logins_per_ip']:
                    await self._trigger_alert(
                        "Excessive failed logins",
                        f"IP {ip} has {count} failed login attempts in the last hour",
                        SecurityLevel.HIGH
                    )
            
            if suspicious_activities >= self.alert_thresholds['suspicious_activities']:
                await self._trigger_alert(
                    "High suspicious activity",
                    f"{suspicious_activities} suspicious activities detected in the last hour",
                    SecurityLevel.HIGH
                )
            
            if critical_events >= self.alert_thresholds['critical_events']:
                await self._trigger_alert(
                    "Critical security events",
                    f"{critical_events} critical security events in the last hour",
                    SecurityLevel.CRITICAL
                )
            
            for user_id, count in data_access_by_user.items():
                if count >= self.alert_thresholds['data_access_anomaly']:
                    await self._trigger_alert(
                        "Unusual data access pattern",
                        f"User {user_id} accessed data {count} times in the last hour",
                        SecurityLevel.MEDIUM
                    )
                    
        except Exception as e:
            logger.error(f"Failed to check security alerts: {str(e)}")
    
    async def _trigger_alert(self, title: str, message: str, severity: SecurityLevel):
        """Trigger a security alert"""
        try:
            alert_data = {
                'title': title,
                'message': message,
                'severity': severity.value,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Log the alert
            self.audit_logger.log_security_event(
                SecurityEventType.SYSTEM_ERROR,
                severity,
                details={'alert': alert_data}
            )
            
            # Here you could send notifications, emails, etc.
            logger.warning(f"SECURITY ALERT: {title} - {message}")
            
        except Exception as e:
            logger.error(f"Failed to trigger security alert: {str(e)}")

# Global instances
security_audit_logger = SecurityAuditLogger()
security_monitor = SecurityMonitor(security_audit_logger)

# Convenience functions for common security events
def log_login_attempt(user_id: Optional[int], success: bool, request: Request, details: Dict[str, Any] = None):
    """Log login attempt"""
    event_type = SecurityEventType.LOGIN_SUCCESS if success else SecurityEventType.LOGIN_FAILURE
    severity = SecurityLevel.LOW if success else SecurityLevel.MEDIUM
    
    security_audit_logger.log_security_event(
        event_type=event_type,
        severity=severity,
        user_id=user_id,
        request=request,
        details=details or {}
    )

def log_data_access(user_id: int, resource: str, action: str, request: Request, details: Dict[str, Any] = None):
    """Log data access event"""
    event_details = {
        'resource': resource,
        'action': action,
        **(details or {})
    }
    
    security_audit_logger.log_security_event(
        event_type=SecurityEventType.DATA_ACCESS,
        severity=SecurityLevel.LOW,
        user_id=user_id,
        request=request,
        details=event_details
    )

def log_admin_action(user_id: int, action: str, target: str, request: Request, details: Dict[str, Any] = None):
    """Log administrative action"""
    event_details = {
        'admin_action': action,
        'target': target,
        **(details or {})
    }
    
    security_audit_logger.log_security_event(
        event_type=SecurityEventType.ADMIN_ACTION,
        severity=SecurityLevel.MEDIUM,
        user_id=user_id,
        request=request,
        details=event_details
    )

def log_suspicious_activity(description: str, request: Request, user_id: Optional[int] = None, details: Dict[str, Any] = None):
    """Log suspicious activity"""
    event_details = {
        'description': description,
        **(details or {})
    }
    
    security_audit_logger.log_security_event(
        event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity=SecurityLevel.HIGH,
        user_id=user_id,
        request=request,
        details=event_details
    )