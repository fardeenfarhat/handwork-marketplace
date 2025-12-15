from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.db.models import User, WorkerProfile, ClientProfile, Job
from app.schemas.profiles import WorkerProfileResponse, ClientProfileResponse, WorkerProfileUpdate, ClientProfileUpdate
from app.schemas.jobs import JobResponse
from app.services.profile_service import get_profile_service

router = APIRouter()


@router.get("/worker-profile")
async def get_worker_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's worker profile"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can access worker profiles"
        )
    
    worker_profile = db.query(WorkerProfile).filter(
        WorkerProfile.user_id == current_user.id
    ).first()
    
    if not worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    # Calculate review count for this worker
    from app.services.review_count_service import ReviewCountService
    review_count = ReviewCountService.get_worker_review_count(db, worker_profile.id)

    # Create a simple response that matches mobile app expectations
    return {
        "userId": worker_profile.user_id,
        "bio": worker_profile.bio or "",
        "skills": worker_profile.skills or [],
        "serviceCategories": worker_profile.service_categories or [],
        "hourlyRate": float(worker_profile.hourly_rate or 0),
        "location": worker_profile.location or "",
        "portfolioImages": worker_profile.portfolio_images or [],
        "kycStatus": worker_profile.kyc_status or "pending",
        "rating": float(worker_profile.rating or 0),
        "totalJobs": worker_profile.total_jobs or 0,
        "reviewCount": review_count
    }


@router.get("/client-profile")
async def get_client_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's client profile"""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can access client profiles"
        )
    
    client_profile = db.query(ClientProfile).filter(
        ClientProfile.user_id == current_user.id
    ).first()
    
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client profile not found"
        )
    
    # Calculate review count for this client
    from app.services.review_count_service import ReviewCountService
    review_count = ReviewCountService.get_client_review_count(db, client_profile.id)

    # Create a simple response that matches mobile app expectations
    return {
        "userId": client_profile.user_id,
        "companyName": client_profile.company_name or "",
        "description": client_profile.description or "",
        "location": client_profile.location or "",
        "rating": float(client_profile.rating or 0),
        "totalJobsPosted": client_profile.total_jobs_posted or 0,
        "reviewCount": review_count
    }


@router.put("/worker-profile")
async def update_worker_profile(
    profile_data: WorkerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's worker profile"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can update worker profiles"
        )
    
    # Get or create worker profile
    worker_profile = db.query(WorkerProfile).filter(
        WorkerProfile.user_id == current_user.id
    ).first()
    
    if not worker_profile:
        # Create new worker profile
        worker_profile = WorkerProfile(
            user_id=current_user.id,
            bio=profile_data.bio or "",
            skills=profile_data.skills or [],
            service_categories=profile_data.service_categories or [],
            hourly_rate=profile_data.hourly_rate or 0.0,
            location=profile_data.location or "",
            portfolio_images=[],
            kyc_status="pending",
            rating=0.0,
            total_jobs=0
        )
        db.add(worker_profile)
    else:
        # Update existing profile
        if profile_data.bio is not None:
            worker_profile.bio = profile_data.bio
        if profile_data.skills is not None:
            worker_profile.skills = profile_data.skills
        if profile_data.service_categories is not None:
            worker_profile.service_categories = profile_data.service_categories
        if profile_data.hourly_rate is not None:
            worker_profile.hourly_rate = profile_data.hourly_rate
        if profile_data.location is not None:
            worker_profile.location = profile_data.location
    
    db.commit()
    db.refresh(worker_profile)
    
    return {
        "userId": worker_profile.user_id,
        "bio": worker_profile.bio or "",
        "skills": worker_profile.skills or [],
        "serviceCategories": worker_profile.service_categories or [],
        "hourlyRate": float(worker_profile.hourly_rate or 0),
        "location": worker_profile.location or "",
        "portfolioImages": worker_profile.portfolio_images or [],
        "kycStatus": worker_profile.kyc_status or "pending",
        "rating": float(worker_profile.rating or 0),
        "totalJobs": worker_profile.total_jobs or 0
    }


@router.put("/client-profile")
async def update_client_profile(
    profile_data: ClientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's client profile"""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can update client profiles"
        )
    
    # Get or create client profile
    client_profile = db.query(ClientProfile).filter(
        ClientProfile.user_id == current_user.id
    ).first()
    
    if not client_profile:
        # Create new client profile
        client_profile = ClientProfile(
            user_id=current_user.id,
            company_name=profile_data.company_name or "",
            description=profile_data.description or "",
            location=profile_data.location or "",
            rating=0.0,
            total_jobs_posted=0
        )
        db.add(client_profile)
    else:
        # Update existing profile
        if profile_data.company_name is not None:
            client_profile.company_name = profile_data.company_name
        if profile_data.description is not None:
            client_profile.description = profile_data.description
        if profile_data.location is not None:
            client_profile.location = profile_data.location
    
    db.commit()
    db.refresh(client_profile)
    
    return {
        "userId": client_profile.user_id,
        "companyName": client_profile.company_name or "",
        "description": client_profile.description or "",
        "location": client_profile.location or "",
        "rating": float(client_profile.rating or 0),
        "totalJobsPosted": client_profile.total_jobs_posted or 0
    }