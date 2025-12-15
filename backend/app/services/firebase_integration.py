"""
Firebase Integration Service for Handwork Marketplace
Handles synchronization between FastAPI backend and Firebase
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
from sqlalchemy.orm import Session

from app.db.models import User, Job, Message as SQLMessage
from app.core.config import settings

logger = logging.getLogger(__name__)

class FirebaseIntegrationService:
    """Service to integrate FastAPI backend with Firebase"""
    
    def __init__(self):
        self.db = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase is already initialized
            firebase_admin.get_app()
        except ValueError:
            # Check if we're in development/emulator mode
            use_emulator = os.getenv("USE_FIREBASE_EMULATOR", "true").lower() == "true"
            
            if use_emulator:
                # Initialize with emulator settings
                os.environ["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080"
                os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099"
                
                # Use application default credentials for emulator
                firebase_admin.initialize_app(options={
                    'projectId': 'demo-project'
                })
            else:
                # Production mode - use actual credentials
                if hasattr(settings, 'FIREBASE_CREDENTIALS_PATH') and settings.FIREBASE_CREDENTIALS_PATH:
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                else:
                    # Use environment variable for credentials
                    firebase_config = {
                        "type": "service_account",
                        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                        "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                        "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
                        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                        "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                        "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL")
                    }
                    cred = credentials.Certificate(firebase_config)
                
                firebase_admin.initialize_app(cred)
        
        self.firestore_db = firestore.client()
    
    def sync_user_to_firebase(self, user: User) -> bool:
        """Sync user data to Firebase"""
        try:
            user_data = {
                "id": str(user.id),
                "email": user.email,
                "firstName": user.first_name,
                "lastName": user.last_name,
                "role": user.role.value,
                "isVerified": user.is_verified,
                "isActive": user.is_active,
                "createdAt": user.created_at,
                "updatedAt": user.updated_at or user.created_at,
            }
            
            # Add profile data if available
            if user.role.value == "worker" and user.worker_profile:
                user_data.update({
                    "profile": {
                        "bio": user.worker_profile.bio,
                        "skills": user.worker_profile.skills,
                        "serviceCategories": user.worker_profile.service_categories,
                        "hourlyRate": float(user.worker_profile.hourly_rate) if user.worker_profile.hourly_rate else None,
                        "location": user.worker_profile.location,
                        "rating": user.worker_profile.rating,
                        "totalJobs": user.worker_profile.total_jobs,
                        "kycStatus": user.worker_profile.kyc_status.value,
                    }
                })
            elif user.role.value == "client" and user.client_profile:
                user_data.update({
                    "profile": {
                        "companyName": user.client_profile.company_name,
                        "description": user.client_profile.description,
                        "location": user.client_profile.location,
                        "rating": user.client_profile.rating,
                        "totalJobsPosted": user.client_profile.total_jobs_posted,
                    }
                })
            
            # Save to Firestore
            self.firestore_db.collection("users").document(str(user.id)).set(user_data, merge=True)
            
            logger.info(f"User {user.id} synced to Firebase successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error syncing user {user.id} to Firebase: {e}")
            return False
    
    def sync_job_to_firebase(self, job: Job) -> bool:
        """Sync job data to Firebase for messaging context"""
        try:
            job_data = {
                "id": str(job.id),
                "title": job.title,
                "description": job.description,
                "category": job.category,
                "budgetMin": float(job.budget_min),
                "budgetMax": float(job.budget_max),
                "location": job.location,
                "status": job.status.value,
                "clientId": str(job.client_id),
                "createdAt": job.created_at,
                "updatedAt": job.updated_at or job.created_at,
            }
            
            # Save to Firestore
            self.firestore_db.collection("jobs").document(str(job.id)).set(job_data, merge=True)
            
            logger.info(f"Job {job.id} synced to Firebase successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error syncing job {job.id} to Firebase: {e}")
            return False
    
    def create_firebase_user(self, user: User, password: Optional[str] = None) -> Optional[str]:
        """Create Firebase Auth user"""
        try:
            user_record = firebase_auth.create_user(
                uid=str(user.id),
                email=user.email,
                display_name=f"{user.first_name} {user.last_name}",
                password=password,
                email_verified=user.email_verified,
                disabled=not user.is_active,
            )
            
            # Set custom claims for role-based access
            firebase_auth.set_custom_user_claims(user_record.uid, {
                "role": user.role.value,
                "verified": user.is_verified,
            })
            
            logger.info(f"Firebase Auth user created for user {user.id}")
            return user_record.uid
            
        except Exception as e:
            logger.error(f"Error creating Firebase Auth user for {user.id}: {e}")
            return None
    
    def update_firebase_user(self, user: User) -> bool:
        """Update Firebase Auth user"""
        try:
            firebase_auth.update_user(
                str(user.id),
                email=user.email,
                display_name=f"{user.first_name} {user.last_name}",
                email_verified=user.email_verified,
                disabled=not user.is_active,
            )
            
            # Update custom claims
            firebase_auth.set_custom_user_claims(str(user.id), {
                "role": user.role.value,
                "verified": user.is_verified,
            })
            
            logger.info(f"Firebase Auth user updated for user {user.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating Firebase Auth user for {user.id}: {e}")
            return False
    
    def get_firebase_messages(self, user_id: int, other_user_id: int, limit: int = 50) -> List[Dict]:
        """Get messages from Firebase for a conversation"""
        try:
            conversation_id = self._generate_conversation_id(str(user_id), str(other_user_id))
            
            messages_ref = (
                self.firestore_db.collection("messages")
                .where("conversationId", "==", conversation_id)
                .order_by("timestamp", direction=firestore.Query.DESCENDING)
                .limit(limit)
            )
            
            messages = []
            for doc in messages_ref.stream():
                message_data = doc.to_dict()
                message_data["id"] = doc.id
                messages.append(message_data)
            
            return messages
            
        except Exception as e:
            logger.error(f"Error getting Firebase messages: {e}")
            return []
    
    def get_user_conversations(self, user_id: int) -> List[Dict]:
        """Get user's conversations from Firebase"""
        try:
            conversations_ref = (
                self.firestore_db.collection("conversations")
                .where("participants", "array_contains", str(user_id))
                .order_by("updatedAt", direction=firestore.Query.DESCENDING)
            )
            
            conversations = []
            for doc in conversations_ref.stream():
                conversation_data = doc.to_dict()
                conversation_data["id"] = doc.id
                conversations.append(conversation_data)
            
            return conversations
            
        except Exception as e:
            logger.error(f"Error getting user conversations: {e}")
            return []
    
    def migrate_sql_messages_to_firebase(self, db: Session) -> bool:
        """Migrate existing SQL messages to Firebase"""
        try:
            # Get all messages from SQL database
            sql_messages = db.query(SQLMessage).all()
            
            batch = self.firestore_db.batch()
            conversations = {}
            
            for sql_message in sql_messages:
                # Convert SQL message to Firebase format
                conversation_id = self._generate_conversation_id(
                    str(sql_message.sender_id), 
                    str(sql_message.receiver_id)
                )
                
                firebase_message = {
                    "senderId": str(sql_message.sender_id),
                    "receiverId": str(sql_message.receiver_id),
                    "conversationId": conversation_id,
                    "content": sql_message.content,
                    "type": "text",
                    "timestamp": sql_message.created_at,
                    "isRead": sql_message.is_read,
                    "attachments": sql_message.attachments or [],
                    "jobId": str(sql_message.job_id) if sql_message.job_id else None,
                }
                
                # Add to batch
                message_ref = self.firestore_db.collection("messages").document()
                batch.set(message_ref, firebase_message)
                
                # Track conversation
                if conversation_id not in conversations:
                    conversations[conversation_id] = {
                        "id": conversation_id,
                        "participants": [str(sql_message.sender_id), str(sql_message.receiver_id)],
                        "lastMessage": {
                            "content": sql_message.content,
                            "senderId": str(sql_message.sender_id),
                            "timestamp": sql_message.created_at,
                            "type": "text",
                        },
                        "updatedAt": sql_message.created_at,
                        "unreadCount": {},
                    }
                else:
                    # Update if this message is newer
                    if sql_message.created_at > conversations[conversation_id]["updatedAt"]:
                        conversations[conversation_id]["lastMessage"] = {
                            "content": sql_message.content,
                            "senderId": str(sql_message.sender_id),
                            "timestamp": sql_message.created_at,
                            "type": "text",
                        }
                        conversations[conversation_id]["updatedAt"] = sql_message.created_at
            
            # Add conversations to batch
            for conversation_id, conversation_data in conversations.items():
                conversation_ref = self.firestore_db.collection("conversations").document(conversation_id)
                batch.set(conversation_ref, conversation_data)
            
            # Commit batch
            batch.commit()
            
            logger.info(f"Migrated {len(sql_messages)} messages and {len(conversations)} conversations to Firebase")
            return True
            
        except Exception as e:
            logger.error(f"Error migrating messages to Firebase: {e}")
            return False
    
    def _generate_conversation_id(self, user_id1: str, user_id2: str) -> str:
        """Generate conversation ID from two user IDs"""
        return "_".join(sorted([user_id1, user_id2]))
    
    def verify_firebase_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase ID token"""
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            logger.error(f"Error verifying Firebase token: {e}")
            return None
    
    def get_user_by_firebase_uid(self, db: Session, firebase_uid: str) -> Optional[User]:
        """Get user by Firebase UID"""
        try:
            # Firebase UID should match our user ID
            user_id = int(firebase_uid)
            return db.query(User).filter(User.id == user_id).first()
        except (ValueError, Exception) as e:
            logger.error(f"Error getting user by Firebase UID {firebase_uid}: {e}")
            return None

# Global instance
firebase_integration = FirebaseIntegrationService()