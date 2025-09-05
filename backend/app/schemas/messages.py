from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"

class MessageCreate(BaseModel):
    receiver_id: int
    job_id: Optional[int] = None
    content: str = Field(..., min_length=1, max_length=5000)
    message_type: MessageType = MessageType.TEXT
    attachments: Optional[List[str]] = None

class MessageUpdate(BaseModel):
    is_read: bool

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    job_id: Optional[int]
    content: str
    attachments: Optional[List[str]]
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    participant_id: int
    participant_name: str
    participant_avatar: Optional[str]
    job_id: Optional[int]
    job_title: Optional[str]
    last_message: Optional[MessageResponse]
    unread_count: int

class TypingIndicator(BaseModel):
    user_id: int
    conversation_id: str
    is_typing: bool

class WebSocketMessage(BaseModel):
    type: str  # "message", "typing", "read_receipt"
    data: Dict[str, Any]

class MessageFilter(BaseModel):
    job_id: Optional[int] = None
    participant_id: Optional[int] = None
    is_read: Optional[bool] = None
    limit: int = Field(default=50, le=100)
    offset: int = Field(default=0, ge=0)

class BulkReadUpdate(BaseModel):
    message_ids: List[int]