from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.core.deps import get_current_admin_user
from app.services.admin_service import AdminService
from app.schemas.admin import (
    AdminResponse, UserOverview, UserDetail, UserAction, UserFilters,
    JobOverview, JobDetail, JobAction, JobFilters,
    PaymentOverview, PaymentDetail, PaymentAction, PaymentFilters,
    DisputeOverview, DisputeDetail, DisputeResolution, DisputeFilters,
    ReviewOverview, ReviewDetail, ReviewAction, ReviewFilters,
    KYCDocument, KYCAction, PlatformMetrics, JobCategoryStats,
    PaginationParams, PaginatedResponse
)

router = APIRouter()

# Admin Authentication
@router.get("/me", response_model=AdminResponse)
async def get_current_admin(
    current_admin: User = Depends(get_current_admin_user)
):
    """Get current admin user information"""
    return AdminResponse(
        id=current_admin.id,
        email=current_admin.email,
        first_name=current_admin.first_name,
        last_name=current_admin.last_name,
        role=current_admin.role,
        is_active=current_admin.is_active,
        created_at=current_admin.created_at
    )

# User Management
@router.get("/users", response_model=PaginatedResponse)
async def get_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None),
    is_verified: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get paginated list of users with filters"""
    admin_service = AdminService(db)
    
    # Convert empty strings to None for proper validation
    role_filter = role if role and role.strip() else None
    search_filter = search if search and search.strip() else None
    
    filters = UserFilters(
        role=role_filter,
        is_verified=is_verified,
        is_active=is_active,
        search=search_filter
    )
    
    users, total = admin_service.get_users(filters, page, size)
    pages = (total + size - 1) // size
    
    return PaginatedResponse(
        items=users,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get detailed user information"""
    admin_service = AdminService(db)
    return admin_service.get_user_detail(user_id)

@router.post("/users/{user_id}/actions", response_model=UserDetail)
async def update_user_status(
    user_id: int,
    action: UserAction,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Update user status (activate, deactivate, verify, suspend)"""
    admin_service = AdminService(db)
    return admin_service.update_user_status(user_id, action.action, action.reason)

# Job Management
@router.get("/jobs", response_model=PaginatedResponse)
async def get_jobs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_budget: Optional[float] = Query(None),
    max_budget: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get paginated list of jobs with filters"""
    admin_service = AdminService(db)
    
    # Convert empty strings to None for proper validation
    status_filter = status if status and status.strip() else None
    category_filter = category if category and category.strip() else None
    search_filter = search if search and search.strip() else None
    
    filters = JobFilters(
        status=status_filter,
        category=category_filter,
        search=search_filter,
        min_budget=min_budget,
        max_budget=max_budget
    )
    
    jobs, total = admin_service.get_jobs(filters, page, size)
    pages = (total + size - 1) // size
    
    return PaginatedResponse(
        items=jobs,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/jobs/{job_id}", response_model=JobDetail)
async def get_job_detail(
    job_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get detailed job information"""
    admin_service = AdminService(db)
    return admin_service.get_job_detail(job_id)

# Payment Management
@router.get("/payments", response_model=PaginatedResponse)
async def get_payments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get paginated list of payments with filters"""
    admin_service = AdminService(db)
    
    # Convert empty strings to None for proper validation
    status_filter = status if status and status.strip() else None
    payment_method_filter = payment_method if payment_method and payment_method.strip() else None
    
    filters = PaymentFilters(
        status=status_filter,
        payment_method=payment_method_filter,
        min_amount=min_amount,
        max_amount=max_amount
    )
    
    payments, total = admin_service.get_payments(filters, page, size)
    pages = (total + size - 1) // size
    
    return PaginatedResponse(
        items=payments,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

# Dispute Management
@router.get("/disputes", response_model=PaginatedResponse)
async def get_disputes(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get paginated list of disputes with filters"""
    admin_service = AdminService(db)
    
    # Convert empty string to None for proper validation
    status_filter = status if status and status.strip() else None
    filters = DisputeFilters(status=status_filter)
    disputes, total = admin_service.get_disputes(filters, page, size)
    pages = (total + size - 1) // size
    
    return PaginatedResponse(
        items=disputes,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

# Analytics
@router.get("/analytics/metrics", response_model=PlatformMetrics)
async def get_platform_metrics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get overall platform metrics"""
    admin_service = AdminService(db)
    return admin_service.get_platform_metrics()

@router.get("/analytics/job-categories", response_model=List[JobCategoryStats])
async def get_job_categories_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get statistics by job category"""
    admin_service = AdminService(db)
    return admin_service.get_job_categories_stats()

# Content Moderation
@router.get("/moderation/reviews", response_model=PaginatedResponse)
async def get_reviews_for_moderation(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get paginated list of reviews for moderation"""
    admin_service = AdminService(db)
    
    # Convert empty string to None for proper validation
    status_filter = status if status and status.strip() else None
    
    filters = ReviewFilters(
        status=status_filter,
        min_rating=min_rating,
        max_rating=max_rating
    )
    
    reviews, total = admin_service.get_reviews_for_moderation(filters, page, size)
    pages = (total + size - 1) // size
    
    return PaginatedResponse(
        items=reviews,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/moderation/reviews/{review_id}", response_model=ReviewDetail)
async def get_review_detail(
    review_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get detailed review information"""
    admin_service = AdminService(db)
    return admin_service.get_review_detail(review_id)

@router.post("/moderation/reviews/{review_id}/actions", response_model=ReviewDetail)
async def moderate_review(
    review_id: int,
    action: ReviewAction,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Moderate a review (approve, reject, flag)"""
    admin_service = AdminService(db)
    return admin_service.moderate_review(review_id, action.action, action.reason)

@router.get("/moderation/kyc", response_model=PaginatedResponse)
async def get_kyc_documents(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get KYC documents for review"""
    admin_service = AdminService(db)
    kyc_documents, total = admin_service.get_kyc_documents(page, size)
    pages = (total + size - 1) // size
    
    return PaginatedResponse(
        items=kyc_documents,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("/moderation/kyc/{worker_profile_id}/actions")
async def process_kyc(
    worker_profile_id: int,
    action: KYCAction,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Process KYC document (approve or reject)"""
    admin_service = AdminService(db)
    return admin_service.process_kyc(worker_profile_id, action.action, action.reason)