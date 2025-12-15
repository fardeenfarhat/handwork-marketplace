from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc, asc
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import statistics
from collections import defaultdict

from app.db.models import (
    Review, User, Booking, WorkerProfile, ClientProfile, 
    Job, ReviewStatus, BookingStatus, UserRole
)
from app.schemas.reviews import (
    ReviewCreate, ReviewUpdate, ReviewFilters, ReviewStats,
    UserReputationScore, ReviewAnalytics
)
from app.services.notification_service import NotificationService

class ReviewService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)

    def create_review(self, review_data: ReviewCreate, reviewer_id: int) -> Review:
        """Create a new review for a completed booking"""
        
        print(f"🔍 DEBUG: Creating review for booking {review_data.booking_id} by user {reviewer_id}")
        
        # Verify booking exists and is completed
        booking = self.db.query(Booking).options(
            joinedload(Booking.client).joinedload(ClientProfile.user),
            joinedload(Booking.worker).joinedload(WorkerProfile.user)
        ).filter(
            Booking.id == review_data.booking_id,
            Booking.status == BookingStatus.COMPLETED
        ).first()
        
        if not booking:
            print(f"❌ DEBUG: Booking {review_data.booking_id} not found or not completed")
            raise ValueError("Booking not found or not completed")
        
        print(f"✅ DEBUG: Found booking - Client: {booking.client.user_id}, Worker: {booking.worker.user_id}")
        
        # Verify reviewer is part of the booking
        client_user_id = booking.client.user_id
        worker_user_id = booking.worker.user_id
        
        print(f"🔍 DEBUG: Checking if reviewer {reviewer_id} is in booking (client: {client_user_id}, worker: {worker_user_id})")
        
        if reviewer_id not in [client_user_id, worker_user_id]:
            print(f"❌ DEBUG: Reviewer {reviewer_id} not part of booking")
            raise ValueError("You can only review bookings you were part of")
        
        # Auto-determine the reviewee based on the booking and reviewer
        # If reviewer is the client, reviewee is the worker (and vice versa)
        actual_reviewee_id = (
            worker_user_id if reviewer_id == client_user_id 
            else client_user_id
        )
        
        print(f"✅ DEBUG: Auto-determined reviewee: {actual_reviewee_id}")
        
        # If reviewee_id is provided, validate it matches our expectation
        # But also handle cases where profile IDs are sent instead of user IDs
        if hasattr(review_data, 'reviewee_id') and review_data.reviewee_id is not None:
            # Check if the provided reviewee_id matches the expected user ID
            if review_data.reviewee_id != actual_reviewee_id:
                # Check if it might be a profile ID instead of user ID
                if (reviewer_id == booking.client.user_id and review_data.reviewee_id == booking.worker_id) or \
                   (reviewer_id == booking.worker.user_id and review_data.reviewee_id == booking.client_id):
                    # Profile ID was sent, that's okay, we'll use the actual user ID
                    pass
                else:
                    raise ValueError("Invalid reviewee for this booking")
        
        # Use the auto-determined reviewee ID regardless of what was sent
        final_reviewee_id = actual_reviewee_id
        
        # Check if review already exists
        existing_review = self.db.query(Review).filter(
            Review.booking_id == review_data.booking_id,
            Review.reviewer_id == reviewer_id
        ).first()
        
        if existing_review:
            print(f"❌ DEBUG: Review already exists for booking {review_data.booking_id}")
            raise ValueError("You have already reviewed this booking")
        
        print(f"✅ DEBUG: No existing review found, creating new review")
        
        # Create the review
        print(f"🔍 DEBUG: Creating review with data - booking: {review_data.booking_id}, reviewer: {reviewer_id}, reviewee: {final_reviewee_id}, rating: {review_data.rating}")
        print(f"🔍 DEBUG: review_data type: {type(review_data)}")
        print(f"🔍 DEBUG: review_data.rating type: {type(review_data.rating)}, value: {review_data.rating}")
        print(f"🔍 DEBUG: review_data.comment: {review_data.comment}")
        
        review = Review(
            booking_id=review_data.booking_id,
            reviewer_id=reviewer_id,
            reviewee_id=final_reviewee_id,  # Use the auto-determined reviewee ID
            rating=review_data.rating,
            comment=review_data.comment,
            status=ReviewStatus.APPROVED  # Auto-approve reviews to update ratings immediately
        )
        
        print(f"🔍 DEBUG: Review object created - rating in object: {review.rating}")
        
        self.db.add(review)
        print(f"✅ DEBUG: Review object created and added to DB")
        self.db.commit()
        self.db.refresh(review)
        
        # Update user ratings
        self._update_user_rating(review.reviewee_id)
        
        # Send notification to reviewee
        self.notification_service.create_notification(
            user_id=review.reviewee_id,
            title="New Review Received",
            message=f"You received a {review_data.rating}-star review",
            notification_type="review",
            data={"review_id": review.id, "rating": review_data.rating}
        )
        
        return review

    def update_review(self, review_id: int, review_data: ReviewUpdate, reviewer_id: int) -> Review:
        """Update an existing review (only if pending or within 24 hours of creation)"""
        
        review = self.db.query(Review).filter(
            Review.id == review_id,
            Review.reviewer_id == reviewer_id
        ).first()
        
        if not review:
            raise ValueError("Review not found")
        
        # Check if review can be updated (pending or within 24 hours)
        from datetime import datetime, timedelta
        can_update = (
            review.status == ReviewStatus.PENDING or 
            (review.status == ReviewStatus.APPROVED and 
             review.created_at > datetime.utcnow() - timedelta(hours=24))
        )
        
        if not can_update:
            raise ValueError("Review cannot be updated after 24 hours")
        
        # Update fields
        if review_data.rating is not None:
            review.rating = review_data.rating
        if review_data.comment is not None:
            review.comment = review_data.comment
        
        self.db.commit()
        self.db.refresh(review)
        
        # Update user ratings
        self._update_user_rating(review.reviewee_id)
        
        return review

    def get_review(self, review_id: int) -> Optional[Review]:
        """Get a single review by ID"""
        return self.db.query(Review).filter(Review.id == review_id).first()

    def get_reviews(self, filters: ReviewFilters) -> Tuple[List[Review], int]:
        """Get reviews with filtering and pagination"""
        
        query = self.db.query(Review)
        
        # Apply filters
        if filters.reviewee_id:
            query = query.filter(Review.reviewee_id == filters.reviewee_id)
        if filters.reviewer_id:
            query = query.filter(Review.reviewer_id == filters.reviewer_id)
        if filters.booking_id:
            query = query.filter(Review.booking_id == filters.booking_id)
        if filters.rating:
            query = query.filter(Review.rating == filters.rating)
        if filters.status:
            query = query.filter(Review.status == filters.status)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        reviews = query.order_by(desc(Review.created_at)).offset(
            (filters.page - 1) * filters.per_page
        ).limit(filters.per_page).all()
        
        return reviews, total

    def get_user_reviews(self, user_id: int, as_reviewee: bool = True, 
                        status: Optional[ReviewStatus] = ReviewStatus.APPROVED,
                        page: int = 1, per_page: int = 10) -> Tuple[List[Review], int]:
        """Get reviews for a user (either as reviewee or reviewer)"""
        
        query = self.db.query(Review)
        
        if as_reviewee:
            query = query.filter(Review.reviewee_id == user_id)
        else:
            query = query.filter(Review.reviewer_id == user_id)
        
        if status:
            query = query.filter(Review.status == status)
        
        total = query.count()
        
        reviews = query.order_by(desc(Review.created_at)).offset(
            (page - 1) * per_page
        ).limit(per_page).all()
        
        return reviews, total

    def get_review_stats(self, user_id: int) -> ReviewStats:
        """Get review statistics for a user"""
        
        # Get approved reviews for the user
        reviews = self.db.query(Review).filter(
            Review.reviewee_id == user_id,
            Review.status == ReviewStatus.APPROVED
        ).all()
        
        if not reviews:
            return ReviewStats(
                total_reviews=0,
                average_rating=0.0,
                rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
                recent_reviews_count=0
            )
        
        # Calculate statistics
        ratings = [review.rating for review in reviews]
        average_rating = statistics.mean(ratings)
        
        # Rating distribution
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for rating in ratings:
            rating_distribution[rating] += 1
        
        # Recent reviews (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_reviews_count = len([
            r for r in reviews if r.created_at >= thirty_days_ago
        ])
        
        return ReviewStats(
            total_reviews=len(reviews),
            average_rating=round(average_rating, 2),
            rating_distribution=rating_distribution,
            recent_reviews_count=recent_reviews_count
        )

    def calculate_reputation_score(self, user_id: int) -> UserReputationScore:
        """Calculate comprehensive reputation score for a user"""
        
        # Get basic review stats
        stats = self.get_review_stats(user_id)
        
        # Get user role
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Base reputation score starts with average rating
        reputation_score = stats.average_rating
        
        # Adjust based on number of reviews (more reviews = more reliable)
        if stats.total_reviews >= 10:
            reputation_score += 0.5
        elif stats.total_reviews >= 5:
            reputation_score += 0.3
        elif stats.total_reviews >= 2:
            reputation_score += 0.1
        
        # Calculate recent performance (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_reviews = self.db.query(Review).filter(
            Review.reviewee_id == user_id,
            Review.status == ReviewStatus.APPROVED,
            Review.created_at >= thirty_days_ago
        ).all()
        
        recent_performance = 0.0
        if recent_reviews:
            recent_ratings = [r.rating for r in recent_reviews]
            recent_performance = statistics.mean(recent_ratings)
        
        # Adjust reputation based on recent performance
        if recent_performance > stats.average_rating:
            reputation_score += 0.2  # Improving performance
        elif recent_performance < stats.average_rating and recent_performance > 0:
            reputation_score -= 0.2  # Declining performance
        
        # Role-specific adjustments
        completion_rate = None
        response_rate = None
        
        if user.role == UserRole.WORKER:
            # Calculate completion rate for workers
            total_bookings = self.db.query(Booking).filter(
                Booking.worker_id == user.worker_profile.id
            ).count()
            
            completed_bookings = self.db.query(Booking).filter(
                Booking.worker_id == user.worker_profile.id,
                Booking.status == BookingStatus.COMPLETED
            ).count()
            
            if total_bookings > 0:
                completion_rate = completed_bookings / total_bookings
                if completion_rate >= 0.95:
                    reputation_score += 0.3
                elif completion_rate >= 0.85:
                    reputation_score += 0.1
                elif completion_rate < 0.7:
                    reputation_score -= 0.2
        
        elif user.role == UserRole.CLIENT:
            # Calculate response rate for clients (based on job applications)
            # This is a simplified metric - in practice, you'd track actual response times
            total_jobs = self.db.query(Job).filter(
                Job.client_id == user.client_profile.id
            ).count()
            
            if total_jobs > 0:
                response_rate = min(1.0, total_jobs / max(1, stats.total_reviews))
        
        # Cap the reputation score
        reputation_score = min(5.0, max(0.0, reputation_score))
        
        return UserReputationScore(
            user_id=user_id,
            overall_rating=stats.average_rating,
            total_reviews=stats.total_reviews,
            reputation_score=round(reputation_score, 2),
            rating_distribution=stats.rating_distribution,
            recent_performance=round(recent_performance, 2),
            completion_rate=round(completion_rate, 2) if completion_rate else None,
            response_rate=round(response_rate, 2) if response_rate else None
        )

    def moderate_review(self, review_id: int, action: str, moderator_id: int, reason: Optional[str] = None) -> Review:
        """Moderate a review (approve or reject)"""
        
        review = self.db.query(Review).filter(
            Review.id == review_id,
            Review.status == ReviewStatus.PENDING
        ).first()
        
        if not review:
            raise ValueError("Review not found or already moderated")
        
        if action == "approve":
            review.status = ReviewStatus.APPROVED
            # Send notification to reviewee
            self.notification_service.create_notification(
                user_id=review.reviewee_id,
                title="Review Approved",
                message="Your review has been approved and is now visible",
                notification_type="review",
                data={"review_id": review.id}
            )
        elif action == "reject":
            review.status = ReviewStatus.REJECTED
            # Send notification to reviewer
            self.notification_service.create_notification(
                user_id=review.reviewer_id,
                title="Review Rejected",
                message=f"Your review was rejected. Reason: {reason or 'Policy violation'}",
                notification_type="review",
                data={"review_id": review.id, "reason": reason}
            )
        else:
            raise ValueError("Invalid action. Must be 'approve' or 'reject'")
        
        self.db.commit()
        self.db.refresh(review)
        
        # Update user ratings if approved
        if action == "approve":
            self._update_user_rating(review.reviewee_id)
        
        return review

    def report_review(self, review_id: int, reporter_id: int, reason: str, description: Optional[str] = None):
        """Report a review for inappropriate content"""
        
        review = self.db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise ValueError("Review not found")
        
        # Check if already reported by this user
        # Note: You'd need to create a ReviewReport model for this
        # For now, we'll just create a notification to admins
        
        self.notification_service.create_notification(
            user_id=1,  # Assuming admin user ID is 1
            title="Review Reported",
            message=f"Review #{review_id} reported for: {reason}",
            notification_type="review",
            data={
                "review_id": review_id,
                "reporter_id": reporter_id,
                "reason": reason,
                "description": description
            }
        )
        
        return {"message": "Review reported successfully"}

    def get_review_analytics(self, period: str = "month") -> ReviewAnalytics:
        """Get review analytics for the platform"""
        
        # Calculate date range based on period
        now = datetime.utcnow()
        if period == "week":
            start_date = now - timedelta(weeks=1)
        elif period == "month":
            start_date = now - timedelta(days=30)
        elif period == "quarter":
            start_date = now - timedelta(days=90)
        elif period == "year":
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)
        
        # Get reviews in period
        reviews = self.db.query(Review).filter(
            Review.created_at >= start_date,
            Review.status == ReviewStatus.APPROVED
        ).all()
        
        total_reviews = len(reviews)
        average_rating = statistics.mean([r.rating for r in reviews]) if reviews else 0.0
        
        # Rating trend (daily aggregation)
        rating_trend = []
        current_date = start_date.date()
        end_date = now.date()
        
        while current_date <= end_date:
            day_reviews = [r for r in reviews if r.created_at.date() == current_date]
            if day_reviews:
                day_rating = statistics.mean([r.rating for r in day_reviews])
                rating_trend.append({
                    "date": current_date.isoformat(),
                    "rating": round(day_rating, 2),
                    "count": len(day_reviews)
                })
            current_date += timedelta(days=1)
        
        # Top rated users
        user_ratings = defaultdict(list)
        for review in reviews:
            user_ratings[review.reviewee_id].append(review.rating)
        
        top_rated_users = []
        for user_id, ratings in user_ratings.items():
            if len(ratings) >= 3:  # Minimum 3 reviews
                avg_rating = statistics.mean(ratings)
                user = self.db.query(User).filter(User.id == user_id).first()
                if user:
                    top_rated_users.append({
                        "user_id": user_id,
                        "name": f"{user.first_name} {user.last_name}",
                        "rating": round(avg_rating, 2),
                        "review_count": len(ratings)
                    })
        
        top_rated_users.sort(key=lambda x: x["rating"], reverse=True)
        top_rated_users = top_rated_users[:10]  # Top 10
        
        # Review volume trend
        review_volume_trend = []
        current_date = start_date.date()
        
        while current_date <= end_date:
            day_count = len([r for r in reviews if r.created_at.date() == current_date])
            review_volume_trend.append({
                "date": current_date.isoformat(),
                "count": day_count
            })
            current_date += timedelta(days=1)
        
        return ReviewAnalytics(
            period=period,
            total_reviews=total_reviews,
            average_rating=round(average_rating, 2),
            rating_trend=rating_trend,
            top_rated_users=top_rated_users,
            review_volume_trend=review_volume_trend
        )

    def _update_user_rating(self, user_id: int):
        """Update the cached rating for a user based on approved reviews"""
        
        # Get approved reviews for the user
        approved_reviews = self.db.query(Review).filter(
            Review.reviewee_id == user_id,
            Review.status == ReviewStatus.APPROVED
        ).all()
        
        if not approved_reviews:
            return
        
        # Calculate new average rating
        ratings = [review.rating for review in approved_reviews]
        average_rating = statistics.mean(ratings)
        
        # Update user profile rating
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        
        if user.role == UserRole.WORKER and user.worker_profile:
            user.worker_profile.rating = round(average_rating, 2)
            user.worker_profile.total_jobs = len(approved_reviews)
        elif user.role == UserRole.CLIENT and user.client_profile:
            user.client_profile.rating = round(average_rating, 2)
            user.client_profile.total_jobs_posted = len(approved_reviews)
        
        self.db.commit()

    def delete_review(self, review_id: int, user_id: int) -> bool:
        """Delete a review (only by reviewer and only if pending or within 24 hours)"""
        
        review = self.db.query(Review).filter(
            Review.id == review_id,
            Review.reviewer_id == user_id
        ).first()
        
        if not review:
            return False
        
        # Check if review can be deleted (pending or within 24 hours)
        from datetime import datetime, timedelta
        can_delete = (
            review.status == ReviewStatus.PENDING or 
            (review.status == ReviewStatus.APPROVED and 
             review.created_at > datetime.utcnow() - timedelta(hours=24))
        )
        
        if not can_delete:
            return False
        
        self.db.delete(review)
        self.db.commit()
        
        # Update user ratings
        self._update_user_rating(review.reviewee_id)
        
        return True

    def can_review_booking(self, booking_id: int, user_id: int) -> bool:
        """Check if a user can review a specific booking"""
        
        booking = self.db.query(Booking).filter(
            Booking.id == booking_id,
            Booking.status == BookingStatus.COMPLETED
        ).first()
        
        if not booking:
            return False
        
        # Check if user is part of the booking
        if user_id not in [booking.client.user_id, booking.worker.user_id]:
            return False
        
        # Check if user has already reviewed this booking
        existing_review = self.db.query(Review).filter(
            Review.booking_id == booking_id,
            Review.reviewer_id == user_id
        ).first()
        
        return existing_review is None
