from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text
from math import radians, cos, sin, asin, sqrt
from datetime import datetime

from app.db.models import (
    Job, JobApplication, WorkerProfile, ClientProfile, User, 
    JobStatus, ApplicationStatus, UserRole
)
from app.schemas.jobs import (
    JobCreate, JobUpdate, JobFilters, JobApplicationCreate, 
    JobApplicationUpdate, JobInvitationCreate
)


class JobService:
    def __init__(self, db: Session):
        self.db = db

    def create_job(self, job_data: JobCreate, client_id: int) -> Job:
        """Create a new job posting"""
        job = Job(
            client_id=client_id,
            title=job_data.title,
            description=job_data.description,
            category=job_data.category.value,
            budget_min=job_data.budget_min,
            budget_max=job_data.budget_max,
            location=job_data.location,
            preferred_date=job_data.preferred_date,
            requirements=job_data.requirements or {}
        )
        
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        
        # Update client's total jobs posted count
        client_profile = self.db.query(ClientProfile).filter(
            ClientProfile.id == client_id
        ).first()
        if client_profile:
            client_profile.total_jobs_posted += 1
            self.db.commit()
        
        return job

    def get_job_by_id(self, job_id: int, user_id: Optional[int] = None) -> Optional[Job]:
        """Get a job by ID with related data"""
        try:
            query = self.db.query(Job).options(
                joinedload(Job.client).joinedload(ClientProfile.user),
                joinedload(Job.applications).joinedload(JobApplication.worker).joinedload(WorkerProfile.user)
            ).filter(Job.id == job_id)
            
            job = query.first()
            
            if job and user_id:
                # Calculate distance if user has location
                user = self.db.query(User).filter(User.id == user_id).first()
                if user and user.role == UserRole.WORKER:
                    worker_profile = self.db.query(WorkerProfile).filter(
                        WorkerProfile.user_id == user_id
                    ).first()
                    if worker_profile and worker_profile.location:
                        # This is a simplified distance calculation
                        # In production, you'd use proper geocoding services
                        job.distance_km = self._calculate_distance_placeholder(
                            job.location, worker_profile.location
                        )
            
            return job
        except Exception:
            # Handle database errors gracefully
            return None

    def update_job(self, job_id: int, job_data: JobUpdate, client_id: int) -> Optional[Job]:
        """Update a job (only by the job owner)"""
        job = self.db.query(Job).filter(
            and_(Job.id == job_id, Job.client_id == client_id)
        ).first()
        
        if not job:
            return None
        
        # Update fields if provided
        update_data = job_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'category' and value:
                setattr(job, field, value.value)
            else:
                setattr(job, field, value)
        
        job.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(job)
        
        return job

    def update_job_status(self, job_id: int, status: JobStatus, user_id: int) -> Optional[Job]:
        """Update job status (by client or assigned worker)"""
        job = self.db.query(Job).options(
            joinedload(Job.client)
        ).filter(Job.id == job_id).first()
        
        if not job:
            return None
        
        # Check permissions
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        can_update = False
        
        # Client can update their own jobs
        if user.role == UserRole.CLIENT and job.client.user_id == user_id:
            can_update = True
        
        # Worker can update if they have an accepted application
        elif user.role == UserRole.WORKER:
            worker_profile = self.db.query(WorkerProfile).filter(
                WorkerProfile.user_id == user_id
            ).first()
            if worker_profile:
                accepted_application = self.db.query(JobApplication).filter(
                    and_(
                        JobApplication.job_id == job_id,
                        JobApplication.worker_id == worker_profile.id,
                        JobApplication.status == ApplicationStatus.ACCEPTED
                    )
                ).first()
                if accepted_application:
                    can_update = True
        
        if not can_update:
            return None
        
        job.status = status
        job.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(job)
        
        return job

    def list_jobs(self, filters: JobFilters, user_id: Optional[int] = None) -> Tuple[List[Job], int]:
        """List jobs with filtering and pagination"""
        query = self.db.query(Job).options(
            joinedload(Job.client).joinedload(ClientProfile.user)
        )
        
        # Apply filters
        if filters.category:
            query = query.filter(Job.category == filters.category.value)
        
        if filters.budget_min:
            query = query.filter(Job.budget_max >= filters.budget_min)
        
        if filters.budget_max:
            query = query.filter(Job.budget_min <= filters.budget_max)
        
        if filters.location:
            query = query.filter(Job.location.ilike(f"%{filters.location}%"))
        
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    Job.title.ilike(search_term),
                    Job.description.ilike(search_term)
                )
            )
        
        if filters.status:
            query = query.filter(Job.status == filters.status)
        
        # For workers, exclude jobs they've already applied to
        if user_id:
            user = self.db.query(User).filter(User.id == user_id).first()
            if user and user.role == UserRole.WORKER:
                worker_profile = self.db.query(WorkerProfile).filter(
                    WorkerProfile.user_id == user_id
                ).first()
                if worker_profile:
                    # Exclude jobs with existing applications from this worker
                    applied_job_ids = self.db.query(JobApplication.job_id).filter(
                        JobApplication.worker_id == worker_profile.id
                    ).subquery()
                    query = query.filter(~Job.id.in_(applied_job_ids))
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination
        offset = (filters.page - 1) * filters.limit
        jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(filters.limit).all()
        
        # Add distance calculation for location-based filtering
        if filters.latitude and filters.longitude and user_id:
            for job in jobs:
                job.distance_km = self._calculate_distance_from_coordinates(
                    filters.latitude, filters.longitude, job.location
                )
        
        return jobs, total

    def apply_to_job(self, job_id: int, application_data: JobApplicationCreate, worker_id: int) -> Optional[JobApplication]:
        """Submit a job application"""
        # Check if job exists and is open
        job = self.db.query(Job).filter(
            and_(Job.id == job_id, Job.status == JobStatus.OPEN)
        ).first()
        
        if not job:
            return None
        
        # Check if worker already applied
        existing_application = self.db.query(JobApplication).filter(
            and_(
                JobApplication.job_id == job_id,
                JobApplication.worker_id == worker_id
            )
        ).first()
        
        if existing_application:
            return None
        
        # Create application
        application = JobApplication(
            job_id=job_id,
            worker_id=worker_id,
            message=application_data.message,
            proposed_rate=application_data.proposed_rate,
            proposed_start_date=application_data.proposed_start_date
        )
        
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)
        
        return application

    def get_job_applications(self, job_id: int, client_id: int) -> List[JobApplication]:
        """Get all applications for a job (client only)"""
        # Verify job belongs to client
        job = self.db.query(Job).filter(
            and_(Job.id == job_id, Job.client_id == client_id)
        ).first()
        
        if not job:
            return []
        
        applications = self.db.query(JobApplication).options(
            joinedload(JobApplication.worker).joinedload(WorkerProfile.user)
        ).filter(JobApplication.job_id == job_id).order_by(
            JobApplication.created_at.desc()
        ).all()
        
        return applications

    def update_application_status(self, application_id: int, status: ApplicationStatus, client_id: int) -> Optional[JobApplication]:
        """Update application status (client only)"""
        application = self.db.query(JobApplication).options(
            joinedload(JobApplication.job)
        ).filter(JobApplication.id == application_id).first()
        
        if not application or application.job.client_id != client_id:
            return None
        
        # If accepting, reject all other applications for this job
        if status == ApplicationStatus.ACCEPTED:
            self.db.query(JobApplication).filter(
                and_(
                    JobApplication.job_id == application.job_id,
                    JobApplication.id != application_id
                )
            ).update({"status": ApplicationStatus.REJECTED})
            
            # Update job status to assigned
            application.job.status = JobStatus.ASSIGNED
        
        application.status = status
        self.db.commit()
        self.db.refresh(application)
        
        return application

    def invite_worker_to_job(self, job_id: int, invitation_data: JobInvitationCreate, client_id: int) -> Optional[JobApplication]:
        """Invite a specific worker to apply for a job"""
        # Verify job belongs to client and is open
        job = self.db.query(Job).filter(
            and_(Job.id == job_id, Job.client_id == client_id, Job.status == JobStatus.OPEN)
        ).first()
        
        if not job:
            return None
        
        # Verify worker exists and is verified
        worker_profile = self.db.query(WorkerProfile).options(
            joinedload(WorkerProfile.user)
        ).filter(WorkerProfile.id == invitation_data.worker_id).first()
        
        if not worker_profile or not worker_profile.user.is_verified:
            return None
        
        # Check if worker already applied
        existing_application = self.db.query(JobApplication).filter(
            and_(
                JobApplication.job_id == job_id,
                JobApplication.worker_id == invitation_data.worker_id
            )
        ).first()
        
        if existing_application:
            return existing_application
        
        # Create invitation as a pending application
        application = JobApplication(
            job_id=job_id,
            worker_id=invitation_data.worker_id,
            message=invitation_data.message or "You have been invited to apply for this job.",
            proposed_rate=invitation_data.proposed_rate,
            status=ApplicationStatus.PENDING
        )
        
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)
        
        return application

    def get_worker_applications(self, worker_id: int) -> List[JobApplication]:
        """Get all applications submitted by a worker"""
        applications = self.db.query(JobApplication).options(
            joinedload(JobApplication.job).joinedload(Job.client).joinedload(ClientProfile.user)
        ).filter(JobApplication.worker_id == worker_id).order_by(
            JobApplication.created_at.desc()
        ).all()
        
        return applications

    def _calculate_distance_placeholder(self, location1: str, location2: str) -> float:
        """Placeholder distance calculation - in production use geocoding service"""
        # This is a simplified placeholder
        # In production, you would:
        # 1. Geocode the location strings to lat/lng
        # 2. Use the haversine formula or a proper distance calculation
        return 5.0  # Default 5km for now

    def _calculate_distance_from_coordinates(self, lat: float, lng: float, location: str) -> float:
        """Calculate distance from coordinates to location string"""
        # Placeholder - in production, geocode the location string first
        return 10.0  # Default 10km for now

    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great circle distance between two points on earth (in kilometers)"""
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return c * r