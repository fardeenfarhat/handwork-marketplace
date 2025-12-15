from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_db, get_current_user, get_current_user_optional
from app.db.models import User, WorkerProfile, ClientProfile, Job, JobApplication, JobStatus, ApplicationStatus, Booking, BookingStatus
from app.schemas.jobs import (
    JobCreate, JobUpdate, JobResponse, JobListResponse, JobFilters,
    JobApplicationCreate, JobApplicationResponse, JobApplicationListResponse,
    JobApplicationUpdate, JobInvitationCreate, JobInvitationResponse,
    JobStatusUpdate, JobCategory
)
from app.schemas.notifications import NotificationType
from app.services.job_service import JobService
from app.services.notification_service import NotificationService

router = APIRouter()


def get_client_profile(current_user: User, db: Session) -> ClientProfile:
    """Get client profile or raise 403"""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can perform this action"
        )
    
    client_profile = db.query(ClientProfile).filter(
        ClientProfile.user_id == current_user.id
    ).first()
    
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client profile not found"
        )
    
    return client_profile


def get_worker_profile(current_user: User, db: Session) -> WorkerProfile:
    """Get worker profile or raise 403"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can perform this action"
        )
    
    worker_profile = db.query(WorkerProfile).filter(
        WorkerProfile.user_id == current_user.id
    ).first()
    
    if not worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    return worker_profile


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new job posting (clients only)"""
    client_profile = get_client_profile(current_user, db)
    
    job_service = JobService(db)
    job = job_service.create_job(job_data, client_profile.id)
    
    # Convert to response format
    response = JobResponse(
        id=job.id,
        client_id=job.client_id,
        title=job.title,
        description=job.description,
        category=job.category,
        budget_min=job.budget_min,
        budget_max=job.budget_max,
        location=job.location,
        preferred_date=job.preferred_date,
        status=job.status,
        requirements=job.requirements,
        created_at=job.created_at,
        updated_at=job.updated_at,
        client_name=f"{job.client.user.first_name} {job.client.user.last_name}",
        client_rating=job.client.rating,
        client_user_id=job.client.user_id
    )
    
    return response


