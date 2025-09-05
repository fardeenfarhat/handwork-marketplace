from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.services.notification_service import NotificationService
from app.schemas.notifications import (
    NotificationResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    FCMTokenRequest,
    NotificationHistoryResponse
)

router = APIRouter()

@router.post("/register-token")
async def register_fcm_token(
    token_data: FCMTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register FCM token for push notifications"""
    
    notification_service = NotificationService(db)
    
    success = await notification_service.register_fcm_token(
        user_id=current_user.id,
        token=token_data.token,
        platform=token_data.platform
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register FCM token"
        )
    
    return {"message": "FCM token registered successfully"}

@router.delete("/unregister-token")
async def unregister_fcm_token(
    token_data: FCMTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unregister FCM token"""
    
    notification_service = NotificationService(db)
    
    success = await notification_service.unregister_fcm_token(
        user_id=current_user.id,
        token=token_data.token
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unregister FCM token"
        )
    
    return {"message": "FCM token unregistered successfully"}

@router.get("/unread", response_model=List[NotificationResponse])
def get_unread_notifications(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread notifications for current user"""
    
    notification_service = NotificationService(db)
    notifications = notification_service.get_unread_notifications(
        user_id=current_user.id,
        limit=limit
    )
    
    return notifications

@router.get("/history", response_model=NotificationHistoryResponse)
def get_notification_history(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification history for current user"""
    
    notification_service = NotificationService(db)
    notifications = notification_service.get_notification_history(
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )
    
    # Get total count for pagination
    from app.db.models import Notification
    total_count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .count()
    )
    
    return {
        "notifications": notifications,
        "total_count": total_count,
        "limit": limit,
        "offset": offset
    }

@router.put("/mark-read")
def mark_notifications_as_read(
    notification_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notifications as read"""
    
    notification_service = NotificationService(db)
    updated_count = notification_service.mark_notifications_as_read(
        user_id=current_user.id,
        notification_ids=notification_ids
    )
    
    return {
        "message": f"Marked {updated_count} notifications as read",
        "updated_count": updated_count
    }

@router.put("/mark-all-read")
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    
    from app.db.models import Notification
    
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .update({Notification.is_read: True}, synchronize_session=False)
    )
    
    db.commit()
    
    return {
        "message": f"Marked {updated_count} notifications as read",
        "updated_count": updated_count
    }

@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification preferences for current user"""
    
    # This would query UserNotificationPreferences table
    # For now, return default preferences
    return {
        "job_updates": True,
        "messages": True,
        "payments": True,
        "reviews": True,
        "bookings": True,
        "marketing": False,
        "push_enabled": True,
        "email_enabled": True,
        "sms_enabled": False,
        "quiet_hours_enabled": False,
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "08:00"
    }

@router.put("/preferences")
def update_notification_preferences(
    preferences: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification preferences for current user"""
    
    # This would update UserNotificationPreferences table
    # For now, just return success
    
    return {
        "message": "Notification preferences updated successfully",
        "preferences": preferences.dict(exclude_unset=True)
    }

@router.delete("/clear-history")
def clear_notification_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear notification history for current user"""
    
    from app.db.models import Notification
    
    deleted_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == True
        )
        .delete(synchronize_session=False)
    )
    
    db.commit()
    
    return {
        "message": f"Cleared {deleted_count} notifications from history",
        "deleted_count": deleted_count
    }

@router.get("/badge-count")
def get_badge_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread notification count for badge"""
    
    from app.db.models import Notification
    
    unread_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .count()
    )
    
    return {"badge_count": unread_count}