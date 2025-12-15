"""
Simple Firebase Integration Service for Development/Testing
This version works with Firebase emulators without requiring credentials
"""

import os
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class SimpleFirebaseIntegrationService:
    """Simplified Firebase integration for development/testing"""
    
    def __init__(self):
        self.emulator_mode = True
        logger.info("Firebase Integration Service initialized in emulator mode")
    
    def sync_user_to_firebase(self, user) -> bool:
        """Mock sync user data to Firebase"""
        try:
            logger.info(f"Mock: Syncing user {user.id} to Firebase")
            return True
        except Exception as e:
            logger.error(f"Error syncing user {user.id} to Firebase: {e}")
            return False
    
    def sync_job_to_firebase(self, job) -> bool:
        """Mock sync job data to Firebase"""
        try:
            logger.info(f"Mock: Syncing job {job.id} to Firebase")
            return True
        except Exception as e:
            logger.error(f"Error syncing job {job.id} to Firebase: {e}")
            return False
    
    def create_firebase_user(self, user, password: Optional[str] = None) -> Optional[str]:
        """Mock create Firebase Auth user"""
        try:
            logger.info(f"Mock: Creating Firebase Auth user for user {user.id}")
            return str(user.id)
        except Exception as e:
            logger.error(f"Error creating Firebase Auth user for {user.id}: {e}")
            return None
    
    def update_firebase_user(self, user) -> bool:
        """Mock update Firebase Auth user"""
        try:
            logger.info(f"Mock: Updating Firebase Auth user for user {user.id}")
            return True
        except Exception as e:
            logger.error(f"Error updating Firebase Auth user for {user.id}: {e}")
            return False
    
    def get_firebase_messages(self, user_id: int, other_user_id: int, limit: int = 50) -> List[Dict]:
        """Mock get messages from Firebase"""
        try:
            logger.info(f"Mock: Getting Firebase messages between {user_id} and {other_user_id}")
            # Return mock data
            return [
                {
                    "id": "mock_message_1",
                    "senderId": str(user_id),
                    "receiverId": str(other_user_id),
                    "content": "Hello! This is a mock message from Firebase.",
                    "timestamp": "2024-01-01T12:00:00Z",
                    "type": "text",
                    "isRead": False
                }
            ]
        except Exception as e:
            logger.error(f"Error getting Firebase messages: {e}")
            return []
    
    def get_user_conversations(self, user_id: int) -> List[Dict]:
        """Mock get user's conversations from Firebase"""
        try:
            logger.info(f"Mock: Getting conversations for user {user_id}")
            # Return mock data
            return [
                {
                    "id": f"conversation_{user_id}_123",
                    "participants": [str(user_id), "123"],
                    "lastMessage": {
                        "content": "Mock conversation message",
                        "senderId": "123",
                        "timestamp": "2024-01-01T12:00:00Z",
                        "type": "text"
                    },
                    "updatedAt": "2024-01-01T12:00:00Z",
                    "unreadCount": {str(user_id): 1}
                }
            ]
        except Exception as e:
            logger.error(f"Error getting user conversations: {e}")
            return []
    
    def migrate_sql_messages_to_firebase(self, db) -> bool:
        """Mock migrate existing SQL messages to Firebase"""
        try:
            logger.info("Mock: Migrating SQL messages to Firebase")
            return True
        except Exception as e:
            logger.error(f"Error migrating messages to Firebase: {e}")
            return False
    
    def verify_firebase_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Mock verify Firebase ID token"""
        try:
            logger.info("Mock: Verifying Firebase token")
            # Return mock decoded token
            return {
                "uid": "mock_user_123",
                "email": "mock@example.com",
                "email_verified": True
            }
        except Exception as e:
            logger.error(f"Error verifying Firebase token: {e}")
            return None
    
    def get_user_by_firebase_uid(self, db, firebase_uid: str):
        """Mock get user by Firebase UID"""
        try:
            logger.info(f"Mock: Getting user by Firebase UID {firebase_uid}")
            # This would normally query the database
            return None
        except Exception as e:
            logger.error(f"Error getting user by Firebase UID {firebase_uid}: {e}")
            return None

# Global instance
firebase_integration = SimpleFirebaseIntegrationService()