@router.get("/", response_model=JobListResponse)
async def list_jobs(
    category: Optional[JobCategory] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    location: Optional[str] = None,
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: Optional[float] = Query(None, gt=0, le=1000),
    search: Optional[str] = None,
    job_status: Optional[JobStatus] = Query(JobStatus.OPEN, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """List jobs with filtering and search"""
    filters = JobFilters(
        category=category,
        budget_min=budget_min,
        budget_max=budget_max,
        location=location,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        search=search,
        status=job_status,
        page=page,
        limit=limit
    )
    
    job_service = JobService(db)
    jobs, total = job_service.list_jobs(filters, current_user.id if current_user else None)
    
    # Convert to response format
    job_responses = []
    for job in jobs:
        # Count applications
        application_count = len(job.applications) if hasattr(job, 'applications') else 0
        
        # Calculate client review count
        client_review_count = 0
        if job.client:
            from app.services.review_count_service import ReviewCountService
            client_review_count = ReviewCountService.get_client_review_count(db, job.client.id)
        
        job_response = JobResponse(
            id=job.id,
            client_id=job.client_id,
            title=job.title,
            description=job.description,
            category=job.category,
            budget_min=job.budget_min,
            budget_max=job.budget_max,
            location=job.location,
            preferred_date=job.preferred_date,
            status=job.status,
            requirements=job.requirements,
            created_at=job.created_at,
            updated_at=job.updated_at,
            distance_km=getattr(job, 'distance_km', None),
            application_count=application_count,
            client_name=f"{job.client.user.first_name} {job.client.user.last_name}" if job.client else None,
            client_rating=job.client.rating if job.client else None,
            client_review_count=client_review_count,
            client_user_id=job.client.user_id if job.client else None
        )
        job_responses.append(job_response)
    
    has_next = (page * limit) < total
    
    return JobListResponse(
        jobs=job_responses,
        total=total,
        page=page,
        limit=limit,
        has_next=has_next
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get a specific job by ID"""
    job_service = JobService(db)
    job = job_service.get_job_by_id(job_id, current_user.id if current_user else None)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Count applications
    application_count = len(job.applications) if hasattr(job, 'applications') else 0
    
    response = JobResponse(
        id=job.id,
        client_id=job.client_id,
        title=job.title,
        description=job.description,
        category=job.category,
        budget_min=job.budget_min,
        budget_max=job.budget_max,
        location=job.location,
        preferred_date=job.preferred_date,
        status=job.status,
        requirements=job.requirements,
        created_at=job.created_at,
        updated_at=job.updated_at,
        distance_km=getattr(job, 'distance_km', None),
        application_count=application_count,
        client_name=f"{job.client.user.first_name} {job.client.user.last_name}" if job.client else None,
        client_rating=job.client.rating if job.client else None,
        client_user_id=job.client.user_id if job.client else None
    )
    
    return response


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_data: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a job (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    job_service = JobService(db)
    job = job_service.update_job(job_id, job_data, client_profile.id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to update it"
        )
    
    response = JobResponse(
        id=job.id,
        client_id=job.client_id,
        title=job.title,
        description=job.description,
        category=job.category,
        budget_min=job.budget_min,
        budget_max=job.budget_max,
        location=job.location,
        preferred_date=job.preferred_date,
        status=job.status,
        requirements=job.requirements,
        created_at=job.created_at,
        updated_at=job.updated_at,
        client_name=f"{job.client.user.first_name} {job.client.user.last_name}",
        client_rating=job.client.rating,
        client_user_id=job.client.user_id
    )
    
    return response


@router.patch("/{job_id}/status", response_model=JobResponse)
async def update_job_status(
    job_id: int,
    status_data: JobStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update job status (job owner or assigned worker)"""
    job_service = JobService(db)
    job = job_service.update_job_status(job_id, status_data.status, current_user.id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to update its status"
        )
    
    response = JobResponse(
        id=job.id,
        client_id=job.client_id,
        title=job.title,
        description=job.description,
        category=job.category,
        budget_min=job.budget_min,
        budget_max=job.budget_max,
        location=job.location,
        preferred_date=job.preferred_date,
        status=job.status,
        requirements=job.requirements,
        created_at=job.created_at,
        updated_at=job.updated_at,
        client_name=f"{job.client.user.first_name} {job.client.user.last_name}" if job.client else None,
        client_rating=job.client.rating if job.client else None,
        client_user_id=job.client.user_id if job.client else None
    )
    
    return response


# Job Application Endpoints
@router.post("/{job_id}/applications", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    job_id: int,
    application_data: JobApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apply to a job (workers only)"""
    worker_profile = get_worker_profile(current_user, db)
    
    # Check if worker is verified
    if worker_profile.kyc_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must complete KYC verification before applying to jobs"
        )
    
    job_service = JobService(db)
    application = job_service.apply_to_job(job_id, application_data, worker_profile.id)
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot apply to this job. Job may not exist, be closed, or you may have already applied."
        )
    
    response = JobApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        worker_id=application.worker_id,
        message=application.message,
        proposed_rate=application.proposed_rate,
        proposed_start_date=application.proposed_start_date,
        status=application.status,
        created_at=application.created_at,
        worker_name=f"{current_user.first_name} {current_user.last_name}",
        worker_rating=worker_profile.rating,
        worker_skills=worker_profile.skills
    )
    
    return response


@router.get("/client/applications", response_model=JobApplicationListResponse)
async def get_client_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all applications received by the current client"""
    client_profile = get_client_profile(current_user, db)
    
    # Get all applications for jobs posted by this client with eager loading
    applications = db.query(JobApplication).options(
        joinedload(JobApplication.worker).joinedload(WorkerProfile.user),
        joinedload(JobApplication.job)
    ).join(Job).filter(
        Job.client_id == client_profile.id
    ).offset((page - 1) * limit).limit(limit).all()
    
    total = db.query(JobApplication).join(Job).filter(
        Job.client_id == client_profile.id
    ).count()
    
    # Convert to response format
    application_responses = []
    print(f"Processing {len(applications)} applications for client {client_profile.id}")
    
    for app in applications:
        # Safe access to worker and user data
        worker_name = None
        worker_rating = None
        worker_skills = None
        
        if app.worker:
            worker_rating = app.worker.rating
            worker_skills = app.worker.skills
            if app.worker.user:
                worker_name = f"{app.worker.user.first_name} {app.worker.user.last_name}"
        
        # Ensure proper data types and handle None values
        try:
            response = JobApplicationResponse(
                id=app.id,
                job_id=app.job_id,
                worker_id=app.worker_id,
                message=app.message or "",
                proposed_rate=app.proposed_rate,
                proposed_start_date=app.proposed_start_date,
                status=app.status,
                created_at=app.created_at,
                worker_name=worker_name,
                worker_rating=float(worker_rating) if worker_rating is not None else None,
                worker_skills=worker_skills if isinstance(worker_skills, list) else []
            )
        except Exception as e:
            print(f"Error creating JobApplicationResponse: {e}")
            print(f"App data: id={app.id}, job_id={app.job_id}, worker_id={app.worker_id}")
            print(f"Worker data: name={worker_name}, rating={worker_rating}, skills={worker_skills}")
            continue
        application_responses.append(response)
    
    print(f"Returning {len(application_responses)} valid application responses, total={total}")
    
    return JobApplicationListResponse(
        applications=application_responses,
        total=total
    )


@router.get("/{job_id}/applications", response_model=JobApplicationListResponse)
async def get_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all applications for a job (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    job_service = JobService(db)
    applications = job_service.get_job_applications(job_id, client_profile.id)
    
    # Convert to response format
    application_responses = []
    for app in applications:
        response = JobApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            worker_id=app.worker_id,
            message=app.message,
            proposed_rate=app.proposed_rate,
            proposed_start_date=app.proposed_start_date,
            status=app.status,
            created_at=app.created_at,
            worker_name=f"{app.worker.user.first_name} {app.worker.user.last_name}" if app.worker else None,
            worker_rating=app.worker.rating if app.worker else None,
            worker_skills=app.worker.skills if app.worker else None
        )
        application_responses.append(response)
    
    return JobApplicationListResponse(
        applications=application_responses,
        total=len(application_responses)
    )


@router.patch("/applications/{application_id}/status", response_model=JobApplicationResponse)
async def update_application_status(
    application_id: int,
    status_data: JobApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update application status (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    if not status_data.status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status is required"
        )
    
    job_service = JobService(db)
    application = job_service.update_application_status(
        application_id, status_data.status, client_profile.id
    )
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or you don't have permission to update it"
        )
    
    response = JobApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        worker_id=application.worker_id,
        message=application.message,
        proposed_rate=application.proposed_rate,
        proposed_start_date=application.proposed_start_date,
        status=application.status,
        created_at=application.created_at,
        worker_name=f"{application.worker.user.first_name} {application.worker.user.last_name}" if application.worker else None,
        worker_rating=application.worker.rating if application.worker else None,
        worker_skills=application.worker.skills if application.worker else None
    )
    
    return response


@router.post("/{job_id}/invite", response_model=JobInvitationResponse)
async def invite_worker_to_job(
    job_id: int,
    invitation_data: JobInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a specific worker to apply for a job (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    job_service = JobService(db)
    application = job_service.invite_worker_to_job(job_id, invitation_data, client_profile.id)
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite worker. Job may not exist, be closed, worker may not exist, or worker may have already applied."
        )
    
    return JobInvitationResponse(
        success=True,
        message="Worker invited successfully",
        application_id=application.id
    )


@router.get("/applications/my", response_model=JobApplicationListResponse)
async def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all applications submitted by the current worker"""
    worker_profile = get_worker_profile(current_user, db)
    
    job_service = JobService(db)
    applications = job_service.get_worker_applications(worker_profile.id)
    
    # Convert to response format
    application_responses = []
    for app in applications:
        response = JobApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            worker_id=app.worker_id,
            message=app.message,
            proposed_rate=app.proposed_rate,
            proposed_start_date=app.proposed_start_date,
            status=app.status,
            created_at=app.created_at,
            worker_name=f"{current_user.first_name} {current_user.last_name}",
            worker_rating=worker_profile.rating,
            worker_skills=worker_profile.skills
        )
        application_responses.append(response)
    
    return JobApplicationListResponse(
        applications=application_responses,
        total=len(application_responses)
    )


# Client-specific endpoints
@router.get("/client/posted", response_model=JobListResponse)
async def get_client_posted_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all jobs posted by the current client"""
    from app.db.models import Job as JobModel
    client_profile = get_client_profile(current_user, db)
    
    # Get jobs posted by this client
    jobs = db.query(JobModel).filter(
        JobModel.client_id == client_profile.id
    ).offset((page - 1) * limit).limit(limit).all()
    
    total = db.query(JobModel).filter(JobModel.client_id == client_profile.id).count()
    
    # Convert to response format
    job_responses = []
    for job in jobs:
        # Count applications
        application_count = len(job.applications) if hasattr(job, 'applications') else 0
        
        job_response = JobResponse(
            id=job.id,
            client_id=job.client_id,
            title=job.title,
            description=job.description,
            category=job.category,
            budget_min=job.budget_min,
            budget_max=job.budget_max,
            location=job.location,
            preferred_date=job.preferred_date,
            status=job.status,
            requirements=job.requirements,
            created_at=job.created_at,
            updated_at=job.updated_at,
            application_count=application_count,
            client_name=f"{current_user.first_name} {current_user.last_name}",
            client_rating=client_profile.rating,
            client_user_id=current_user.id
        )
        job_responses.append(job_response)
    
    has_next = (page * limit) < total
    
    return JobListResponse(
        jobs=job_responses,
        total=total,
        page=page,
        limit=limit,
        has_next=has_next
    )# Additional job management endpoints to be appended

@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a job (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    # Check if the job exists and belongs to the current client
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.client_id == client_profile.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to delete it"
        )
    
    # Delete the job
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully"}


@router.patch("/applications/{application_id}/accept")
async def accept_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a job application (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    # Get the application and verify ownership
    application = db.query(JobApplication).join(Job).filter(
        JobApplication.id == application_id,
        Job.client_id == client_profile.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or you don't have permission to manage it"
        )
    
    # Update application status
    application.status = ApplicationStatus.ACCEPTED
    
    # Create a booking when application is accepted
    # Use proposed_rate or fall back to job budget minimum if proposed_rate is None
    agreed_rate = application.proposed_rate or application.job.budget_min
    
    booking = Booking(
        job_id=application.job_id,
        worker_id=application.worker_id,
        client_id=client_profile.id,
        start_date=application.proposed_start_date or datetime.utcnow(),
        agreed_rate=agreed_rate,
        status=BookingStatus.CONFIRMED
    )
    db.add(booking)
    db.flush()  # Get the booking ID
    
    # Create payment to hold funds (escrow)
    try:
        from app.services.payment_service import PaymentService
        from decimal import Decimal
        payment_service = PaymentService(db)
        
        # For fixed-price jobs, we'll use agreed_rate as hourly rate with 1 hour
        # This is a simplified approach - you may want to adjust based on your business logic
        working_hours = Decimal("1.0")
        hourly_rate = Decimal(str(agreed_rate))
        
        # Create payment intent to authorize (hold) the funds
        payment_response = await payment_service.create_stripe_payment_intent(
            booking_id=booking.id,
            working_hours=working_hours,
            hourly_rate=hourly_rate,
            currency="usd",
            customer_id=current_user.id  # Pass client's user ID to use their saved payment method
        )
        
        print(f"✅ Payment intent created: {payment_response.payment_intent_id} for ${agreed_rate}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to create payment: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create payment: {str(e)}"
        )
    
    # Update job status to in_progress if it was open
    if application.job.status == JobStatus.OPEN:
        application.job.status = JobStatus.IN_PROGRESS
    
    db.commit()
    db.refresh(application)
    
    # Send notification to worker
    try:
        notification_service = NotificationService(db)
        await notification_service.send_push_notification(
            user_id=application.worker.user_id,
            title="Application Accepted! 🎉",
            body=f"Your application for '{application.job.title}' has been accepted by {current_user.first_name} {current_user.last_name}.",
            notification_type=NotificationType.JOB_UPDATE,
            data={
                "job_id": application.job_id,
                "application_id": application.id,
                "booking_id": booking.id,
                "action": "application_accepted"
            }
        )
    except Exception as e:
        print(f"Failed to send notification: {e}")
    
    return {
        "message": "Application accepted successfully",
        "booking_id": booking.id,
        "payment_intent_id": payment_response.payment_intent_id if 'payment_response' in locals() else None,
        "client_secret": payment_response.client_secret if 'payment_response' in locals() else None
    }


@router.patch("/applications/{application_id}/reject")
async def reject_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a job application (job owner only)"""
    client_profile = get_client_profile(current_user, db)
    
    # Get the application and verify ownership
    application = db.query(JobApplication).join(Job).filter(
        JobApplication.id == application_id,
        Job.client_id == client_profile.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or you don't have permission to manage it"
        )
    
    # Update application status
    application.status = ApplicationStatus.REJECTED
    db.commit()
    db.refresh(application)
    
    return {"message": "Application rejected successfully"}


@router.patch("/applications/{application_id}/withdraw")
async def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Withdraw a job application (applicant only)"""
    worker_profile = get_worker_profile(current_user, db)
    
    # Get the application and verify ownership
    application = db.query(JobApplication).filter(
        JobApplication.id == application_id,
        JobApplication.worker_id == worker_profile.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or you don't have permission to withdraw it"
        )
    
    if application.status != ApplicationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending applications can be withdrawn"
        )
    
    # Delete the application
    db.delete(application)
    db.commit()
    
    return {"message": "Application withdrawn successfully"}
