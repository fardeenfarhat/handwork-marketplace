from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import logging

from app.core.deps import get_db, get_current_user
from app.db.models import User, Message
from app.schemas.messages import (
    MessageCreate, MessageResponse, MessageFilter, ConversationResponse,
    BulkReadUpdate, WebSocketMessage
)
from app.services.messaging_service import MessagingService
from app.services.websocket_manager import connection_manager, websocket_handler
from app.services.file_storage import FileStorageService

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    """WebSocket endpoint for real-time messaging"""
    
    # TODO: Add proper authentication for WebSocket connections
    # For now, we'll trust the user_id parameter
    
    await connection_manager.connect(websocket, user_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Handle the message
            await websocket_handler.handle_message(websocket, user_id, message_data)
            
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        connection_manager.disconnect(websocket, user_id)

@router.post("/", response_model=MessageResponse)
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new message"""
    
    messaging_service = MessagingService(db)
    
    try:
        # Create the message
        message = messaging_service.create_message(message_data, current_user.id)
        
        # Send real-time notification via WebSocket
        websocket_message = {
            "type": "new_message",
            "data": {
                "id": message.id,
                "sender_id": message.sender_id,
                "receiver_id": message.receiver_id,
                "job_id": message.job_id,
                "content": message.content,
                "attachments": message.attachments,
                "created_at": message.created_at.isoformat(),
                "sender_name": f"{current_user.first_name} {current_user.last_name}"
            }
        }
        
        await connection_manager.send_message_to_conversation(
            websocket_message, message.sender_id, message.receiver_id
        )
        
        return MessageResponse.from_orm(message)
        
    except Exception as e:
        logger.error(f"Error creating message: {e}")
        raise HTTPException(status_code=500, detail="Failed to create message")

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for the current user"""
    
    messaging_service = MessagingService(db)
    
    try:
        conversations = messaging_service.get_conversations(current_user.id)
        return conversations
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get conversations")

@router.get("/", response_model=List[MessageResponse])
async def get_messages(
    participant_id: Optional[int] = Query(None, description="ID of the other participant"),
    job_id: Optional[int] = Query(None, description="Filter by job ID"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    limit: int = Query(50, le=100, description="Number of messages to return"),
    offset: int = Query(0, ge=0, description="Number of messages to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for the current user with filtering"""
    
    messaging_service = MessagingService(db)
    
    try:
        filters = MessageFilter(
            participant_id=participant_id,
            job_id=job_id,
            is_read=is_read,
            limit=limit,
            offset=offset
        )
        
        messages = messaging_service.get_messages(current_user.id, filters)
        return [MessageResponse.from_orm(message) for message in messages]
        
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get messages")

@router.put("/{message_id}/read")
async def mark_message_as_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a message as read"""
    
    messaging_service = MessagingService(db)
    
    try:
        success = messaging_service.mark_message_as_read(message_id, current_user.id)
        
        if success:
            # Send read receipt via WebSocket
            message = db.query(Message).filter(Message.id == message_id).first()
            if message:
                await connection_manager.handle_read_receipt(
                    current_user.id, message_id, message.sender_id
                )
            
            return {"message": "Message marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Message not found or already read")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark message as read")

@router.put("/read-bulk")
async def mark_messages_as_read(
    bulk_update: BulkReadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark multiple messages as read"""
    
    messaging_service = MessagingService(db)
    
    try:
        updated_count = messaging_service.mark_messages_as_read(
            bulk_update.message_ids, current_user.id
        )
        
        # Send read receipts via WebSocket for each message
        messages = (
            db.query(Message)
            .filter(Message.id.in_(bulk_update.message_ids))
            .all()
        )
        
        for message in messages:
            await connection_manager.handle_read_receipt(
                current_user.id, message.id, message.sender_id
            )
        
        return {"message": f"{updated_count} messages marked as read"}
        
    except Exception as e:
        logger.error(f"Error marking messages as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark messages as read")

@router.post("/upload-attachment")
async def upload_message_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file attachment for messages"""
    
    file_storage = FileStorageService()
    
    try:
        result = await file_storage.upload_message_attachment(current_user.id, file)
        return result
        
    except Exception as e:
        logger.error(f"Error uploading message attachment: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload attachment")

@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a message (only by sender)"""
    
    messaging_service = MessagingService(db)
    
    try:
        success = messaging_service.delete_message(message_id, current_user.id)
        
        if success:
            # Notify via WebSocket that message was deleted
            delete_message = {
                "type": "message_deleted",
                "data": {
                    "message_id": message_id,
                    "deleted_by": current_user.id
                }
            }
            
            # We need to get the receiver_id from the deleted message
            # Since the message is deleted, we'll need to handle this differently
            # For now, we'll just return success
            
            return {"message": "Message deleted"}
        else:
            raise HTTPException(status_code=404, detail="Message not found or not authorized")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete message")

@router.get("/participants")
async def get_conversation_participants(
    job_id: Optional[int] = Query(None, description="Filter by job ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users that the current user can message"""
    
    messaging_service = MessagingService(db)
    
    try:
        participants = messaging_service.get_conversation_participants(current_user.id, job_id)
        
        return [
            {
                "id": user.id,
                "name": f"{user.first_name} {user.last_name}",
                "email": user.email,
                "role": user.role,
                "is_online": connection_manager.is_user_online(user.id)
            }
            for user in participants
        ]
        
    except Exception as e:
        logger.error(f"Error getting conversation participants: {e}")
        raise HTTPException(status_code=500, detail="Failed to get participants")

@router.get("/online-users")
async def get_online_users(
    current_user: User = Depends(get_current_user)
):
    """Get list of currently online users"""
    
    try:
        online_users = connection_manager.get_online_users()
        return {"online_users": online_users}
        
    except Exception as e:
        logger.error(f"Error getting online users: {e}")
        raise HTTPException(status_code=500, detail="Failed to get online users")