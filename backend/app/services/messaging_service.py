from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func, String, case
from typing import List, Optional, Dict, Any
from datetime import datetime
import re
import json

from app.db.models import Message, User, Job
from app.schemas.messages import MessageCreate, MessageFilter, ConversationResponse, MessageResponse
from app.services.file_storage import FileStorageService
from app.services.notification_service import NotificationService

class ContentModerationService:
    """Service for content moderation and filtering"""
    
    # Basic profanity filter - in production, use a more sophisticated service
    PROFANITY_WORDS = [
        "spam", "scam", "fraud", "fake", "illegal", "drugs", "violence"
    ]
    
    SUSPICIOUS_PATTERNS = [
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Phone numbers
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email addresses
        r'https?://[^\s]+',  # URLs
        r'\$\d+',  # Money amounts
    ]
    
    @classmethod
    def moderate_content(cls, content: str) -> Dict[str, Any]:
        """
        Moderate message content and return moderation results
        """
        result = {
            "is_approved": True,
            "flags": [],
            "filtered_content": content
        }
        
        # Check for profanity
        content_lower = content.lower()
        for word in cls.PROFANITY_WORDS:
            if word in content_lower:
                result["flags"].append(f"profanity: {word}")
                result["is_approved"] = False
        
        # Check for suspicious patterns
        for pattern in cls.SUSPICIOUS_PATTERNS:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                result["flags"].append(f"suspicious_pattern: {pattern}")
                # Don't auto-reject, just flag for review
        
        # Filter content if needed
        if not result["is_approved"]:
            result["filtered_content"] = "[Message flagged for review]"
        
        return result

