from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.db.models import (
    Job, WorkerProfile, User, Notification, JobStatus, UserRole
)
from app.services.recommendation_service import RecommendationService
from app.services.notification_service import NotificationService


class JobAlertService:
    """
    Service for managing job alerts and proactive notifications to workers
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.recommendation_service = RecommendationService(db)
        self.notification_service = NotificationService(db)

    def send_job_alerts_for_new_job(self, job_id: int) -> Dict[str, int]:
        """
        Send job alerts to relevant workers when a new job is posted
        """
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job or job.status != JobStatus.OPEN:
            return {"alerts_sent": 0, "error": "Job not found or not open"}
        
        # Generate alerts using recommendation service
        alerts = self.recommendation_service.create_job_alerts_for_workers(job_id)
        
        alerts_sent = 0
        notifications_sent = 0
        
        for alert in alerts:
            try:
                # Get worker user ID
                worker_profile = self.db.query(WorkerProfile).filter(
                    WorkerProfile.id == alert.worker_id
                ).first()
                
                if not worker_profile:
                    continue
                
                # Create notification
                notification_created = self.notification_service.create_notification(
                    user_id=worker_profile.user_id,
                    title="New Job Match Found!",
                    message=f"A new {job.category} job has been posted in {job.location} that matches your skills.",
                    notification_type="job_update",
                    data={
                        "job_id": job_id,
                        "alert_type": alert.alert_type,
                        "relevance_score": alert.relevance_score,
                        "job_title": job.title,
                        "job_category": job.category,
                        "job_location": job.location,
                        "budget_range": f"${job.budget_min} - ${job.budget_max}"
                    }
                )
                
                if notification_created:
                    notifications_sent += 1
                    alerts_sent += 1
                
            except Exception:
                # Continue with other alerts if one fails
                continue
        
        return {
            "alerts_sent": alerts_sent,
            "notifications_sent": notifications_sent,
            "total_workers_evaluated": len(alerts)
        }

    def send_daily_job_digest(self, worker_user_id: int) -> Dict[str, int]:
        """
        Send daily digest of new job opportunities to a worker
        """
        user = self.db.query(User).filter(
            User.id == worker_user_id,
            User.role == UserRole.WORKER,
            User.is_active == True
        ).first()
        
        if not user:
            return {"digest_sent": 0, "error": "Worker not found or inactive"}
        
        worker_profile = self.db.query(WorkerProfile).filter(
            WorkerProfile.user_id == worker_user_id
        ).first()
        
        if not worker_profile:
            return {"digest_sent": 0, "error": "Worker profile not found"}
        
        # Get job recommendations for the worker
        recommendations = self.recommendation_service.get_job_recommendations_for_worker(
            worker_profile.id, limit=5
        )
        
        if not recommendations:
            return {"digest_sent": 0, "message": "No new job recommendations"}
        
        # Create digest message
        job_titles = [rec.job.title for rec in recommendations[:3]]
        digest_message = f"Here are {len(recommendations)} new job opportunities for you: {', '.join(job_titles)}"
        if len(recommendations) > 3:
            digest_message += f" and {len(recommendations) - 3} more."
        
        # Send digest notification
        notification_created = self.notification_service.create_notification(
            user_id=worker_user_id,
            title="Daily Job Digest",
            message=digest_message,
            notification_type="job_update",
            data={
                "digest_type": "daily",
                "recommendation_count": len(recommendations),
                "job_ids": [rec.job_id for rec in recommendations]
            }
        )
        
        return {
            "digest_sent": 1 if notification_created else 0,
            "recommendations_included": len(recommendations)
        }

    def send_weekly_job_digest(self, worker_user_id: int) -> Dict[str, int]:
        """
        Send weekly digest of job market trends and opportunities
        """
        user = self.db.query(User).filter(
            User.id == worker_user_id,
            User.role == UserRole.WORKER,
            User.is_active == True
        ).first()
        
        if not user:
            return {"digest_sent": 0, "error": "Worker not found or inactive"}
        
        worker_profile = self.db.query(WorkerProfile).filter(
            WorkerProfile.user_id == worker_user_id
        ).first()
        
        if not worker_profile:
            return {"digest_sent": 0, "error": "Worker profile not found"}
        
        # Get weekly job statistics
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        # Count new jobs in worker's categories
        new_jobs_count = self.db.query(Job).filter(
            Job.created_at >= week_ago,
            Job.status == JobStatus.OPEN
        ).count()
        
        category_jobs_count = 0
        if worker_profile.service_categories:
            category_jobs_count = self.db.query(Job).filter(
                Job.created_at >= week_ago,
                Job.status == JobStatus.OPEN,
                Job.category.in_(worker_profile.service_categories)
            ).count()
        
        # Get price suggestions for worker's main category
        price_suggestion = None
        if worker_profile.service_categories:
            main_category = worker_profile.service_categories[0]
            price_suggestion = self.recommendation_service.get_price_suggestions(
                main_category, worker_profile.location or ""
            )
        
        # Create weekly digest message
        digest_message = f"This week: {new_jobs_count} new jobs posted"
        if category_jobs_count > 0:
            digest_message += f", {category_jobs_count} in your categories"
        
        if price_suggestion and price_suggestion.market_average:
            digest_message += f". Average rate: ${price_suggestion.market_average:.0f}/hr"
        
        # Send weekly digest notification
        notification_created = self.notification_service.create_notification(
            user_id=worker_user_id,
            title="Weekly Job Market Update",
            message=digest_message,
            notification_type="job_update",
            data={
                "digest_type": "weekly",
                "new_jobs_total": new_jobs_count,
                "category_jobs": category_jobs_count,
                "market_average": price_suggestion.market_average if price_suggestion else None
            }
        )
        
        return {
            "digest_sent": 1 if notification_created else 0,
            "new_jobs_total": new_jobs_count,
            "category_jobs": category_jobs_count
        }

    def send_price_alert(self, worker_user_id: int, category: str) -> Dict[str, int]:
        """
        Send price alert when market rates change significantly
        """
        user = self.db.query(User).filter(
            User.id == worker_user_id,
            User.role == UserRole.WORKER,
            User.is_active == True
        ).first()
        
        if not user:
            return {"alert_sent": 0, "error": "Worker not found or inactive"}
        
        worker_profile = self.db.query(WorkerProfile).filter(
            WorkerProfile.user_id == worker_user_id
        ).first()
        
        if not worker_profile:
            return {"alert_sent": 0, "error": "Worker profile not found"}
        
        # Check if worker works in this category
        if category not in (worker_profile.service_categories or []):
            return {"alert_sent": 0, "message": "Worker doesn't work in this category"}
        
        # Get current price suggestion
        price_suggestion = self.recommendation_service.get_price_suggestions(
            category, worker_profile.location or ""
        )
        
        if not price_suggestion or not price_suggestion.market_average:
            return {"alert_sent": 0, "message": "No market data available"}
        
        # Compare with worker's current rate
        worker_rate = float(worker_profile.hourly_rate) if worker_profile.hourly_rate else 0
        market_rate = price_suggestion.market_average
        
        rate_difference = abs(market_rate - worker_rate) / market_rate if market_rate > 0 else 0
        
        # Only send alert if there's a significant difference (>20%)
        if rate_difference < 0.2:
            return {"alert_sent": 0, "message": "No significant rate change"}
        
        # Determine alert type
        if market_rate > worker_rate:
            alert_type = "rate_increase"
            message = f"Market rates for {category} have increased! Current average: ${market_rate:.0f}/hr (your rate: ${worker_rate:.0f}/hr)"
        else:
            alert_type = "rate_decrease"
            message = f"Market rates for {category} have decreased. Current average: ${market_rate:.0f}/hr (your rate: ${worker_rate:.0f}/hr)"
        
        # Send price alert notification
        notification_created = self.notification_service.create_notification(
            user_id=worker_user_id,
            title="Market Rate Alert",
            message=message,
            notification_type="job_update",
            data={
                "alert_type": alert_type,
                "category": category,
                "market_rate": market_rate,
                "worker_rate": worker_rate,
                "rate_difference_percent": rate_difference * 100
            }
        )
        
        return {
            "alert_sent": 1 if notification_created else 0,
            "alert_type": alert_type,
            "market_rate": market_rate,
            "worker_rate": worker_rate
        }

    def get_alert_preferences(self, worker_user_id: int) -> Dict[str, any]:
        """
        Get job alert preferences for a worker
        In production, this would be stored in a preferences table
        """
        worker_profile = self.db.query(WorkerProfile).filter(
            WorkerProfile.user_id == worker_user_id
        ).first()
        
        if not worker_profile:
            return {"error": "Worker profile not found"}
        
        # Return default preferences for now
        return {
            "categories": worker_profile.service_categories or [],
            "max_distance_km": 50.0,
            "min_budget": None,
            "max_budget": None,
            "notification_frequency": "immediate",
            "daily_digest": True,
            "weekly_digest": True,
            "price_alerts": True
        }

    def update_alert_preferences(
        self, 
        worker_user_id: int, 
        preferences: Dict[str, any]
    ) -> Dict[str, any]:
        """
        Update job alert preferences for a worker
        In production, this would update a preferences table
        """
        worker_profile = self.db.query(WorkerProfile).filter(
            WorkerProfile.user_id == worker_user_id
        ).first()
        
        if not worker_profile:
            return {"error": "Worker profile not found"}
        
        # For now, just return the preferences as confirmation
        # In production, you'd store these in the database
        return {
            "updated": True,
            "preferences": preferences
        }