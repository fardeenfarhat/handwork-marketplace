from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc
from fastapi import HTTPException, status

from app.db.models import (
    User, WorkerProfile, ClientProfile, Job, JobApplication, Booking, 
    Payment, PaymentDispute, Review, Notification, PaymentTransaction,
    WorkerPayout,
    UserRole, JobStatus, PaymentStatus, ReviewStatus, DisputeStatus, KYCStatus
)
from app.schemas.admin import (
    UserOverview, UserDetail, JobOverview, JobDetail, PaymentOverview, PaymentDetail,
    DisputeOverview, DisputeDetail, ReviewOverview, ReviewDetail, KYCDocument, KYCDocumentItem,
    PlatformMetrics, UserGrowthData, RevenueData, JobCategoryStats, TopPerformers,
    UserFilters, JobFilters, PaymentFilters, DisputeFilters, ReviewFilters
)

class AdminService:
    def __init__(self, db: Session):
        self.db = db

    # User Management
    def get_users(
        self, 
        filters: UserFilters, 
        page: int = 1, 
        size: int = 20
    ) -> Tuple[List[UserOverview], int]:
        """Get paginated list of users with filters"""
        query = self.db.query(User)
        
        # Apply filters
        if filters.role:
            query = query.filter(User.role == filters.role)
        if filters.is_verified is not None:
            query = query.filter(User.is_verified == filters.is_verified)
        if filters.is_active is not None:
            query = query.filter(User.is_active == filters.is_active)
        if filters.created_after:
            query = query.filter(User.created_at >= filters.created_after)
        if filters.created_before:
            query = query.filter(User.created_at <= filters.created_before)
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        users = query.order_by(desc(User.created_at)).offset(offset).limit(size).all()
        
        # Convert to UserOverview with additional stats
        user_overviews = []
        for user in users:
            total_jobs = 0
            rating = 0.0
            
            if user.role == UserRole.WORKER and user.worker_profile:
                total_jobs = user.worker_profile.total_jobs
                rating = user.worker_profile.rating
            elif user.role == UserRole.CLIENT and user.client_profile:
                total_jobs = user.client_profile.total_jobs_posted
                rating = user.client_profile.rating
            
            user_overviews.append(UserOverview(
                id=user.id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role,
                is_verified=user.is_verified,
                is_active=user.is_active,
                created_at=user.created_at,
                total_jobs=total_jobs,
                rating=rating
            ))
        
        return user_overviews, total

    def get_user_detail(self, user_id: int) -> UserDetail:
        """Get detailed user information"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get profile information
        worker_profile = None
        client_profile = None
        total_jobs = 0
        total_earnings = 0.0
        total_spent = 0.0
        rating = 0.0
        total_reviews = 0
        
        if user.role == UserRole.WORKER and user.worker_profile:
            profile = user.worker_profile
            worker_profile = {
                "bio": profile.bio,
                "skills": profile.skills,
                "service_categories": profile.service_categories,
                "hourly_rate": float(profile.hourly_rate) if profile.hourly_rate else None,
                "location": profile.location,
                "kyc_status": profile.kyc_status,
                "portfolio_images": profile.portfolio_images
            }
            total_jobs = profile.total_jobs
            rating = profile.rating
            
            # Calculate earnings
            earnings = self.db.query(func.sum(Payment.worker_amount)).join(
                Booking, Payment.booking_id == Booking.id
            ).filter(
                Booking.worker_id == profile.id,
                Payment.status == PaymentStatus.RELEASED
            ).scalar()
            total_earnings = float(earnings) if earnings else 0.0
            
        elif user.role == UserRole.CLIENT and user.client_profile:
            profile = user.client_profile
            client_profile = {
                "company_name": profile.company_name,
                "description": profile.description,
                "location": profile.location
            }
            total_jobs = profile.total_jobs_posted
            rating = profile.rating
            
            # Calculate spending
            spent = self.db.query(func.sum(Payment.amount)).join(
                Booking, Payment.booking_id == Booking.id
            ).filter(
                Booking.client_id == profile.id,
                Payment.status.in_([PaymentStatus.HELD, PaymentStatus.RELEASED])
            ).scalar()
            total_spent = float(spent) if spent else 0.0
        
        # Get review count
        total_reviews = self.db.query(Review).filter(Review.reviewee_id == user.id).count()
        
        return UserDetail(
            id=user.id,
            email=user.email,
            phone=user.phone,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_verified=user.is_verified,
            is_active=user.is_active,
            email_verified=user.email_verified,
            phone_verified=user.phone_verified,
            created_at=user.created_at,
            updated_at=user.updated_at,
            worker_profile=worker_profile,
            client_profile=client_profile,
            total_jobs=total_jobs,
            total_earnings=total_earnings,
            total_spent=total_spent,
            rating=rating,
            total_reviews=total_reviews
        )

    def update_user_status(self, user_id: int, action: str, reason: Optional[str] = None) -> UserDetail:
        """Update user status (activate, deactivate, verify, suspend)"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if action == "activate":
            user.is_active = True
        elif action == "deactivate":
            user.is_active = False
        elif action == "verify":
            user.is_verified = True
            user.email_verified = True
        elif action == "suspend":
            user.is_active = False
            user.is_verified = False
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        # Create notification for user
        notification = Notification(
            user_id=user.id,
            title=f"Account {action}d",
            message=f"Your account has been {action}d by an administrator." + (f" Reason: {reason}" if reason else ""),
            type="job_update"  # Using existing enum value
        )
        self.db.add(notification)
        self.db.commit()
        
        return self.get_user_detail(user_id)

    # Job Management
    def get_jobs(
        self, 
        filters: JobFilters, 
        page: int = 1, 
        size: int = 20
    ) -> Tuple[List[JobOverview], int]:
        """Get paginated list of jobs with filters"""
        query = self.db.query(Job).join(ClientProfile, Job.client_id == ClientProfile.id).join(User, ClientProfile.user_id == User.id)
        
        # Apply filters
        if filters.status:
            query = query.filter(Job.status == filters.status)
        if filters.category:
            query = query.filter(Job.category == filters.category)
        if filters.created_after:
            query = query.filter(Job.created_at >= filters.created_after)
        if filters.created_before:
            query = query.filter(Job.created_at <= filters.created_before)
        if filters.min_budget:
            query = query.filter(Job.budget_min >= filters.min_budget)
        if filters.max_budget:
            query = query.filter(Job.budget_max <= filters.max_budget)
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    Job.title.ilike(search_term),
                    Job.description.ilike(search_term),
                    Job.location.ilike(search_term)
                )
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        jobs = query.order_by(desc(Job.created_at)).offset(offset).limit(size).all()
        
        # Convert to JobOverview
        job_overviews = []
        for job in jobs:
            client_user = self.db.query(User).join(ClientProfile).filter(ClientProfile.id == job.client_id).first()
            client_name = f"{client_user.first_name} {client_user.last_name}" if client_user else "Unknown"
            
            worker_name = None
            if job.status in [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS, JobStatus.COMPLETED]:
                booking = self.db.query(Booking).filter(Booking.job_id == job.id).first()
                if booking:
                    worker_user = self.db.query(User).join(WorkerProfile).filter(WorkerProfile.id == booking.worker_id).first()
                    worker_name = f"{worker_user.first_name} {worker_user.last_name}" if worker_user else "Unknown"
            
            applications_count = self.db.query(JobApplication).filter(JobApplication.job_id == job.id).count()
            
            job_overviews.append(JobOverview(
                id=job.id,
                title=job.title,
                category=job.category,
                status=job.status,
                budget_min=float(job.budget_min),
                budget_max=float(job.budget_max),
                location=job.location,
                client_name=client_name,
                worker_name=worker_name,
                created_at=job.created_at,
                applications_count=applications_count
            ))
        
        return job_overviews, total

    def get_job_detail(self, job_id: int) -> JobDetail:
        """Get detailed job information"""
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Get client information
        client_profile = self.db.query(ClientProfile).filter(ClientProfile.id == job.client_id).first()
        client_user = self.db.query(User).filter(User.id == client_profile.user_id).first()
        client = UserOverview(
            id=client_user.id,
            email=client_user.email,
            first_name=client_user.first_name,
            last_name=client_user.last_name,
            role=client_user.role,
            is_verified=client_user.is_verified,
            is_active=client_user.is_active,
            created_at=client_user.created_at,
            total_jobs=client_profile.total_jobs_posted,
            rating=client_profile.rating
        )
        
        # Get worker information if assigned
        worker = None
        booking = self.db.query(Booking).filter(Booking.job_id == job.id).first()
        if booking:
            worker_profile = self.db.query(WorkerProfile).filter(WorkerProfile.id == booking.worker_id).first()
            worker_user = self.db.query(User).filter(User.id == worker_profile.user_id).first()
            worker = UserOverview(
                id=worker_user.id,
                email=worker_user.email,
                first_name=worker_user.first_name,
                last_name=worker_user.last_name,
                role=worker_user.role,
                is_verified=worker_user.is_verified,
                is_active=worker_user.is_active,
                created_at=worker_user.created_at,
                total_jobs=worker_profile.total_jobs,
                rating=worker_profile.rating
            )
        
        applications_count = self.db.query(JobApplication).filter(JobApplication.job_id == job.id).count()
        messages_count = self.db.query(func.count()).select_from(
            self.db.query(Job).join(Booking).join(Payment).join(PaymentDispute)
        ).filter(Job.id == job.id).scalar() or 0
        
        return JobDetail(
            id=job.id,
            title=job.title,
            description=job.description,
            category=job.category,
            status=job.status,
            budget_min=float(job.budget_min),
            budget_max=float(job.budget_max),
            location=job.location,
            preferred_date=job.preferred_date,
            created_at=job.created_at,
            updated_at=job.updated_at,
            client=client,
            worker=worker,
            applications_count=applications_count,
            messages_count=messages_count
        )

    # Payment Management
    def get_payments(
        self, 
        filters: PaymentFilters, 
        page: int = 1, 
        size: int = 20
    ) -> Tuple[List[PaymentOverview], int]:
        """Get paginated list of payments with filters"""
        query = self.db.query(Payment).join(Booking).join(Job)
        
        # Apply filters
        if filters.status:
            query = query.filter(Payment.status == filters.status)
        if filters.payment_method:
            query = query.filter(Payment.payment_method == filters.payment_method)
        if filters.created_after:
            query = query.filter(Payment.created_at >= filters.created_after)
        if filters.created_before:
            query = query.filter(Payment.created_at <= filters.created_before)
        if filters.min_amount:
            query = query.filter(Payment.amount >= filters.min_amount)
        if filters.max_amount:
            query = query.filter(Payment.amount <= filters.max_amount)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        payments = query.order_by(desc(Payment.created_at)).offset(offset).limit(size).all()
        
        # Convert to PaymentOverview
        payment_overviews = []
        for payment in payments:
            booking = payment.booking
            job = booking.job
            
            # Get client and worker names
            client_profile = self.db.query(ClientProfile).filter(ClientProfile.id == booking.client_id).first()
            client_user = self.db.query(User).filter(User.id == client_profile.user_id).first()
            client_name = f"{client_user.first_name} {client_user.last_name}"
            
            worker_profile = self.db.query(WorkerProfile).filter(WorkerProfile.id == booking.worker_id).first()
            worker_user = self.db.query(User).filter(User.id == worker_profile.user_id).first()
            worker_name = f"{worker_user.first_name} {worker_user.last_name}"
            
            # Get associated worker payout if exists
            # Look for payout that was created for THIS specific payment
            # The payment_id is stored in payout_metadata JSON field
            # Since SQLite doesn't have native JSON operators, we'll filter in Python
            payouts = self.db.query(WorkerPayout).filter(
                WorkerPayout.worker_id == booking.worker_id
            ).all()
            
            payout = None
            for p in payouts:
                if p.payout_metadata and p.payout_metadata.get('payment_id') == payment.id:
                    payout = p
                    break
            
            payout_status = payout.status.value if payout else None
            payout_id = payout.id if payout else None
            
            payment_overviews.append(PaymentOverview(
                id=payment.id,
                booking_id=payment.booking_id,
                amount=float(payment.amount),
                platform_fee=float(payment.platform_fee),
                worker_amount=float(payment.worker_amount),
                status=payment.status,
                payment_method=payment.payment_method.value,
                created_at=payment.created_at,
                client_name=client_name,
                worker_name=worker_name,
                job_title=job.title,
                payout_status=payout_status,
                payout_id=payout_id
            ))
        
        return payment_overviews, total

    # Analytics
    def get_platform_metrics(self) -> PlatformMetrics:
        """Get overall platform metrics"""
        # User metrics
        total_users = self.db.query(User).count()
        total_workers = self.db.query(User).filter(User.role == UserRole.WORKER).count()
        total_clients = self.db.query(User).filter(User.role == UserRole.CLIENT).count()
        
        # Active users in last 30 days (simplified - would need login tracking in real app)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users_30d = self.db.query(User).filter(User.created_at >= thirty_days_ago).count()
        
        # Job metrics
        total_jobs = self.db.query(Job).count()
        active_jobs = self.db.query(Job).filter(Job.status.in_([JobStatus.OPEN, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS])).count()
        completed_jobs = self.db.query(Job).filter(Job.status == JobStatus.COMPLETED).count()
        
        # Payment metrics
        total_payments_result = self.db.query(func.sum(Payment.amount)).filter(
            Payment.status.in_([PaymentStatus.HELD, PaymentStatus.RELEASED])
        ).scalar()
        total_payments = float(total_payments_result) if total_payments_result else 0.0
        
        platform_revenue_result = self.db.query(func.sum(Payment.platform_fee)).filter(
            Payment.status == PaymentStatus.RELEASED
        ).scalar()
        platform_revenue = float(platform_revenue_result) if platform_revenue_result else 0.0
        
        # Calculate rates
        average_job_value = total_payments / max(completed_jobs, 1)
        user_growth_rate = (active_users_30d / max(total_users - active_users_30d, 1)) * 100 if total_users > active_users_30d else 0
        job_completion_rate = (completed_jobs / max(total_jobs, 1)) * 100
        
        return PlatformMetrics(
            total_users=total_users,
            total_workers=total_workers,
            total_clients=total_clients,
            active_users_30d=active_users_30d,
            total_jobs=total_jobs,
            active_jobs=active_jobs,
            completed_jobs=completed_jobs,
            total_payments=total_payments,
            platform_revenue=platform_revenue,
            average_job_value=average_job_value,
            user_growth_rate=user_growth_rate,
            job_completion_rate=job_completion_rate
        )

    def get_job_categories_stats(self) -> List[JobCategoryStats]:
        """Get statistics by job category"""
        categories = self.db.query(
            Job.category,
            func.count(Job.id).label('job_count'),
            func.avg((Job.budget_min + Job.budget_max) / 2).label('avg_budget'),
            func.count(func.nullif(Job.status != JobStatus.COMPLETED, True)).label('completed_count')
        ).group_by(Job.category).all()
        
        stats = []
        for category, job_count, avg_budget, completed_count in categories:
            completion_rate = (completed_count / job_count) * 100 if job_count > 0 else 0
            stats.append(JobCategoryStats(
                category=category,
                job_count=job_count,
                avg_budget=float(avg_budget) if avg_budget else 0.0,
                completion_rate=completion_rate
            ))
        
        return stats

    # Dispute Management
    def get_disputes(
        self, 
        filters: DisputeFilters, 
        page: int = 1, 
        size: int = 20
    ) -> Tuple[List[DisputeOverview], int]:
        """Get paginated list of disputes with filters"""
        query = self.db.query(PaymentDispute).join(Payment).join(Booking).join(Job)
        
        # Apply filters
        if filters.status:
            query = query.filter(PaymentDispute.status == filters.status)
        if filters.created_after:
            query = query.filter(PaymentDispute.created_at >= filters.created_after)
        if filters.created_before:
            query = query.filter(PaymentDispute.created_at <= filters.created_before)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        disputes = query.order_by(desc(PaymentDispute.created_at)).offset(offset).limit(size).all()
        
        # Convert to DisputeOverview
        dispute_overviews = []
        for dispute in disputes:
            payment = dispute.payment
            booking = payment.booking
            job = booking.job
            
            initiator = self.db.query(User).filter(User.id == dispute.initiated_by).first()
            initiator_name = f"{initiator.first_name} {initiator.last_name}"
            
            dispute_overviews.append(DisputeOverview(
                id=dispute.id,
                payment_id=dispute.payment_id,
                reason=dispute.reason,
                status=dispute.status,
                initiated_by_name=initiator_name,
                created_at=dispute.created_at,
                job_title=job.title,
                amount=float(payment.amount)
            ))
        
        return dispute_overviews, total

    # Content Moderation
    def get_reviews_for_moderation(
        self, 
        filters: ReviewFilters, 
        page: int = 1, 
        size: int = 20
    ) -> Tuple[List[ReviewOverview], int]:
        """Get paginated list of reviews for moderation"""
        query = self.db.query(Review).join(Booking).join(Job)
        
        # Apply filters
        if filters.status:
            query = query.filter(Review.status == filters.status)
        if filters.min_rating:
            query = query.filter(Review.rating >= filters.min_rating)
        if filters.max_rating:
            query = query.filter(Review.rating <= filters.max_rating)
        if filters.created_after:
            query = query.filter(Review.created_at >= filters.created_after)
        if filters.created_before:
            query = query.filter(Review.created_at <= filters.created_before)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        reviews = query.order_by(desc(Review.created_at)).offset(offset).limit(size).all()
        
        # Convert to ReviewOverview
        review_overviews = []
        for review in reviews:
            booking = review.booking
            job = booking.job
            
            reviewer = self.db.query(User).filter(User.id == review.reviewer_id).first()
            reviewee = self.db.query(User).filter(User.id == review.reviewee_id).first()
            
            reviewer_name = f"{reviewer.first_name} {reviewer.last_name}"
            reviewee_name = f"{reviewee.first_name} {reviewee.last_name}"
            
            review_overviews.append(ReviewOverview(
                id=review.id,
                booking_id=review.booking_id,
                rating=review.rating,
                comment=review.comment,
                status=review.status,
                reviewer_name=reviewer_name,
                reviewee_name=reviewee_name,
                job_title=job.title,
                created_at=review.created_at
            ))
        
        return review_overviews, total

    def moderate_review(self, review_id: int, action: str, reason: Optional[str] = None) -> ReviewDetail:
        """Moderate a review (approve, reject, flag)"""
        review = self.db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        if action == "approve":
            review.status = ReviewStatus.APPROVED
        elif action == "reject":
            review.status = ReviewStatus.REJECTED
        elif action == "flag":
            # Keep as pending but add a flag (would need additional field in real implementation)
            pass
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        self.db.commit()
        self.db.refresh(review)
        
        return self.get_review_detail(review_id)

    def get_review_detail(self, review_id: int) -> ReviewDetail:
        """Get detailed review information"""
        review = self.db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        booking = review.booking
        job = booking.job
        
        # Get reviewer and reviewee information
        reviewer = self.db.query(User).filter(User.id == review.reviewer_id).first()
        reviewee = self.db.query(User).filter(User.id == review.reviewee_id).first()
        
        reviewer_overview = UserOverview(
            id=reviewer.id,
            email=reviewer.email,
            first_name=reviewer.first_name,
            last_name=reviewer.last_name,
            role=reviewer.role,
            is_verified=reviewer.is_verified,
            is_active=reviewer.is_active,
            created_at=reviewer.created_at
        )
        
        reviewee_overview = UserOverview(
            id=reviewee.id,
            email=reviewee.email,
            first_name=reviewee.first_name,
            last_name=reviewee.last_name,
            role=reviewee.role,
            is_verified=reviewee.is_verified,
            is_active=reviewee.is_active,
            created_at=reviewee.created_at
        )
        
        booking_data = {
            "id": booking.id,
            "job_title": job.title,
            "start_date": booking.start_date,
            "end_date": booking.end_date,
            "agreed_rate": float(booking.agreed_rate),
            "status": booking.status
        }
        
        return ReviewDetail(
            id=review.id,
            booking_id=review.booking_id,
            rating=review.rating,
            comment=review.comment,
            status=review.status,
            created_at=review.created_at,
            booking=booking_data,
            reviewer=reviewer_overview,
            reviewee=reviewee_overview
        )

    def get_kyc_documents(self, page: int = 1, size: int = 20) -> Tuple[List[KYCDocument], int]:
        """Get KYC documents for review"""
        query = self.db.query(WorkerProfile).join(User).filter(
            WorkerProfile.kyc_status == KYCStatus.PENDING
        )
        
        total = query.count()
        offset = (page - 1) * size
        profiles = query.order_by(desc(WorkerProfile.created_at)).offset(offset).limit(size).all()
        
        kyc_documents = []
        for profile in profiles:
            user = profile.user
            documents = profile.kyc_documents or []
            worker_name = f"{user.first_name} {user.last_name}"
            
            # Process documents into structured format
            document_items = []
            for doc in documents:
                if isinstance(doc, dict) and 'document_type' in doc and 'url' in doc:
                    document_items.append(KYCDocumentItem(
                        document_type=doc['document_type'],
                        url=doc['url'],
                        uploaded_at=doc.get('uploaded_at')
                    ))
                elif isinstance(doc, str):
                    # Handle legacy format (just URLs)
                    document_items.append(KYCDocumentItem(
                        document_type="unknown",
                        url=doc,
                        uploaded_at=None
                    ))
            
            # Create single entry per worker with all their documents
            kyc_documents.append(KYCDocument(
                id=profile.id,
                worker_name=worker_name,
                status=profile.kyc_status,
                documents=document_items,
                submitted_at=profile.created_at
            ))
        
        return kyc_documents, total

    def process_kyc(self, worker_profile_id: int, action: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Process KYC document (approve or reject)"""
        profile = self.db.query(WorkerProfile).filter(WorkerProfile.id == worker_profile_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Worker profile not found")
        
        if action == "approve":
            profile.kyc_status = KYCStatus.APPROVED
            # Also verify the user
            user = profile.user
            user.is_verified = True
        elif action == "reject":
            profile.kyc_status = KYCStatus.REJECTED
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        self.db.commit()
        
        # Create notification for worker
        notification = Notification(
            user_id=profile.user_id,
            title=f"KYC {action}d",
            message=f"Your KYC verification has been {action}d." + (f" Reason: {reason}" if reason else ""),
            type="job_update"
        )
        self.db.add(notification)
        self.db.commit()
        
        return {"status": "success", "message": f"KYC {action}d successfully"}