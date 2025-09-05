from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
import json
import logging
from typing import Optional

from app.core.deps import get_db
from app.services.websocket_manager import connection_manager, websocket_handler
from app.core.security import decode_access_token

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int = Query(...),
    token: str = Query(...)
):
    """WebSocket endpoint for real-time messaging and notifications"""
    
    try:
        # Verify token and user
        payload = decode_access_token(token)
        if not payload or payload.get("sub") != str(user_id):
            await websocket.close(code=4001, reason="Invalid authentication")
            return
        
        # Accept connection
        await connection_manager.connect(websocket, user_id)
        logger.info(f"WebSocket connected for user {user_id}")
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                
                try:
                    message_data = json.loads(data)
                    await websocket_handler.handle_message(websocket, user_id, message_data)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received from user {user_id}: {data}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "data": {"message": "Invalid JSON format"}
                    }))
                except Exception as e:
                    logger.error(f"Error handling message from user {user_id}: {e}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "data": {"message": "Error processing message"}
                    }))
                    
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user {user_id}")
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}")
        finally:
            connection_manager.disconnect(websocket, user_id)
            
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close(code=4000, reason="Connection error")

@router.get("/online-users")
async def get_online_users():
    """Get list of currently online users"""
    online_users = connection_manager.get_online_users()
    return {"online_users": online_users, "count": len(online_users)}

@router.post("/broadcast")
async def broadcast_message(
    message: dict,
    # Add admin authentication here
):
    """Broadcast message to all connected users (admin only)"""
    await connection_manager.broadcast_to_all(message)
    return {"message": "Broadcast sent successfully"}