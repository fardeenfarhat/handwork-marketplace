from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta

from app.db.models import User, Job, Booking, Review, Payment, WorkerProfile, ClientProfile, JobStatus, BookingStatus
from app.schemas.dashboard import DashboardStats, RecentActivity, ActivityType


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_worker_dashboard_stats(self, user_id: int) -> DashboardStats:
        """Get dashboard statistics for a worker"""
        try:
            worker_profile = self.db.query(WorkerProfile).filter(
                WorkerProfile.user_id == user_id
            ).first()
            
            if not worker_profile:
                return DashboardStats()

            # Simple count queries to avoid timeouts
            total_jobs = self.db.query(Booking).filter(
                Booking.worker_id == worker_profile.id
            ).count()
            
            completed_jobs = self.db.query(Booking).filter(
                Booking.worker_id == worker_profile.id,
                Booking.status == BookingStatus.COMPLETED
            ).count()
            
            active_jobs = self.db.query(Booking).filter(
                Booking.worker_id == worker_profile.id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS])
            ).count()
            
            # Use profile data for ratings if available
            average_rating = float(worker_profile.rating or 0)
            total_reviews = worker_profile.total_jobs or 0  # Use existing field
            
            # Calculate total earnings from released payments (worker_amount)
            total_earnings_result = self.db.query(
                func.sum(Payment.worker_amount)
            ).join(
                Booking, Payment.booking_id == Booking.id
            ).filter(
                Booking.worker_id == worker_profile.id,
                Payment.status == 'released'
            ).scalar()
            
            total_earnings = float(total_earnings_result or 0)
            
            # Count unread messages (simplified)
            unread_messages = 0  # Can be implemented later

            return DashboardStats(
                total_jobs=total_jobs,
                completed_jobs=completed_jobs,
                active_jobs=active_jobs,
                total_earnings=round(total_earnings, 2),
                average_rating=round(average_rating, 1),
                total_reviews=total_reviews,
                unread_messages=unread_messages
            )
        except Exception as e:
            print(f"Error in get_worker_dashboard_stats: {e}")
            return DashboardStats()

    def get_client_dashboard_stats(self, user_id: int) -> DashboardStats:
        """Get dashboard statistics for a client"""
        try:
            client_profile = self.db.query(ClientProfile).filter(
                ClientProfile.user_id == user_id
            ).first()
            
            if not client_profile:
                return DashboardStats()

            # Count total jobs posted
            total_jobs = self.db.query(Job).filter(
                Job.client_id == client_profile.id
            ).count()
            
            # Count jobs with bookings
            jobs_with_bookings = self.db.query(Job).filter(
                Job.client_id == client_profile.id,
                Job.bookings.any()
            ).count()
            
            # Count active jobs (open or in progress)
            active_jobs = self.db.query(Job).filter(
                Job.client_id == client_profile.id,
                Job.status.in_([JobStatus.OPEN, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS])
            ).count()
            
            # Get total spent on completed payments
            total_spent_result = self.db.query(
                func.sum(Payment.amount)
            ).join(
                Booking, Payment.booking_id == Booking.id
            ).join(
                Job, Booking.job_id == Job.id
            ).filter(
                Job.client_id == client_profile.id,
                Payment.status == 'released'
            ).scalar()
            
            total_spent = float(total_spent_result or 0)
            
            # Use profile data if available
            average_rating = float(client_profile.rating or 0)
            
            # Count reviews received
            total_reviews = self.db.query(Review).filter(
                Review.reviewee_id == user_id,
                Review.status == 'approved'
            ).count()
            
            unread_messages = 0

            return DashboardStats(
                total_jobs=total_jobs,
                completed_jobs=jobs_with_bookings,
                active_jobs=active_jobs,
                total_earnings=round(total_spent, 2),  # For clients, this shows total spent
                average_rating=round(average_rating, 1),
                total_reviews=total_reviews,
                unread_messages=unread_messages
            )
        except Exception as e:
            print(f"Error in get_client_dashboard_stats: {e}")
            import traceback
            traceback.print_exc()
            return DashboardStats()

    def get_recent_activity(self, user_id: int, is_worker: bool, limit: int = 10) -> List[RecentActivity]:
        """Get recent activity for dashboard"""
        try:
            activities = []
            
            if is_worker:
                # Get worker profile
                worker_profile = self.db.query(WorkerProfile).filter(
                    WorkerProfile.user_id == user_id
                ).first()
                
                if not worker_profile:
                    return []
                
                # Recent bookings
                recent_bookings = self.db.query(Booking).filter(
                    Booking.worker_id == worker_profile.id
                ).order_by(desc(Booking.created_at)).limit(5).all()
                
                for booking in recent_bookings:
                    if booking.status == BookingStatus.COMPLETED:
                        activities.append(RecentActivity(
                            id=f"booking_{booking.id}",
                            type=ActivityType.JOB_COMPLETED,
                            title="Job Completed",
                            description=f"Completed job: {booking.job.title if booking.job else 'Job'}",
                            timestamp=booking.updated_at or booking.created_at,
                            amount=None
                        ))
                    elif booking.status in [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]:
                        activities.append(RecentActivity(
                            id=f"booking_{booking.id}",
                            type=ActivityType.JOB_APPLIED,
                            title="Active Job",
                            description=f"Working on: {booking.job.title if booking.job else 'Job'}",
                            timestamp=booking.created_at,
                            amount=None
                        ))
                
                # Recent payments (join through bookings)
                recent_payments = self.db.query(Payment).join(
                    Booking, Payment.booking_id == Booking.id
                ).filter(
                    Booking.worker_id == worker_profile.id,
                    Payment.status == 'released'
                ).order_by(desc(Payment.updated_at)).limit(3).all()
                
                for payment in recent_payments:
                    activities.append(RecentActivity(
                        id=f"payment_{payment.id}",
                        type=ActivityType.PAYMENT_RECEIVED,
                        title="Payment Received",
                        description=f"Payment for booking #{payment.booking_id}",
                        timestamp=payment.updated_at or payment.created_at,
                        amount=float(payment.worker_amount)
                    ))
                
                # Recent reviews
                recent_reviews = self.db.query(Review).filter(
                    Review.reviewee_id == user_id,
                    Review.status == 'approved'
                ).order_by(desc(Review.created_at)).limit(2).all()
                
                for review in recent_reviews:
                    activities.append(RecentActivity(
                        id=f"review_{review.id}",
                        type=ActivityType.REVIEW_RECEIVED,
                        title="New Review",
                        description=f"Received {review.rating} star review",
                        timestamp=review.created_at,
                        amount=None
                    ))
            else:
                # Client activity - jobs posted
                client_profile = self.db.query(ClientProfile).filter(
                    ClientProfile.user_id == user_id
                ).first()
                
                if not client_profile:
                    return []
                
                recent_jobs = self.db.query(Job).filter(
                    Job.client_id == client_profile.id
                ).order_by(desc(Job.created_at)).limit(limit).all()
                
                for job in recent_jobs:
                    activities.append(RecentActivity(
                        id=f"job_{job.id}",
                        type=ActivityType.JOB_APPLIED,
                        title="Job Posted",
                        description=f"Posted: {job.title}",
                        timestamp=job.created_at,
                        amount=None
                    ))
            
            # Sort by timestamp and limit to 5
            activities.sort(key=lambda x: x.timestamp, reverse=True)
            return activities[:5]
            
        except Exception as e:
            print(f"Error in get_recent_activity: {e}")
            import traceback
            traceback.print_exc()
            return []