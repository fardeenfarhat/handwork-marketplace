from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import json
import logging
import asyncio
from datetime import datetime, timedelta

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logging.warning("Firebase Admin SDK not available. Push notifications will be disabled.")

from app.db.models import Notification, User, NotificationType
from app.core.config import settings

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for handling push notifications and in-app notifications"""
    
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.firebase_app = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        if not FIREBASE_AVAILABLE:
            logger.warning("Firebase Admin SDK not available")
            return
            
        try:
            # Check if Firebase app is already initialized
            if not firebase_admin._apps:
                # In production, use service account key file
                # For development, you can use the default credentials
                if hasattr(settings, 'FIREBASE_CREDENTIALS_PATH') and settings.FIREBASE_CREDENTIALS_PATH:
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                    self.firebase_app = firebase_admin.initialize_app(cred)
                else:
                    # Use default credentials (for development)
                    self.firebase_app = firebase_admin.initialize_app()
                    
                logger.info("Firebase Admin SDK initialized successfully")
            else:
                self.firebase_app = firebase_admin.get_app()
                
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            self.firebase_app = None
    
    def create_notification(
        self, 
        user_id: int, 
        title: str, 
        message: str, 
        notification_type: NotificationType,
        data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """Create an in-app notification"""
        
        if not self.db:
            raise ValueError("Database session required for creating notifications")
        
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            data=data or {}
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        return notification
    
    async def send_push_notification(
        self,
        user_id: int,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        notification_type: NotificationType = NotificationType.MESSAGE
    ) -> bool:
        """Send push notification to user's device via Firebase Cloud Messaging"""
        
        try:
            # Create in-app notification
            if self.db:
                self.create_notification(
                    user_id=user_id,
                    title=title,
                    message=body,
                    notification_type=notification_type,
                    data=data
                )
            
            # Send FCM push notification
            if self.firebase_app and FIREBASE_AVAILABLE:
                return await self._send_fcm_notification(user_id, title, body, data)
            else:
                logger.warning(f"Firebase not available. Notification logged only: {title} - {body}")
                return True
            
        except Exception as e:
            logger.error(f"Failed to send push notification to user {user_id}: {str(e)}")
            return False
    
    async def _send_fcm_notification(
        self,
        user_id: int,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send notification via Firebase Cloud Messaging"""
        
        try:
            # Get user's FCM tokens from database
            fcm_tokens = await self._get_user_fcm_tokens(user_id)
            
            if not fcm_tokens:
                logger.warning(f"No FCM tokens found for user {user_id}")
                return False
            
            # Prepare notification data
            notification_data = {
                "user_id": str(user_id),
                "timestamp": datetime.utcnow().isoformat(),
                **(data or {})
            }
            
            # Convert all data values to strings (FCM requirement)
            string_data = {k: str(v) for k, v in notification_data.items()}
            
            # Create FCM message
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=string_data,
                tokens=fcm_tokens,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        channel_id=self._get_notification_channel(data.get('type', 'default')),
                        sound='default',
                        priority='high'
                    )
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            alert=messaging.ApsAlert(
                                title=title,
                                body=body
                            ),
                            sound='default',
                            badge=await self._get_user_badge_count(user_id)
                        )
                    )
                )
            )
            
            # Send the message
            response = messaging.send_multicast(message)
            
            # Handle response and cleanup invalid tokens
            await self._handle_fcm_response(user_id, fcm_tokens, response)
            
            logger.info(f"FCM notification sent to user {user_id}. Success: {response.success_count}, Failure: {response.failure_count}")
            return response.success_count > 0
            
        except Exception as e:
            logger.error(f"Failed to send FCM notification: {e}")
            return False
    
    async def _get_user_fcm_tokens(self, user_id: int) -> List[str]:
        """Get all FCM tokens for a user"""
        if not self.db:
            return []
            
        # This would query a UserDeviceToken table
        # For now, return empty list - you'll need to implement token storage
        # tokens = self.db.query(UserDeviceToken).filter(
        #     UserDeviceToken.user_id == user_id,
        #     UserDeviceToken.is_active == True
        # ).all()
        # return [token.fcm_token for token in tokens]
        return []
    
    async def _handle_fcm_response(self, user_id: int, tokens: List[str], response) -> None:
        """Handle FCM response and cleanup invalid tokens"""
        if not response.responses:
            return
            
        for i, resp in enumerate(response.responses):
            if not resp.success:
                error_code = resp.exception.code if resp.exception else 'unknown'
                
                # Remove invalid tokens
                if error_code in ['INVALID_REGISTRATION_TOKEN', 'UNREGISTERED']:
                    await self._remove_fcm_token(user_id, tokens[i])
                    logger.info(f"Removed invalid FCM token for user {user_id}")
    
    async def _remove_fcm_token(self, user_id: int, token: str) -> None:
        """Remove invalid FCM token from database"""
        # Implementation would remove token from UserDeviceToken table
        pass
    
    def _get_notification_channel(self, notification_type: str) -> str:
        """Get Android notification channel based on type"""
        channel_map = {
            'message': 'messages',
            'job_update': 'job_updates',
            'booking_update': 'bookings',
            'payment': 'payments',
            'review': 'reviews'
        }
        return channel_map.get(notification_type, 'default')
    
    async def _get_user_badge_count(self, user_id: int) -> int:
        """Get unread notification count for iOS badge"""
        if not self.db:
            return 0
            
        return (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
            .count()
        )
    
    def send_message_notification(
        self,
        receiver_id: int,
        sender_name: str,
        message_content: str,
        job_id: Optional[int] = None
    ) -> bool:
        """Send notification for new message"""
        
        data = {
            "type": "new_message",
            "job_id": job_id
        }
        
        # Truncate message content for notification
        truncated_content = message_content[:100] + "..." if len(message_content) > 100 else message_content
        
        return self.send_push_notification(
            user_id=receiver_id,
            title=f"New message from {sender_name}",
            body=truncated_content,
            data=data
        )
    
    def send_typing_notification(
        self,
        receiver_id: int,
        sender_name: str,
        is_typing: bool
    ) -> bool:
        """Send typing indicator notification (for real-time updates)"""
        
        # This would typically be sent via WebSocket rather than push notification
        # Implementation depends on WebSocket manager
        
        logger.info(f"Typing indicator: {sender_name} {'is typing' if is_typing else 'stopped typing'} to user {receiver_id}")
        return True
    
    def mark_notifications_as_read(self, user_id: int, notification_ids: list) -> int:
        """Mark multiple notifications as read"""
        
        if not self.db:
            raise ValueError("Database session required")
        
        updated_count = (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.id.in_(notification_ids),
                Notification.is_read == False
            )
            .update({Notification.is_read: True}, synchronize_session=False)
        )
        
        self.db.commit()
        return updated_count
    
    def get_unread_notifications(self, user_id: int, limit: int = 50) -> list:
        """Get unread notifications for user"""
        
        if not self.db:
            raise ValueError("Database session required")
        
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )
    
    def get_notification_history(self, user_id: int, limit: int = 100, offset: int = 0) -> list:
        """Get notification history for user"""
        
        if not self.db:
            raise ValueError("Database session required")
        
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    async def register_fcm_token(self, user_id: int, token: str, platform: str) -> bool:
        """Register FCM token for user"""
        try:
            # This would store the token in UserDeviceToken table
            # For now, just log it
            logger.info(f"FCM token registered for user {user_id} on {platform}: {token[:20]}...")
            
            # In production, you would:
            # 1. Check if token already exists
            # 2. Update or create new token record
            # 3. Mark old tokens as inactive if needed
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to register FCM token for user {user_id}: {e}")
            return False
    
    async def unregister_fcm_token(self, user_id: int, token: str) -> bool:
        """Unregister FCM token for user"""
        try:
            # This would remove or deactivate the token in UserDeviceToken table
            logger.info(f"FCM token unregistered for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unregister FCM token for user {user_id}: {e}")
            return False
    
    async def send_job_update_notification(
        self,
        user_id: int,
        job_title: str,
        status: str,
        job_id: int
    ) -> bool:
        """Send job status update notification"""
        
        title = "Job Update"
        body = f"Your job '{job_title}' status changed to {status}"
        
        data = {
            "type": "job_update",
            "job_id": job_id,
            "status": status,
            "navigation": "JobDetail",
            "params": {"jobId": job_id}
        }
        
        return await self.send_push_notification(
            user_id=user_id,
            title=title,
            body=body,
            data=data,
            notification_type=NotificationType.JOB_UPDATE
        )
    
    async def send_booking_update_notification(
        self,
        user_id: int,
        job_title: str,
        status: str,
        booking_id: int
    ) -> bool:
        """Send booking status update notification"""
        
        title = "Booking Update"
        body = f"Booking for '{job_title}' is now {status}"
        
        data = {
            "type": "booking_update",
            "booking_id": booking_id,
            "status": status,
            "navigation": "JobTracking",
            "params": {"bookingId": booking_id}
        }
        
        return await self.send_push_notification(
            user_id=user_id,
            title=title,
            body=body,
            data=data,
            notification_type=NotificationType.BOOKING_UPDATE
        )
    
    async def send_payment_notification(
        self,
        user_id: int,
        amount: float,
        status: str,
        job_title: str
    ) -> bool:
        """Send payment notification"""
        
        title = "Payment Update"
        body = f"Payment of ${amount:.2f} for '{job_title}' is {status}"
        
        data = {
            "type": "payment",
            "amount": amount,
            "status": status,
            "navigation": "PaymentHistory"
        }
        
        return await self.send_push_notification(
            user_id=user_id,
            title=title,
            body=body,
            data=data,
            notification_type=NotificationType.PAYMENT
        )
    
    async def send_review_notification(
        self,
        user_id: int,
        reviewer_name: str,
        rating: int,
        job_title: str,
        review_id: int
    ) -> bool:
        """Send new review notification"""
        
        title = "New Review"
        body = f"{reviewer_name} left you a {rating}-star review for '{job_title}'"
        
        data = {
            "type": "review",
            "review_id": review_id,
            "rating": rating,
            "navigation": "ReviewDetail",
            "params": {"reviewId": review_id}
        }
        
        return await self.send_push_notification(
            user_id=user_id,
            title=title,
            body=body,
            data=data,
            notification_type=NotificationType.REVIEW
        )
    
    async def schedule_notification(
        self,
        user_id: int,
        title: str,
        body: str,
        scheduled_for: datetime,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Schedule a notification for future delivery"""
        
        try:
            # Create scheduled notification in database
            if self.db:
                notification = Notification(
                    user_id=user_id,
                    title=title,
                    message=body,
                    type=NotificationType.SYSTEM,
                    data=data or {},
                    scheduled_for=scheduled_for
                )
                
                self.db.add(notification)
                self.db.commit()
                
                logger.info(f"Notification scheduled for user {user_id} at {scheduled_for}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to schedule notification: {e}")
            return False
    
    async def process_scheduled_notifications(self) -> int:
        """Process and send scheduled notifications that are due"""
        
        if not self.db:
            return 0
        
        try:
            # Get notifications that are due
            now = datetime.utcnow()
            due_notifications = (
                self.db.query(Notification)
                .filter(
                    Notification.scheduled_for <= now,
                    Notification.scheduled_for.isnot(None),
                    Notification.sent_at.is_(None)
                )
                .all()
            )
            
            sent_count = 0
            
            for notification in due_notifications:
                success = await self.send_push_notification(
                    user_id=notification.user_id,
                    title=notification.title,
                    body=notification.message,
                    data=notification.data,
                    notification_type=notification.type
                )
                
                if success:
                    notification.sent_at = now
                    sent_count += 1
            
            self.db.commit()
            
            if sent_count > 0:
                logger.info(f"Processed {sent_count} scheduled notifications")
            
            return sent_count
            
        except Exception as e:
            logger.error(f"Failed to process scheduled notifications: {e}")
            return 0