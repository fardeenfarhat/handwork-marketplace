from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging

from app.core.deps import get_db, get_current_user
from app.db.models import User
from app.services.firebase_integration_simple import firebase_integration

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's conversations from Firebase (mock for development)"""
    
    try:
        conversations = firebase_integration.get_user_conversations(current_user.id)
        return {"conversations": conversations}
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get conversations")

@router.get("/messages/{other_user_id}")
async def get_messages(
    other_user_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for a conversation from Firebase (mock for development)"""
    
    try:
        messages = firebase_integration.get_firebase_messages(current_user.id, other_user_id, limit)
        return {"messages": messages}
        
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get messages")

@router.post("/sync-user")
async def sync_user_to_firebase(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync current user data to Firebase (mock for development)"""
    
    try:
        success = firebase_integration.sync_user_to_firebase(current_user)
        
        if success:
            return {"message": "User synced to Firebase successfully (mock)"}
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
    """Migrate existing SQL messages to Firebase (mock for development)"""
    
    # Check if user is admin (you may want to implement proper admin check)
    if not current_user.is_verified:  # Replace with proper admin check
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        success = firebase_integration.migrate_sql_messages_to_firebase(db)
        
        if success:
            return {"message": "Messages migrated to Firebase successfully (mock)"}
        else:
            raise HTTPException(status_code=500, detail="Failed to migrate messages to Firebase")
            
    except Exception as e:
        logger.error(f"Error migrating messages to Firebase: {e}")
        raise HTTPException(status_code=500, detail="Failed to migrate messages to Firebase")

@router.get("/firebase-config")
async def get_firebase_config():
    """Get Firebase configuration for client apps"""
    
    return {
        "projectId": "demo-project",
        "messagingSenderId": "123456789",
        "appId": "demo-app",
        "apiKey": "demo-api-key",
        "authDomain": "demo-project.firebaseapp.com",
        "storageBucket": "demo-project.appspot.com",
        "databaseURL": "https://demo-project-default-rtdb.firebaseio.com",
        "emulator": True,
        "emulatorConfig": {
            "auth": {"host": "127.0.0.1", "port": 9099},
            "firestore": {"host": "127.0.0.1", "port": 8080},
            "storage": {"host": "127.0.0.1", "port": 9199}
        }
    }

@router.post("/create-firebase-user")
async def create_firebase_user(
    password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Firebase Auth user for existing user (mock for development)"""
    
    try:
        firebase_uid = firebase_integration.create_firebase_user(current_user, password)
        
        if firebase_uid:
            # Also sync user data to Firestore
            firebase_integration.sync_user_to_firebase(current_user)
            return {"message": "Firebase user created successfully (mock)", "firebase_uid": firebase_uid}
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
    """Update Firebase Auth user data (mock for development)"""
    
    try:
        success = firebase_integration.update_firebase_user(current_user)
        
        if success:
            # Also sync user data to Firestore
            firebase_integration.sync_user_to_firebase(current_user)
            return {"message": "Firebase user updated successfully (mock)"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update Firebase user")
            
    except Exception as e:
        logger.error(f"Error updating Firebase user: {e}")
        raise HTTPException(status_code=500, detail="Failed to update Firebase user")

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify the messaging API is working"""
    
    return {
        "message": "Firebase messaging API is working!",
        "status": "success",
        "emulator_mode": True,
        "endpoints": [
            "GET /conversations - Get user conversations",
            "GET /messages/{user_id} - Get messages with user",
            "POST /sync-user - Sync user to Firebase",
            "GET /firebase-config - Get Firebase config",
            "GET /test - This test endpoint"
        ]
    }