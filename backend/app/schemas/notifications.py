from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    MESSAGE = "message"
    JOB_UPDATE = "job_update"
    BOOKING_UPDATE = "booking_update"
    PAYMENT = "payment"
    REVIEW = "review"
    SYSTEM = "system"

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: NotificationType
    data: Dict[str, Any] = {}
    is_read: bool
    created_at: datetime
    scheduled_for: Optional[datetime] = None
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationHistoryResponse(BaseModel):
    notifications: List[NotificationResponse]
    total_count: int
    limit: int
    offset: int

class FCMTokenRequest(BaseModel):
    token: str = Field(..., description="FCM token")
    platform: str = Field(..., description="Platform (ios/android)")

class NotificationPreferencesResponse(BaseModel):
    job_updates: bool = True
    messages: bool = True
    payments: bool = True
    reviews: bool = True
    bookings: bool = True
    marketing: bool = False
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "08:00"

class NotificationPreferencesUpdate(BaseModel):
    job_updates: Optional[bool] = None
    messages: Optional[bool] = None
    payments: Optional[bool] = None
    reviews: Optional[bool] = None
    bookings: Optional[bool] = None
    marketing: Optional[bool] = None
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None

class PushNotificationRequest(BaseModel):
    user_id: int
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    notification_type: NotificationType = NotificationType.SYSTEM

class ScheduledNotificationRequest(BaseModel):
    user_id: int
    title: str
    body: str
    scheduled_for: datetime
    data: Optional[Dict[str, Any]] = None
    notification_type: NotificationType = NotificationType.SYSTEM