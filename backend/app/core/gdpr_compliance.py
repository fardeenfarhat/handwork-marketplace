"""
GDPR compliance features for data privacy and user rights
"""
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging

from app.core.encryption import encryption_manager, pii_protection
from app.db.database import get_db

logger = logging.getLogger(__name__)

class GDPRCompliance:
    """GDPR compliance manager for data privacy and user rights"""
    
    def __init__(self):
        self.data_retention_periods = {
            'user_profiles': 365 * 7,  # 7 years
            'job_postings': 365 * 3,   # 3 years
            'messages': 365 * 2,       # 2 years
            'payment_records': 365 * 7, # 7 years (legal requirement)
            'audit_logs': 365 * 6,     # 6 years
            'session_data': 30,        # 30 days
            'verification_tokens': 1,   # 1 day
        }
    
    async def export_user_data(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Export all user data for GDPR data portability"""
        try:
            from app.db.models import User, Profile, Job, Booking, Message, Review, Payment
            
            # Get user data
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Collect all user data
            user_data = {
                'personal_information': {
                    'user_id': user.id,
                    'email': user.email,
                    'phone': user.phone,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None,
                    'is_verified': user.is_verified,
                    'is_active': user.is_active,
                },
                'profile_information': {},
                'job_postings': [],
                'bookings': [],
                'messages': [],
                'reviews': [],
                'payment_history': []
            }
            
            # Get profile data
            profile = db.query(Profile).filter(Profile.user_id == user_id).first()
            if profile:
                user_data['profile_information'] = {
                    'full_name': profile.full_name,
                    'bio': profile.bio,
                    'skills': profile.skills,
                    'hourly_rate': float(profile.hourly_rate) if profile.hourly_rate else None,
                    'location': profile.location,
                    'profile_image_url': profile.profile_image_url,
                    'portfolio_images': profile.portfolio_images,
                    'rating': float(profile.rating) if profile.rating else None,
                    'total_jobs_completed': profile.total_jobs_completed,
                    'created_at': profile.created_at.isoformat() if profile.created_at else None,
                }
            
            # Get job postings
            jobs = db.query(Job).filter(Job.client_id == user_id).all()
            for job in jobs:
                user_data['job_postings'].append({
                    'job_id': job.id,
                    'title': job.title,
                    'description': job.description,
                    'budget': float(job.budget) if job.budget else None,
                    'location': job.location,
                    'status': job.status,
                    'created_at': job.created_at.isoformat() if job.created_at else None,
                })
            
            # Get bookings (as client or provider)
            bookings = db.query(Booking).filter(
                (Booking.client_id == user_id) | (Booking.provider_id == user_id)
            ).all()
            for booking in bookings:
                user_data['bookings'].append({
                    'booking_id': booking.id,
                    'job_id': booking.job_id,
                    'client_id': booking.client_id,
                    'provider_id': booking.provider_id,
                    'status': booking.status,
                    'scheduled_date': booking.scheduled_date.isoformat() if booking.scheduled_date else None,
                    'total_amount': float(booking.total_amount) if booking.total_amount else None,
                    'created_at': booking.created_at.isoformat() if booking.created_at else None,
                })
            
            # Get messages
            messages = db.query(Message).filter(
                (Message.sender_id == user_id) | (Message.recipient_id == user_id)
            ).all()
            for message in messages:
                user_data['messages'].append({
                    'message_id': message.id,
                    'sender_id': message.sender_id,
                    'recipient_id': message.recipient_id,
                    'content': message.content,
                    'sent_at': message.sent_at.isoformat() if message.sent_at else None,
                    'is_read': message.is_read,
                })
            
            # Get reviews (given and received)
            reviews = db.query(Review).filter(
                (Review.reviewer_id == user_id) | (Review.reviewee_id == user_id)
            ).all()
            for review in reviews:
                user_data['reviews'].append({
                    'review_id': review.id,
                    'reviewer_id': review.reviewer_id,
                    'reviewee_id': review.reviewee_id,
                    'booking_id': review.booking_id,
                    'rating': review.rating,
                    'comment': review.comment,
                    'created_at': review.created_at.isoformat() if review.created_at else None,
                })
            
            # Get payment history
            payments = db.query(Payment).filter(
                (Payment.payer_id == user_id) | (Payment.recipient_id == user_id)
            ).all()
            for payment in payments:
                user_data['payment_history'].append({
                    'payment_id': payment.id,
                    'booking_id': payment.booking_id,
                    'payer_id': payment.payer_id,
                    'recipient_id': payment.recipient_id,
                    'amount': float(payment.amount) if payment.amount else None,
                    'platform_fee': float(payment.platform_fee) if payment.platform_fee else None,
                    'status': payment.status,
                    'payment_method': payment.payment_method,
                    'created_at': payment.created_at.isoformat() if payment.created_at else None,
                })
            
            # Log the data export
            await self.log_gdpr_action(user_id, "data_export", "User data exported", db)
            
            return user_data
            
        except Exception as e:
            logger.error(f"Error exporting user data for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to export user data")
    
    async def delete_user_data(self, user_id: int, db: Session, keep_legal_records: bool = True) -> Dict[str, Any]:
        """Delete user data for GDPR right to be forgotten"""
        try:
            from app.db.models import User, Profile, Job, Booking, Message, Review, Payment
            
            deletion_summary = {
                'user_id': user_id,
                'deleted_records': {},
                'retained_records': {},
                'deletion_date': datetime.utcnow().isoformat()
            }
            
            # Get user first
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Delete profile data
            profile = db.query(Profile).filter(Profile.user_id == user_id).first()
            if profile:
                db.delete(profile)
                deletion_summary['deleted_records']['profile'] = 1
            
            # Handle job postings
            jobs = db.query(Job).filter(Job.client_id == user_id).all()
            if keep_legal_records:
                # Anonymize instead of delete for legal compliance
                for job in jobs:
                    job.client_id = None
                    job.title = "[DELETED USER]"
                    job.description = "[DELETED USER]"
                deletion_summary['retained_records']['jobs_anonymized'] = len(jobs)
            else:
                for job in jobs:
                    db.delete(job)
                deletion_summary['deleted_records']['jobs'] = len(jobs)
            
            # Handle bookings
            bookings = db.query(Booking).filter(
                (Booking.client_id == user_id) | (Booking.provider_id == user_id)
            ).all()
            if keep_legal_records:
                # Keep for legal/financial records but anonymize
                for booking in bookings:
                    if booking.client_id == user_id:
                        booking.client_id = None
                    if booking.provider_id == user_id:
                        booking.provider_id = None
                deletion_summary['retained_records']['bookings_anonymized'] = len(bookings)
            else:
                for booking in bookings:
                    db.delete(booking)
                deletion_summary['deleted_records']['bookings'] = len(bookings)
            
            # Delete messages
            messages = db.query(Message).filter(
                (Message.sender_id == user_id) | (Message.recipient_id == user_id)
            ).all()
            for message in messages:
                db.delete(message)
            deletion_summary['deleted_records']['messages'] = len(messages)
            
            # Delete reviews
            reviews = db.query(Review).filter(
                (Review.reviewer_id == user_id) | (Review.reviewee_id == user_id)
            ).all()
            for review in reviews:
                db.delete(review)
            deletion_summary['deleted_records']['reviews'] = len(reviews)
            
            # Handle payments
            payments = db.query(Payment).filter(
                (Payment.payer_id == user_id) | (Payment.recipient_id == user_id)
            ).all()
            if keep_legal_records:
                # Keep payment records for legal compliance but anonymize
                for payment in payments:
                    if payment.payer_id == user_id:
                        payment.payer_id = None
                    if payment.recipient_id == user_id:
                        payment.recipient_id = None
                deletion_summary['retained_records']['payments_anonymized'] = len(payments)
            else:
                for payment in payments:
                    db.delete(payment)
                deletion_summary['deleted_records']['payments'] = len(payments)
            
            # Finally delete the user account
            db.delete(user)
            deletion_summary['deleted_records']['user_account'] = 1
            
            # Commit all changes
            db.commit()
            
            # Log the deletion
            await self.log_gdpr_action(user_id, "data_deletion", f"User data deleted: {json.dumps(deletion_summary)}", db)
            
            return deletion_summary
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting user data for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete user data")
    
    async def anonymize_user_data(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Anonymize user data while preserving business records"""
        try:
            from app.db.models import User, Profile
            
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Generate anonymous identifiers
            anonymous_email = f"anonymous_{user_id}@deleted.local"
            anonymous_phone = None
            
            # Anonymize user data
            user.email = anonymous_email
            user.phone = anonymous_phone
            user.is_active = False
            
            # Anonymize profile data
            profile = db.query(Profile).filter(Profile.user_id == user_id).first()
            if profile:
                profile.full_name = f"Anonymous User {user_id}"
                profile.bio = "[User data anonymized]"
                profile.location = "[Location removed]"
                profile.profile_image_url = None
                profile.portfolio_images = []
            
            db.commit()
            
            anonymization_summary = {
                'user_id': user_id,
                'anonymized_at': datetime.utcnow().isoformat(),
                'anonymized_fields': ['email', 'phone', 'full_name', 'bio', 'location', 'images']
            }
            
            # Log the anonymization
            await self.log_gdpr_action(user_id, "data_anonymization", f"User data anonymized: {json.dumps(anonymization_summary)}", db)
            
            return anonymization_summary
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error anonymizing user data for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to anonymize user data")
    
    async def get_data_processing_info(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Get information about data processing for transparency"""
        try:
            processing_info = {
                'user_id': user_id,
                'data_categories': {
                    'personal_data': {
                        'types': ['email', 'phone', 'name', 'location'],
                        'purpose': 'Account management and service delivery',
                        'legal_basis': 'Contract performance',
                        'retention_period': f"{self.data_retention_periods['user_profiles']} days"
                    },
                    'job_data': {
                        'types': ['job postings', 'applications', 'bookings'],
                        'purpose': 'Service delivery and marketplace functionality',
                        'legal_basis': 'Contract performance',
                        'retention_period': f"{self.data_retention_periods['job_postings']} days"
                    },
                    'communication_data': {
                        'types': ['messages', 'notifications'],
                        'purpose': 'Communication between users',
                        'legal_basis': 'Contract performance',
                        'retention_period': f"{self.data_retention_periods['messages']} days"
                    },
                    'payment_data': {
                        'types': ['payment records', 'transaction history'],
                        'purpose': 'Payment processing and financial records',
                        'legal_basis': 'Legal obligation',
                        'retention_period': f"{self.data_retention_periods['payment_records']} days"
                    },
                    'usage_data': {
                        'types': ['session data', 'audit logs'],
                        'purpose': 'Security and service improvement',
                        'legal_basis': 'Legitimate interest',
                        'retention_period': f"{self.data_retention_periods['audit_logs']} days"
                    }
                },
                'third_party_sharing': {
                    'payment_processors': {
                        'purpose': 'Payment processing',
                        'data_types': ['payment information'],
                        'legal_basis': 'Contract performance'
                    },
                    'email_service': {
                        'purpose': 'Email notifications',
                        'data_types': ['email address', 'name'],
                        'legal_basis': 'Contract performance'
                    }
                },
                'user_rights': [
                    'Right to access personal data',
                    'Right to rectify inaccurate data',
                    'Right to erase personal data',
                    'Right to restrict processing',
                    'Right to data portability',
                    'Right to object to processing',
                    'Right to withdraw consent'
                ],
                'contact_info': {
                    'data_protection_officer': 'dpo@handworkmarketplace.com',
                    'privacy_policy': 'https://handworkmarketplace.com/privacy',
                    'complaint_authority': 'Your local data protection authority'
                }
            }
            
            return processing_info
            
        except Exception as e:
            logger.error(f"Error getting data processing info for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to get data processing information")
    
    async def log_gdpr_action(self, user_id: int, action: str, details: str, db: Session):
        """Log GDPR-related actions for audit trail"""
        try:
            from app.db.models import AuditLog
            
            audit_log = AuditLog(
                user_id=user_id,
                action=f"GDPR_{action}",
                details=details,
                ip_address="system",
                user_agent="GDPR_System",
                timestamp=datetime.utcnow()
            )
            
            db.add(audit_log)
            db.commit()
            
        except Exception as e:
            logger.error(f"Error logging GDPR action: {str(e)}")
    
    async def cleanup_expired_data(self, db: Session) -> Dict[str, int]:
        """Clean up expired data based on retention policies"""
        try:
            from app.db.models import AuditLog, User
            
            cleanup_summary = {}
            current_time = datetime.utcnow()
            
            # Clean up expired audit logs
            expired_logs_cutoff = current_time - timedelta(days=self.data_retention_periods['audit_logs'])
            expired_logs = db.query(AuditLog).filter(AuditLog.timestamp < expired_logs_cutoff).all()
            
            for log in expired_logs:
                db.delete(log)
            
            cleanup_summary['expired_audit_logs'] = len(expired_logs)
            
            # Clean up expired verification tokens
            expired_tokens_cutoff = current_time - timedelta(days=self.data_retention_periods['verification_tokens'])
            expired_users = db.query(User).filter(
                User.verification_token_expires < expired_tokens_cutoff,
                User.verification_token.isnot(None)
            ).all()
            
            for user in expired_users:
                user.verification_token = None
                user.verification_token_expires = None
            
            cleanup_summary['expired_verification_tokens'] = len(expired_users)
            
            db.commit()
            
            logger.info(f"GDPR cleanup completed: {cleanup_summary}")
            return cleanup_summary
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error during GDPR cleanup: {str(e)}")
            return {}

# Global GDPR compliance instance
gdpr_compliance = GDPRCompliance()