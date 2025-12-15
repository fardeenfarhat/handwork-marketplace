from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.core.deps import get_current_user, get_current_verified_user
from app.schemas.profiles import (
    WorkerProfileCreate, WorkerProfileUpdate, ClientProfileCreate, ClientProfileUpdate,
    WorkerProfileResponse, ClientProfileResponse, ProfileCompletionStatus,
    KYCStatusUpdate, UserProfileSummary
)
from app.services.profile_service import get_profile_service

router = APIRouter()


@router.post("/worker", response_model=WorkerProfileResponse)
async def create_worker_profile(
    profile_data: WorkerProfileCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Create worker profile"""
    profile_service = get_profile_service(db)
    return profile_service.create_worker_profile(current_user, profile_data)


@router.post("/client", response_model=ClientProfileResponse)
async def create_client_profile(
    profile_data: ClientProfileCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Create client profile"""
    profile_service = get_profile_service(db)
    return profile_service.create_client_profile(current_user, profile_data)


@router.put("/worker", response_model=WorkerProfileResponse)
async def update_worker_profile(
    profile_data: WorkerProfileUpdate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Update worker profile"""
    profile_service = get_profile_service(db)
    return profile_service.update_worker_profile(current_user, profile_data)


@router.put("/client", response_model=ClientProfileResponse)
async def update_client_profile(
    profile_data: ClientProfileUpdate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Update client profile"""
    profile_service = get_profile_service(db)
    return profile_service.update_client_profile(current_user, profile_data)


@router.get("/me", response_model=UserProfileSummary)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    profile_service = get_profile_service(db)
    return profile_service.get_user_profile(current_user)


@router.get("/{user_id}", response_model=UserProfileSummary)
async def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user profile by ID (public view)"""
    profile_service = get_profile_service(db)
    return profile_service.get_user_profile(current_user, user_id)


@router.get("/completion/status", response_model=ProfileCompletionStatus)
async def get_profile_completion_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get profile completion status"""
    profile_service = get_profile_service(db)
    return profile_service.get_profile_completion_status(current_user)


@router.post("/upload/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Upload profile image"""
    profile_service = get_profile_service(db)
    return await profile_service.upload_profile_image(current_user, file)


@router.post("/upload/portfolio-image")
async def upload_portfolio_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload portfolio image (workers only)"""
    profile_service = get_profile_service(db)
    return await profile_service.upload_portfolio_image(current_user, file)


@router.post("/upload/kyc-document")
async def upload_kyc_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload KYC document (workers only)"""
    profile_service = get_profile_service(db)
    return await profile_service.upload_kyc_document(current_user, document_type, file)


@router.delete("/portfolio-image")
async def delete_portfolio_image(
    image_url: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Delete portfolio image (workers only)"""
    profile_service = get_profile_service(db)
    return profile_service.delete_portfolio_image(current_user, image_url)


# Admin endpoints
@router.put("/kyc/{user_id}/status")
async def update_kyc_status(
    user_id: int,
    status_update: KYCStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update KYC status (admin only)"""
    # TODO: Add admin role check when admin system is implemented
    # For now, this endpoint exists but should be protected
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    profile_service = get_profile_service(db)
    return profile_service.update_kyc_status(user_id, status_update)


@router.post("/worker/bank-account")
async def add_bank_account(
    account_holder_name: str = Form(...),
    bank_name: str = Form(...),
    account_number: str = Form(...),
    routing_number: str = Form(...),
    bank_country: str = Form(default="US"),
    bank_currency: str = Form(default="USD"),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Add or update worker's bank account details for payouts"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can add bank accounts"
        )
    
    if not current_user.worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    # Update worker profile with bank account details
    worker_profile = current_user.worker_profile
    worker_profile.bank_account_holder_name = account_holder_name
    worker_profile.bank_name = bank_name
    worker_profile.bank_account_number = account_number  # In production, encrypt this!
    worker_profile.bank_routing_number = routing_number
    worker_profile.bank_country = bank_country
    worker_profile.bank_currency = bank_currency
    worker_profile.bank_account_verified = False  # Will be verified on first successful payout
    
    db.commit()
    db.refresh(worker_profile)
    
    return {
        "success": True,
        "message": "Bank account added successfully",
        "bank_details": {
            "account_holder_name": account_holder_name,
            "bank_name": bank_name,
            "account_number_last4": account_number[-4:] if len(account_number) >= 4 else "****",
            "bank_country": bank_country,
            "bank_currency": bank_currency
        }
    }


@router.get("/worker/bank-account")
async def get_bank_account(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Get worker's bank account details (masked)"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can view bank accounts"
        )
    
    if not current_user.worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    worker_profile = current_user.worker_profile
    
    if not worker_profile.bank_account_number:
        return {
            "has_bank_account": False,
            "message": "No bank account added yet"
        }
    
    return {
        "has_bank_account": True,
        "bank_details": {
            "account_holder_name": worker_profile.bank_account_holder_name,
            "bank_name": worker_profile.bank_name,
            "account_number_last4": worker_profile.bank_account_number[-4:] if worker_profile.bank_account_number else None,
            "routing_number_last4": worker_profile.bank_routing_number[-4:] if worker_profile.bank_routing_number else None,
            "bank_country": worker_profile.bank_country,
            "bank_currency": worker_profile.bank_currency,
            "verified": worker_profile.bank_account_verified
        }
    }