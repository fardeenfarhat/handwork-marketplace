from typing import Dict, List, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time messaging"""
    
    def __init__(self):
        # Store active connections: user_id -> set of websockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Store typing indicators: conversation_id -> set of user_ids
        self.typing_users: Dict[str, Set[int]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            
            # Remove user from active connections if no more connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
                # Remove user from all typing indicators
                for conversation_id in list(self.typing_users.keys()):
                    self.typing_users[conversation_id].discard(user_id)
                    if not self.typing_users[conversation_id]:
                        del self.typing_users[conversation_id]
        
        logger.info(f"User {user_id} disconnected")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user (all their connections)"""
        if user_id in self.active_connections:
            disconnected_connections = set()
            
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected_connections.add(connection)
            
            # Remove disconnected connections
            for connection in disconnected_connections:
                self.active_connections[user_id].discard(connection)
    
    async def send_message_to_conversation(self, message: dict, sender_id: int, receiver_id: int):
        """Send a message to both participants in a conversation"""
        # Send to receiver
        await self.send_personal_message(message, receiver_id)
        
        # Send confirmation to sender (different message type)
        sender_message = {
            **message,
            "type": "message_sent"
        }
        await self.send_personal_message(sender_message, sender_id)
    
    async def handle_typing_indicator(self, user_id: int, conversation_id: str, is_typing: bool, receiver_id: int):
        """Handle typing indicators"""
        if is_typing:
            if conversation_id not in self.typing_users:
                self.typing_users[conversation_id] = set()
            self.typing_users[conversation_id].add(user_id)
        else:
            if conversation_id in self.typing_users:
                self.typing_users[conversation_id].discard(user_id)
                if not self.typing_users[conversation_id]:
                    del self.typing_users[conversation_id]
        
        # Send typing indicator to receiver
        typing_message = {
            "type": "typing_indicator",
            "data": {
                "user_id": user_id,
                "conversation_id": conversation_id,
                "is_typing": is_typing,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        await self.send_personal_message(typing_message, receiver_id)
    
    async def handle_read_receipt(self, user_id: int, message_id: int, sender_id: int):
        """Handle read receipts"""
        read_receipt_message = {
            "type": "read_receipt",
            "data": {
                "message_id": message_id,
                "read_by": user_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        await self.send_personal_message(read_receipt_message, sender_id)
    
    def get_online_users(self) -> List[int]:
        """Get list of currently online users"""
        return list(self.active_connections.keys())
    
    def is_user_online(self, user_id: int) -> bool:
        """Check if a user is currently online"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0
    
    async def broadcast_to_all(self, message: dict):
        """Broadcast a message to all connected users"""
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)

# Global connection manager instance
connection_manager = ConnectionManager()

class WebSocketHandler:
    """Handles WebSocket message processing"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
    
    async def handle_message(self, websocket: WebSocket, user_id: int, message_data: dict):
        """Process incoming WebSocket messages"""
        message_type = message_data.get("type")
        data = message_data.get("data", {})
        
        try:
            if message_type == "typing":
                await self._handle_typing(user_id, data)
            elif message_type == "read_receipt":
                await self._handle_read_receipt(user_id, data)
            elif message_type == "ping":
                await self._handle_ping(websocket, user_id)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "data": {"message": "Error processing message"}
            }))
    
    async def _handle_typing(self, user_id: int, data: dict):
        """Handle typing indicator"""
        conversation_id = data.get("conversation_id")
        is_typing = data.get("is_typing", False)
        receiver_id = data.get("receiver_id")
        
        if conversation_id and receiver_id:
            await self.connection_manager.handle_typing_indicator(
                user_id, conversation_id, is_typing, receiver_id
            )
    
    async def _handle_read_receipt(self, user_id: int, data: dict):
        """Handle read receipt"""
        message_id = data.get("message_id")
        sender_id = data.get("sender_id")
        
        if message_id and sender_id:
            await self.connection_manager.handle_read_receipt(
                user_id, message_id, sender_id
            )
    
    async def _handle_ping(self, websocket: WebSocket, user_id: int):
        """Handle ping/pong for connection health"""
        await websocket.send_text(json.dumps({
            "type": "pong",
            "data": {"timestamp": datetime.utcnow().isoformat()}
        }))

# Global WebSocket handler
websocket_handler = WebSocketHandler(connection_manager)