class MessagingService:
    def __init__(self, db: Session):
        self.db = db
        self.file_storage = FileStorageService()
        self.notification_service = NotificationService()
    
    def create_message(self, message_data: MessageCreate, sender_id: int) -> Message:
        """Create a new message with content moderation"""
        
        # Moderate content
        moderation_result = ContentModerationService.moderate_content(message_data.content)
        
        # Create message
        db_message = Message(
            sender_id=sender_id,
            receiver_id=message_data.receiver_id,
            job_id=message_data.job_id,
            content=moderation_result["filtered_content"],
            attachments=message_data.attachments or []
        )
        
        self.db.add(db_message)
        self.db.commit()
        self.db.refresh(db_message)
        
        # Send push notification if content is approved
        if moderation_result["is_approved"]:
            self._send_message_notification(db_message)
        
        return db_message
    
    def get_conversations(self, user_id: int) -> List[ConversationResponse]:
        """Get all conversations for a user with last message and unread count"""
        
        # Get all unique conversation participants
        participants_query = (
            self.db.query(User.id, User.first_name, User.last_name, User.email, User.role)
            .filter(
                or_(
                    User.id.in_(
                        self.db.query(Message.sender_id)
                        .filter(Message.receiver_id == user_id)
                    ),
                    User.id.in_(
                        self.db.query(Message.receiver_id)
                        .filter(Message.sender_id == user_id)
                    )
                )
            )
            .distinct()
        )
        
        conversations = []
        for participant in participants_query:
            # Get the latest message between user and participant
            latest_message = (
                self.db.query(Message)
                .filter(
                    or_(
                        and_(Message.sender_id == user_id, Message.receiver_id == participant.id),
                        and_(Message.sender_id == participant.id, Message.receiver_id == user_id)
                    )
                )
                .order_by(desc(Message.created_at))
                .first()
            )
            
            if latest_message:
                # Count unread messages from this participant
                unread_count = (
                    self.db.query(Message)
                    .filter(
                        Message.sender_id == participant.id,
                        Message.receiver_id == user_id,
                        Message.is_read == False
                    )
                    .count()
                )
                
                # Get job info if message is related to a job
                job = None
                if latest_message.job_id:
                    job = self.db.query(Job).filter(Job.id == latest_message.job_id).first()
                
                conversation = ConversationResponse(
                    participant_id=participant.id,
                    participant_name=f"{participant.first_name} {participant.last_name}",
                    participant_avatar=None,  # TODO: Add avatar support
                    job_id=job.id if job else None,
                    job_title=job.title if job else None,
                    last_message=MessageResponse.from_orm(latest_message),
                    unread_count=unread_count
                )
                conversations.append(conversation)
        
        # Sort conversations by latest message timestamp
        conversations.sort(key=lambda x: x.last_message.created_at, reverse=True)
        
        return conversations
    
    def get_messages(self, user_id: int, filters: MessageFilter) -> List[Message]:
        """Get messages for a user with filtering"""
        
        query = self.db.query(Message).filter(
            or_(Message.sender_id == user_id, Message.receiver_id == user_id)
        )
        
        if filters.job_id:
            query = query.filter(Message.job_id == filters.job_id)
        
        if filters.participant_id:
            query = query.filter(
                or_(
                    and_(Message.sender_id == user_id, Message.receiver_id == filters.participant_id),
                    and_(Message.sender_id == filters.participant_id, Message.receiver_id == user_id)
                )
            )
        
        if filters.is_read is not None:
            query = query.filter(Message.is_read == filters.is_read)
        
        return (
            query
            .order_by(desc(Message.created_at))
            .offset(filters.offset)
            .limit(filters.limit)
            .all()
        )
    
    def mark_message_as_read(self, message_id: int, user_id: int) -> bool:
        """Mark a message as read if the user is the receiver"""
        
        message = (
            self.db.query(Message)
            .filter(Message.id == message_id, Message.receiver_id == user_id)
            .first()
        )
        
        if message and not message.is_read:
            message.is_read = True
            self.db.commit()
            return True
        
        return False
    
    def mark_messages_as_read(self, message_ids: List[int], user_id: int) -> int:
        """Mark multiple messages as read and return count of updated messages"""
        
        updated_count = (
            self.db.query(Message)
            .filter(
                Message.id.in_(message_ids),
                Message.receiver_id == user_id,
                Message.is_read == False
            )
            .update({Message.is_read: True}, synchronize_session=False)
        )
        
        self.db.commit()
        return updated_count
    
    def upload_message_attachment(self, file, user_id: int) -> str:
        """Upload a file attachment for messages"""
        
        # Validate file type and size
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
        max_size = 10 * 1024 * 1024  # 10MB
        
        if file.content_type not in allowed_types:
            raise ValueError("File type not allowed")
        
        if file.size > max_size:
            raise ValueError("File size too large")
        
        # Upload file
        file_path = self.file_storage.save_message_attachment(file, user_id)
        return file_path
    
    def delete_message(self, message_id: int, user_id: int) -> bool:
        """Delete a message if the user is the sender"""
        
        message = (
            self.db.query(Message)
            .filter(Message.id == message_id, Message.sender_id == user_id)
            .first()
        )
        
        if message:
            self.db.delete(message)
            self.db.commit()
            return True
        
        return False
    
    def _send_message_notification(self, message: Message):
        """Send push notification for new message"""
        
        receiver = self.db.query(User).filter(User.id == message.receiver_id).first()
        sender = self.db.query(User).filter(User.id == message.sender_id).first()
        
        if receiver and sender:
            notification_data = {
                "message_id": message.id,
                "sender_id": message.sender_id,
                "sender_name": f"{sender.first_name} {sender.last_name}",
                "job_id": message.job_id
            }
            
            self.notification_service.send_push_notification(
                user_id=receiver.id,
                title=f"New message from {sender.first_name}",
                body=message.content[:100] + "..." if len(message.content) > 100 else message.content,
                data=notification_data
            )
    
    def get_conversation_participants(self, user_id: int, job_id: Optional[int] = None) -> List[User]:
        """Get users that the current user can message (based on job applications/bookings)"""
        
        # If job_id is provided, get participants for that specific job
        if job_id:
            # Get job details
            job = self.db.query(Job).filter(Job.id == job_id).first()
            if not job:
                return []
            
            participants = []
            
            # If user is the client, get all workers who applied or are booked
            if job.client.user_id == user_id:
                # Get workers from applications
                from app.db.models import JobApplication, WorkerProfile
                workers = (
                    self.db.query(User)
                    .join(WorkerProfile, User.id == WorkerProfile.user_id)
                    .join(JobApplication, WorkerProfile.id == JobApplication.worker_id)
                    .filter(JobApplication.job_id == job_id)
                    .all()
                )
                participants.extend(workers)
                
                # Get workers from bookings
                from app.db.models import Booking
                booked_workers = (
                    self.db.query(User)
                    .join(WorkerProfile, User.id == WorkerProfile.user_id)
                    .join(Booking, WorkerProfile.id == Booking.worker_id)
                    .filter(Booking.job_id == job_id)
                    .all()
                )
                participants.extend(booked_workers)
            
            # If user is a worker, get the client
            else:
                participants.append(job.client.user)
            
            return list(set(participants))  # Remove duplicates
        
        # Get all users the current user has messaged with
        else:
            participants = (
                self.db.query(User)
                .filter(
                    or_(
                        User.id.in_(
                            self.db.query(Message.sender_id)
                            .filter(Message.receiver_id == user_id)
                        ),
                        User.id.in_(
                            self.db.query(Message.receiver_id)
                            .filter(Message.sender_id == user_id)
                        )
                    )
                )
                .all()
            )
            
            return participants
    
    def get_unread_message_count(self, user_id: int) -> int:
        """Get total count of unread messages for a user"""
        
        count = (
            self.db.query(Message)
            .filter(
                Message.receiver_id == user_id,
                Message.is_read == False
            )
            .count()
        )
        
        return count