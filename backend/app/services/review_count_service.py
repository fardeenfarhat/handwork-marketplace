from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.db.models import Review, Booking, Job, WorkerProfile, ClientProfile


class ReviewCountService:
    """Service to standardize review count calculations across the application"""
    
    @staticmethod
    def get_worker_review_count(db: Session, worker_profile_id: int) -> int:
        """Get review count for a worker (reviews about their work)"""
        return db.query(Review).join(Booking).filter(
            Booking.worker_id == worker_profile_id,
            Review.status == "approved"
        ).count()
    
    @staticmethod
    def get_client_review_count(db: Session, client_profile_id: int) -> int:
        """Get review count for a client (reviews about them as a client)"""
        return db.query(Review).join(Booking).join(Job).filter(
            Job.client_id == client_profile_id,
            Review.status == "approved"
        ).count()
    
    @staticmethod
    def get_worker_review_count_by_user_id(db: Session, user_id: int) -> int:
        """Get review count for a worker by user ID"""
        worker_profile = db.query(WorkerProfile).filter(
            WorkerProfile.user_id == user_id
        ).first()
        
        if not worker_profile:
            return 0
            
        return ReviewCountService.get_worker_review_count(db, worker_profile.id)
    
    @staticmethod
    def get_client_review_count_by_user_id(db: Session, user_id: int) -> int:
        """Get review count for a client by user ID"""
        client_profile = db.query(ClientProfile).filter(
            ClientProfile.user_id == user_id
        ).first()
        
        if not client_profile:
            return 0
            
        return ReviewCountService.get_client_review_count(db, client_profile.id)
    
    @staticmethod
    def get_job_client_review_count(db: Session, job_id: int) -> int:
        """Get review count for the client who posted a specific job"""
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job or not job.client_id:
            return 0
            
        return ReviewCountService.get_client_review_count(db, job.client_id)