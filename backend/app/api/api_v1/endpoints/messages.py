from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging

from app.core.deps import get_db, get_current_user
from app.db.models import User
from app.services.firebase_integration import firebase_integration

router = APIRouter()
logger = logging.getLogger(__name__)

def get_firebase_user(authorization: str = Header(None)) -> Dict[str, Any]:
    """Get Firebase user from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    decoded_token = firebase_integration.verify_firebase_token(token)
    
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
    
    return decoded_token

@router.get("/conversations")
async def get_conversations(
    firebase_user: Dict[str, Any] = Depends(get_firebase_user),
    db: Session = Depends(get_db)
):
    """Get user's conversations from Firebase"""
    
    try:
        user_id = int(firebase_user["uid"])
        conversations = firebase_integration.get_user_conversations(user_id)
        return {"conversations": conversations}
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get conversations")

@router.get("/messages/{other_user_id}")
async def get_messages(
    other_user_id: int,
    limit: int = 50,
    firebase_user: Dict[str, Any] = Depends(get_firebase_user),
    db: Session = Depends(get_db)
):
    """Get messages for a conversation from Firebase"""
    
    try:
        user_id = int(firebase_user["uid"])
        messages = firebase_integration.get_firebase_messages(user_id, other_user_id, limit)
        return {"messages": messages}
        
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get messages")

@router.post("/sync-user")
async def sync_user_to_firebase(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync current user data to Firebase"""
    
    try:
        success = firebase_integration.sync_user_to_firebase(current_user)
        
        if success:
            return {"message": "User synced to Firebase successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to sync user to Firebase")
            
    except Exception as e:
        logger.error(f"Error syncing user to Firebase: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync user to Firebase")

@router.post("/migrate-to-firebase")
async def migrate_messages_to_firebase(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Migrate existing SQL messages to Firebase (Admin only)"""
    
    # Check if user is admin (you may want to implement proper admin check)
    if not current_user.is_verified:  # Replace with proper admin check
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        success = firebase_integration.migrate_sql_messages_to_firebase(db)
        
        if success:
            return {"message": "Messages migrated to Firebase successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to migrate messages to Firebase")
            
    except Exception as e:
        logger.error(f"Error migrating messages to Firebase: {e}")
        raise HTTPException(status_code=500, detail="Failed to migrate messages to Firebase")

@router.get("/firebase-config")
async def get_firebase_config():
    """Get Firebase configuration for client apps"""
    
    return {
        "projectId": "handwork-marketplace",  # Replace with actual project ID
        "messagingSenderId": "123456789",  # Replace with actual sender ID
        "appId": "1:123456789:web:abcdef",  # Replace with actual app ID
        "apiKey": "AIzaSyExample",  # Replace with actual API key
        "authDomain": "handwork-marketplace.firebaseapp.com",  # Replace with actual domain
        "storageBucket": "handwork-marketplace.appspot.com",  # Replace with actual bucket
        "databaseURL": "https://handwork-marketplace-default-rtdb.firebaseio.com",  # Replace with actual URL
    }

@router.post("/create-firebase-user")
async def create_firebase_user(
    password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Firebase Auth user for existing user"""
    
    try:
        firebase_uid = firebase_integration.create_firebase_user(current_user, password)
        
        if firebase_uid:
            # Also sync user data to Firestore
            firebase_integration.sync_user_to_firebase(current_user)
            return {"message": "Firebase user created successfully", "firebase_uid": firebase_uid}
        else:
            raise HTTPException(status_code=500, detail="Failed to create Firebase user")
            
    except Exception as e:
        logger.error(f"Error creating Firebase user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create Firebase user")

@router.put("/update-firebase-user")
async def update_firebase_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update Firebase Auth user data"""
    
    try:
        success = firebase_integration.update_firebase_user(current_user)
        
        if success:
            # Also sync user data to Firestore
            firebase_integration.sync_user_to_firebase(current_user)
            return {"message": "Firebase user updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update Firebase user")
            
    except Exception as e:
        logger.error(f"Error updating Firebase user: {e}")
        raise HTTPException(status_code=500, detail="Failed to update Firebase user")