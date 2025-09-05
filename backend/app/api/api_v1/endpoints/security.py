"""
Security audit and monitoring endpoints
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin_user, get_db
from app.core.security_audit import (
    security_audit_logger, 
    SecurityEventType, 
    SecurityLevel,
    log_admin_action
)
from app.db.models import User

router = APIRouter()

@router.get("/audit-logs")
async def get_audit_logs(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
    start_time: Optional[datetime] = Query(None, description="Start time for log retrieval"),
    end_time: Optional[datetime] = Query(None, description="End time for log retrieval"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    ip_address: Optional[str] = Query(None, description="Filter by IP address"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    limit: int = Query(100, le=1000, description="Maximum number of logs to return")
):
    """Get security audit logs (admin only)"""
    
    # Log admin access to audit logs
    log_admin_action(
        user_id=current_user.id,
        action="view_audit_logs",
        target="security_audit_logs",
        request=request,
        details={
            "filters": {
                "start_time": start_time.isoformat() if start_time else None,
                "end_time": end_time.isoformat() if end_time else None,
                "event_type": event_type,
                "user_id": user_id,
                "ip_address": ip_address,
                "severity": severity,
                "limit": limit
            }
        }
    )
    
    try:
        # Parse filters
        event_types = None
        if event_type:
            try:
                event_types = [SecurityEventType(event_type)]
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid event type: {event_type}"
                )
        
        severity_level = None
        if severity:
            try:
                severity_level = SecurityLevel(severity)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid severity level: {severity}"
                )
        
        # Get audit logs
        events = security_audit_logger.get_security_events(
            start_time=start_time,
            end_time=end_time,
            event_types=event_types,
            user_id=user_id,
            ip_address=ip_address,
            severity=severity_level,
            limit=limit
        )
        
        # Convert to dict format for JSON response
        return {
            "events": [event.to_dict() for event in events],
            "total_count": len(events),
            "filters_applied": {
                "start_time": start_time.isoformat() if start_time else None,
                "end_time": end_time.isoformat() if end_time else None,
                "event_type": event_type,
                "user_id": user_id,
                "ip_address": ip_address,
                "severity": severity,
                "limit": limit
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve audit logs: {str(e)}"
        )

@router.get("/security-summary")
async def get_security_summary(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    hours: int = Query(24, ge=1, le=168, description="Time period in hours (max 1 week)")
):
    """Get security summary for the specified time period (admin only)"""
    
    # Log admin access to security summary
    log_admin_action(
        user_id=current_user.id,
        action="view_security_summary",
        target="security_metrics",
        request=request,
        details={"time_period_hours": hours}
    )
    
    try:
        summary = security_audit_logger.get_security_summary(hours=hours)
        return summary
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate security summary: {str(e)}"
        )

@router.get("/threat-analysis")
async def get_threat_analysis(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    hours: int = Query(24, ge=1, le=168, description="Time period in hours")
):
    """Get threat analysis and suspicious activity report (admin only)"""
    
    # Log admin access to threat analysis
    log_admin_action(
        user_id=current_user.id,
        action="view_threat_analysis",
        target="threat_metrics",
        request=request,
        details={"time_period_hours": hours}
    )
    
    try:
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Get suspicious activities
        suspicious_events = security_audit_logger.get_security_events(
            start_time=start_time,
            event_types=[
                SecurityEventType.SUSPICIOUS_ACTIVITY,
                SecurityEventType.SQL_INJECTION_ATTEMPT,
                SecurityEventType.XSS_ATTEMPT,
                SecurityEventType.MALWARE_DETECTED,
                SecurityEventType.RATE_LIMIT_EXCEEDED
            ],
            limit=1000
        )
        
        # Get failed login attempts
        failed_logins = security_audit_logger.get_security_events(
            start_time=start_time,
            event_types=[SecurityEventType.LOGIN_FAILURE],
            limit=1000
        )
        
        # Analyze patterns
        threat_analysis = {
            "time_period_hours": hours,
            "suspicious_activities": {
                "total_count": len(suspicious_events),
                "by_type": {},
                "top_ips": {},
                "recent_events": [event.to_dict() for event in suspicious_events[:10]]
            },
            "failed_logins": {
                "total_count": len(failed_logins),
                "by_ip": {},
                "by_user": {},
                "recent_attempts": [event.to_dict() for event in failed_logins[:10]]
            },
            "recommendations": []
        }
        
        # Analyze suspicious activities by type
        for event in suspicious_events:
            event_type = event.event_type.value
            threat_analysis["suspicious_activities"]["by_type"][event_type] = \
                threat_analysis["suspicious_activities"]["by_type"].get(event_type, 0) + 1
            
            threat_analysis["suspicious_activities"]["top_ips"][event.ip_address] = \
                threat_analysis["suspicious_activities"]["top_ips"].get(event.ip_address, 0) + 1
        
        # Analyze failed logins
        for event in failed_logins:
            threat_analysis["failed_logins"]["by_ip"][event.ip_address] = \
                threat_analysis["failed_logins"]["by_ip"].get(event.ip_address, 0) + 1
            
            if event.user_id:
                threat_analysis["failed_logins"]["by_user"][event.user_id] = \
                    threat_analysis["failed_logins"]["by_user"].get(event.user_id, 0) + 1
        
        # Generate recommendations
        if len(suspicious_events) > 10:
            threat_analysis["recommendations"].append(
                "High number of suspicious activities detected. Consider reviewing security policies."
            )
        
        if len(failed_logins) > 50:
            threat_analysis["recommendations"].append(
                "High number of failed login attempts. Consider implementing additional authentication measures."
            )
        
        # Check for IPs with multiple failed attempts
        high_risk_ips = [ip for ip, count in threat_analysis["failed_logins"]["by_ip"].items() if count >= 5]
        if high_risk_ips:
            threat_analysis["recommendations"].append(
                f"Consider blocking or monitoring IPs with multiple failed attempts: {', '.join(high_risk_ips[:5])}"
            )
        
        return threat_analysis
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate threat analysis: {str(e)}"
        )

@router.post("/test-security-event")
async def test_security_event(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    event_type: str = "suspicious_activity",
    severity: str = "medium"
):
    """Test security event logging (admin only, for testing purposes)"""
    
    try:
        event_type_enum = SecurityEventType(event_type)
        severity_enum = SecurityLevel(severity)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event type or severity: {str(e)}"
        )
    
    # Log the test event
    security_audit_logger.log_security_event(
        event_type=event_type_enum,
        severity=severity_enum,
        user_id=current_user.id,
        request=request,
        details={
            "test_event": True,
            "triggered_by_admin": current_user.id,
            "description": "Test security event for system validation"
        }
    )
    
    # Log admin action
    log_admin_action(
        user_id=current_user.id,
        action="test_security_event",
        target="security_system",
        request=request,
        details={
            "event_type": event_type,
            "severity": severity
        }
    )
    
    return {
        "message": "Test security event logged successfully",
        "event_type": event_type,
        "severity": severity,
        "timestamp": datetime.utcnow().isoformat()
    }