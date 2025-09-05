from typing import List, Optional, Dict, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, text
from datetime import datetime, timedelta
from collections import defaultdict
import json
import math
from statistics import mean, median

from app.db.models import (
    Job, JobApplication, WorkerProfile, ClientProfile, User, Review, Booking,
    JobStatus, ApplicationStatus, BookingStatus, UserRole
)
from app.schemas.recommendations import (
    JobRecommendation, WorkerRecommendation, PriceSuggestion,
    RecommendationFeedback, JobAlert
)
# ML service import - optional dependency
try:
    from app.services.ml_recommendation_service import MLRecommendationService
    ML_AVAILABLE = True
except ImportError:
    MLRecommendationService = None
    ML_AVAILABLE = False


class RecommendationService:
    def __init__(self, db: Session):
        self.db = db
        self.skill_weight = 0.4
        self.location_weight = 0.3
        self.rating_weight = 0.2
        self.experience_weight = 0.1
        self.ml_service = MLRecommendationService(db) if ML_AVAILABLE else None

    def get_job_recommendations_for_worker(
        self, 
        worker_id: int, 
        limit: int = 10
    ) -> List[JobRecommendation]:
        """
        Get personalized job recommendations for a worker based on:
        - Skills and service categories
        - Location proximity
        - Past work history
        - Rating and experience level
        """
        worker_profile = self.db.query(WorkerProfile).options(
            joinedload(WorkerProfile.user)
        ).filter(WorkerProfile.id == worker_id).first()
        
        if not worker_profile:
            return []
        
        # Get worker's skills and categories
        worker_skills = set(worker_profile.skills or [])
        worker_categories = set(worker_profile.service_categories or [])
        
        # Get available jobs (excluding already applied)
        applied_job_ids = self.db.query(JobApplication.job_id).filter(
            JobApplication.worker_id == worker_id
        ).subquery()
        
        available_jobs = self.db.query(Job).options(
            joinedload(Job.client).joinedload(ClientProfile.user)
        ).filter(
            and_(
                Job.status == JobStatus.OPEN,
                ~Job.id.in_(applied_job_ids)
            )
        ).all()
        
        # Calculate recommendation scores
        recommendations = []
        for job in available_jobs:
            # Use ML model if available, otherwise fall back to rule-based scoring
            ml_score = None
            if self.ml_service:
                ml_score = self.ml_service.predict_job_recommendation_score(job.id, worker_id)
            
            if ml_score is not None:
                score = ml_score
            else:
                score = self._calculate_job_recommendation_score(
                    job, worker_profile, worker_skills, worker_categories
                )
            
            if score > 0.3:  # Minimum threshold
                recommendations.append(JobRecommendation(
                    job_id=job.id,
                    job=job,
                    score=score,
                    reasons=self._generate_recommendation_reasons(
                        job, worker_profile, worker_skills, worker_categories
                    )
                ))
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x.score, reverse=True)
        return recommendations[:limit]

    def get_worker_suggestions_for_job(
        self, 
        job_id: int, 
        client_id: int, 
        limit: int = 10
    ) -> List[WorkerRecommendation]:
        """
        Get suggested workers for a job based on:
        - Category expertise and skills match
        - Rating and past performance
        - Location proximity
        - Availability and response rate
        """
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job or job.client_id != client_id:
            return []
        
        # Get workers in the job category with good ratings
        suitable_workers = self.db.query(WorkerProfile).options(
            joinedload(WorkerProfile.user)
        ).filter(
            and_(
                WorkerProfile.service_categories.contains([job.category]),
                WorkerProfile.rating >= 3.0,
                WorkerProfile.user.has(User.is_verified == True)
            )
        ).all()
        
        # Calculate recommendation scores
        recommendations = []
        for worker in suitable_workers:
            # Skip if worker already applied
            existing_application = self.db.query(JobApplication).filter(
                and_(
                    JobApplication.job_id == job_id,
                    JobApplication.worker_id == worker.id
                )
            ).first()
            
            if existing_application:
                continue
            
            # Use ML model if available, otherwise fall back to rule-based scoring
            ml_score = None
            if self.ml_service:
                ml_score = self.ml_service.predict_worker_recommendation_score(worker.id, job_id)
            
            if ml_score is not None:
                score = ml_score
            else:
                score = self._calculate_worker_recommendation_score(job, worker)
            
            if score > 0.3:  # Minimum threshold
                recommendations.append(WorkerRecommendation(
                    worker_id=worker.id,
                    worker=worker,
                    score=score,
                    reasons=self._generate_worker_recommendation_reasons(job, worker),
                    estimated_rate=self._estimate_worker_rate_for_job(job, worker)
                ))
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x.score, reverse=True)
        return recommendations[:limit]

    def get_price_suggestions(self, job_category: str, location: str) -> PriceSuggestion:
        """
        Generate market-based price suggestions using historical data
        """
        # Get completed jobs in the same category and location
        completed_jobs = self.db.query(Job).join(Booking).filter(
            and_(
                Job.category == job_category,
                Job.location.ilike(f"%{location}%"),
                Booking.status == BookingStatus.COMPLETED,
                Job.created_at >= datetime.utcnow() - timedelta(days=365)  # Last year
            )
        ).all()
        
        if not completed_jobs:
            # Fallback to category-wide data
            completed_jobs = self.db.query(Job).join(Booking).filter(
                and_(
                    Job.category == job_category,
                    Booking.status == BookingStatus.COMPLETED,
                    Job.created_at >= datetime.utcnow() - timedelta(days=365)
                )
            ).all()
        
        if not completed_jobs:
            return PriceSuggestion(
                suggested_min=50.0,
                suggested_max=200.0,
                market_average=125.0,
                confidence_level=0.1,
                sample_size=0
            )
        
        # Calculate statistics
        rates = []
        for job in completed_jobs:
            # Use the midpoint of budget range as proxy for actual rate
            avg_budget = (float(job.budget_min) + float(job.budget_max)) / 2
            rates.append(avg_budget)
        
        market_average = mean(rates)
        market_median = median(rates)
        
        # Calculate percentiles for suggestions
        rates.sort()
        p25 = rates[len(rates) // 4]
        p75 = rates[3 * len(rates) // 4]
        
        # Confidence based on sample size
        confidence = min(0.9, len(rates) / 100)
        
        return PriceSuggestion(
            suggested_min=max(p25 * 0.9, market_average * 0.7),
            suggested_max=min(p75 * 1.1, market_average * 1.3),
            market_average=market_average,
            market_median=market_median,
            confidence_level=confidence,
            sample_size=len(rates)
        )

    def create_job_alerts_for_workers(self, job_id: int) -> List[JobAlert]:
        """
        Create proactive job alerts for relevant workers when a new job is posted
        """
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return []
        
        # Find workers who match the job criteria
        matching_workers = self.db.query(WorkerProfile).options(
            joinedload(WorkerProfile.user)
        ).filter(
            and_(
                WorkerProfile.service_categories.contains([job.category]),
                WorkerProfile.user.has(User.is_verified == True),
                WorkerProfile.user.has(User.is_active == True)
            )
        ).all()
        
        alerts = []
        for worker in matching_workers:
            # Calculate relevance score
            score = self._calculate_job_alert_relevance(job, worker)
            
            if score > 0.5:  # High relevance threshold for alerts
                alert = JobAlert(
                    worker_id=worker.id,
                    job_id=job.id,
                    relevance_score=score,
                    alert_type="new_job_match",
                    message=f"New {job.category} job posted in {job.location}",
                    created_at=datetime.utcnow()
                )
                alerts.append(alert)
        
        return alerts

    def record_recommendation_feedback(
        self, 
        feedback: RecommendationFeedback
    ) -> bool:
        """
        Record user feedback on recommendations to improve future suggestions
        """
        try:
            # Store feedback in database for learning
            feedback_record = {
                "user_id": feedback.user_id,
                "recommendation_type": feedback.recommendation_type,
                "item_id": feedback.item_id,
                "action": feedback.action,
                "rating": feedback.rating,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # For now, store in a simple JSON format
            # In production, you'd use a proper ML pipeline
            self._store_feedback_for_learning(feedback_record)
            
            return True
        except Exception:
            return False

    def _calculate_job_recommendation_score(
        self, 
        job: Job, 
        worker: WorkerProfile, 
        worker_skills: set, 
        worker_categories: set
    ) -> float:
        """Calculate recommendation score for a job-worker pair"""
        score = 0.0
        
        # Skill/Category match (40% weight)
        if job.category in worker_categories:
            score += self.skill_weight * 1.0
        
        # Check skill overlap in job requirements
        job_requirements = job.requirements or {}
        required_skills = set(job_requirements.get('skills', []))
        if required_skills and worker_skills:
            skill_overlap = len(required_skills.intersection(worker_skills))
            skill_match_ratio = skill_overlap / len(required_skills) if required_skills else 0
            score += self.skill_weight * 0.5 * skill_match_ratio
        
        # Location proximity (30% weight)
        # Simplified - in production use proper geocoding
        location_score = 0.8 if job.location.lower() in worker.location.lower() else 0.3
        score += self.location_weight * location_score
        
        # Worker rating (20% weight)
        rating_score = min(worker.rating / 5.0, 1.0) if worker.rating else 0.5
        score += self.rating_weight * rating_score
        
        # Experience level (10% weight)
        experience_score = min(worker.total_jobs / 50.0, 1.0)
        score += self.experience_weight * experience_score
        
        # Budget compatibility
        worker_rate = float(worker.hourly_rate) if worker.hourly_rate else 0
        if worker_rate > 0:
            job_budget_avg = (float(job.budget_min) + float(job.budget_max)) / 2
            if job.budget_min <= worker_rate <= job.budget_max:
                score += 0.1  # Bonus for budget match
            elif abs(worker_rate - job_budget_avg) / job_budget_avg > 0.5:
                score -= 0.2  # Penalty for large budget mismatch
        
        return min(score, 1.0)

    def _calculate_worker_recommendation_score(self, job: Job, worker: WorkerProfile) -> float:
        """Calculate recommendation score for a worker-job pair"""
        score = 0.0
        
        # Category expertise (40% weight)
        if job.category in (worker.service_categories or []):
            score += 0.4
        
        # Rating and reviews (30% weight)
        rating_score = min(worker.rating / 5.0, 1.0) if worker.rating else 0.5
        score += 0.3 * rating_score
        
        # Experience (20% weight)
        experience_score = min(worker.total_jobs / 50.0, 1.0)
        score += 0.2 * experience_score
        
        # Rate compatibility (10% weight)
        if worker.hourly_rate:
            worker_rate = float(worker.hourly_rate)
            job_budget_avg = (float(job.budget_min) + float(job.budget_max)) / 2
            
            if job.budget_min <= worker_rate <= job.budget_max:
                score += 0.1
            elif worker_rate < job.budget_min:
                score += 0.05  # Slightly lower score for cheaper workers
        
        return min(score, 1.0)

    def _calculate_job_alert_relevance(self, job: Job, worker: WorkerProfile) -> float:
        """Calculate how relevant a job alert is for a worker"""
        relevance = 0.0
        
        # Category match is essential for alerts
        if job.category not in (worker.service_categories or []):
            return 0.0
        
        relevance += 0.5  # Base relevance for category match
        
        # Location proximity
        if job.location.lower() in worker.location.lower():
            relevance += 0.3
        
        # Budget compatibility
        if worker.hourly_rate:
            worker_rate = float(worker.hourly_rate)
            if job.budget_min <= worker_rate <= job.budget_max:
                relevance += 0.2
        
        return min(relevance, 1.0)

    def _generate_recommendation_reasons(
        self, 
        job: Job, 
        worker: WorkerProfile, 
        worker_skills: set, 
        worker_categories: set
    ) -> List[str]:
        """Generate human-readable reasons for job recommendation"""
        reasons = []
        
        if job.category in worker_categories:
            reasons.append(f"Matches your {job.category} expertise")
        
        if job.location.lower() in worker.location.lower():
            reasons.append("Located in your area")
        
        if worker.rating >= 4.0:
            reasons.append("Your high rating makes you competitive")
        
        job_requirements = job.requirements or {}
        required_skills = set(job_requirements.get('skills', []))
        if required_skills and worker_skills:
            matching_skills = required_skills.intersection(worker_skills)
            if matching_skills:
                reasons.append(f"You have required skills: {', '.join(list(matching_skills)[:3])}")
        
        return reasons

    def _generate_worker_recommendation_reasons(self, job: Job, worker: WorkerProfile) -> List[str]:
        """Generate human-readable reasons for worker recommendation"""
        reasons = []
        
        if worker.rating >= 4.5:
            reasons.append(f"Highly rated ({worker.rating:.1f}/5.0)")
        
        if worker.total_jobs >= 10:
            reasons.append(f"Experienced ({worker.total_jobs} completed jobs)")
        
        if job.category in (worker.service_categories or []):
            reasons.append(f"Specializes in {job.category}")
        
        return reasons

    def _estimate_worker_rate_for_job(self, job: Job, worker: WorkerProfile) -> Optional[float]:
        """Estimate what a worker might charge for a specific job"""
        if worker.hourly_rate:
            return float(worker.hourly_rate)
        
        # Fallback to market average for the category
        price_suggestion = self.get_price_suggestions(job.category, job.location)
        return price_suggestion.market_average

    def _store_feedback_for_learning(self, feedback_record: Dict) -> None:
        """Store feedback for machine learning model improvement"""
        # In production, this would integrate with an ML pipeline
        # For now, we'll store in a simple format that can be processed later
        
        try:
            # Create a simple feedback log file
            import os
            feedback_dir = "backend/ml_data"
            os.makedirs(feedback_dir, exist_ok=True)
            
            feedback_file = os.path.join(feedback_dir, "recommendation_feedback.jsonl")
            with open(feedback_file, "a") as f:
                f.write(json.dumps(feedback_record) + "\n")
        except Exception:
            # Fail silently for now
            pass