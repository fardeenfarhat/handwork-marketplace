from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.deps import get_current_user, get_db, get_current_admin_user
from app.db.models import User
from app.schemas.reviews import (
    ReviewCreate, ReviewUpdate, ReviewResponse, ReviewListResponse,
    ReviewFilters, ReviewStats, ReviewModerationRequest, ReviewReportRequest,
    UserReputationScore, ReviewAnalytics
)
from app.services.review_service import ReviewService

router = APIRouter()

@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new review for a completed booking"""
    try:
        review_service = ReviewService(db)
        review = review_service.create_review(review_data, current_user.id)
        
        # Convert to response format
        return ReviewResponse(
            id=review.id,
            booking_id=review.booking_id,
            reviewer_id=review.reviewer_id,
            reviewee_id=review.reviewee_id,
            rating=review.rating,
            comment=review.comment,
            status=review.status,
            created_at=review.created_at,
            reviewer_name=f"{current_user.first_name} {current_user.last_name}",
            reviewer_role=current_user.role.value
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create review")

@router.get("/", response_model=ReviewListResponse)
def get_reviews(
    reviewee_id: Optional[int] = Query(None, description="Filter by reviewee ID"),
    reviewer_id: Optional[int] = Query(None, description="Filter by reviewer ID"),
    booking_id: Optional[int] = Query(None, description="Filter by booking ID"),
    rating: Optional[int] = Query(None, ge=1, le=5, description="Filter by rating"),
    status: Optional[str] = Query("approved", description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reviews with filtering and pagination"""
    try:
        review_service = ReviewService(db)
        
        filters = ReviewFilters(
            reviewee_id=reviewee_id,
            reviewer_id=reviewer_id,
            booking_id=booking_id,
            rating=rating,
            status=status,
            page=page,
            per_page=per_page
        )
        
        reviews, total = review_service.get_reviews(filters)
        
        # Convert to response format
        review_responses = []
        for review in reviews:
            # Get reviewer info
            reviewer = db.query(User).filter(User.id == review.reviewer_id).first()
            # Get job title from booking
            job_title = None
            if review.booking and review.booking.job:
                job_title = review.booking.job.title
            
            review_responses.append(ReviewResponse(
                id=review.id,
                booking_id=review.booking_id,
                reviewer_id=review.reviewer_id,
                reviewee_id=review.reviewee_id,
                rating=review.rating,
                comment=review.comment,
                status=review.status,
                created_at=review.created_at,
                reviewer_name=f"{reviewer.first_name} {reviewer.last_name}" if reviewer else None,
                reviewer_role=reviewer.role.value if reviewer else None,
                job_title=job_title
            ))
        
        total_pages = (total + per_page - 1) // per_page
        
        return ReviewListResponse(
            reviews=review_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch reviews")

@router.get("/{review_id}", response_model=ReviewResponse)
def get_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific review by ID"""
    review_service = ReviewService(db)
    review = review_service.get_review(review_id)
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Get reviewer info
    reviewer = db.query(User).filter(User.id == review.reviewer_id).first()
    # Get job title from booking
    job_title = None
    if review.booking and review.booking.job:
        job_title = review.booking.job.title
    
    return ReviewResponse(
        id=review.id,
        booking_id=review.booking_id,
        reviewer_id=review.reviewer_id,
        reviewee_id=review.reviewee_id,
        rating=review.rating,
        comment=review.comment,
        status=review.status,
        created_at=review.created_at,
        reviewer_name=f"{reviewer.first_name} {reviewer.last_name}" if reviewer else None,
        reviewer_role=reviewer.role.value if reviewer else None,
        job_title=job_title
    )

@router.put("/{review_id}", response_model=ReviewResponse)
def update_review(
    review_id: int,
    review_data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing review (only if pending)"""
    try:
        review_service = ReviewService(db)
        review = review_service.update_review(review_id, review_data, current_user.id)
        
        return ReviewResponse(
            id=review.id,
            booking_id=review.booking_id,
            reviewer_id=review.reviewer_id,
            reviewee_id=review.reviewee_id,
            rating=review.rating,
            comment=review.comment,
            status=review.status,
            created_at=review.created_at,
            reviewer_name=f"{current_user.first_name} {current_user.last_name}",
            reviewer_role=current_user.role.value
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update review")

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a review (only by reviewer and only if pending)"""
    review_service = ReviewService(db)
    success = review_service.delete_review(review_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=404, 
            detail="Review not found or cannot be deleted"
        )

@router.get("/user/{user_id}/stats", response_model=ReviewStats)
def get_user_review_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get review statistics for a user"""
    review_service = ReviewService(db)
    return review_service.get_review_stats(user_id)

@router.get("/user/{user_id}/reputation", response_model=UserReputationScore)
def get_user_reputation(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive reputation score for a user"""
    try:
        review_service = ReviewService(db)
        return review_service.calculate_reputation_score(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to calculate reputation")

@router.get("/user/{user_id}/reviews", response_model=ReviewListResponse)
def get_user_reviews(
    user_id: int,
    as_reviewee: bool = Query(True, description="Get reviews where user is reviewee (True) or reviewer (False)"),
    status: Optional[str] = Query("approved", description="Filter by review status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reviews for a specific user"""
    review_service = ReviewService(db)
    
    reviews, total = review_service.get_user_reviews(
        user_id=user_id,
        as_reviewee=as_reviewee,
        status=status,
        page=page,
        per_page=per_page
    )
    
    # Convert to response format
    review_responses = []
    for review in reviews:
        # Get reviewer info
        reviewer = db.query(User).filter(User.id == review.reviewer_id).first()
        # Get job title from booking
        job_title = None
        if review.booking and review.booking.job:
            job_title = review.booking.job.title
        
        review_responses.append(ReviewResponse(
            id=review.id,
            booking_id=review.booking_id,
            reviewer_id=review.reviewer_id,
            reviewee_id=review.reviewee_id,
            rating=review.rating,
            comment=review.comment,
            status=review.status,
            created_at=review.created_at,
            reviewer_name=f"{reviewer.first_name} {reviewer.last_name}" if reviewer else None,
            reviewer_role=reviewer.role.value if reviewer else None,
            job_title=job_title
        ))
    
    total_pages = (total + per_page - 1) // per_page
    
    return ReviewListResponse(
        reviews=review_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@router.get("/booking/{booking_id}/can-review")
def can_review_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if current user can review a specific booking"""
    review_service = ReviewService(db)
    can_review = review_service.can_review_booking(booking_id, current_user.id)
    
    return {"can_review": can_review}

@router.post("/{review_id}/report")
def report_review(
    review_id: int,
    report_data: ReviewReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Report a review for inappropriate content"""
    try:
        review_service = ReviewService(db)
        result = review_service.report_review(
            review_id=review_id,
            reporter_id=current_user.id,
            reason=report_data.reason,
            description=report_data.description
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to report review")

# Admin endpoints
@router.post("/{review_id}/moderate", response_model=ReviewResponse)
def moderate_review(
    review_id: int,
    moderation_data: ReviewModerationRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Moderate a review (admin only)"""
    try:
        review_service = ReviewService(db)
        review = review_service.moderate_review(
            review_id=review_id,
            action=moderation_data.action,
            moderator_id=current_admin.id,
            reason=moderation_data.reason
        )
        
        # Get reviewer info
        reviewer = db.query(User).filter(User.id == review.reviewer_id).first()
        # Get job title from booking
        job_title = None
        if review.booking and review.booking.job:
            job_title = review.booking.job.title
        
        return ReviewResponse(
            id=review.id,
            booking_id=review.booking_id,
            reviewer_id=review.reviewer_id,
            reviewee_id=review.reviewee_id,
            rating=review.rating,
            comment=review.comment,
            status=review.status,
            created_at=review.created_at,
            reviewer_name=f"{reviewer.first_name} {reviewer.last_name}" if reviewer else None,
            reviewer_role=reviewer.role.value if reviewer else None,
            job_title=job_title
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to moderate review")

@router.get("/admin/analytics", response_model=ReviewAnalytics)
def get_review_analytics(
    period: str = Query("month", pattern="^(week|month|quarter|year)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get review analytics for the platform (admin only)"""
    try:
        review_service = ReviewService(db)
        return review_service.get_review_analytics(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get analytics")

@router.get("/admin/pending", response_model=ReviewListResponse)
def get_pending_reviews(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get pending reviews for moderation (admin only)"""
    review_service = ReviewService(db)
    
    filters = ReviewFilters(
        status="pending",
        page=page,
        per_page=per_page
    )
    
    reviews, total = review_service.get_reviews(filters)
    
    # Convert to response format
    review_responses = []
    for review in reviews:
        # Get reviewer info
        reviewer = db.query(User).filter(User.id == review.reviewer_id).first()
        # Get job title from booking
        job_title = None
        if review.booking and review.booking.job:
            job_title = review.booking.job.title
        
        review_responses.append(ReviewResponse(
            id=review.id,
            booking_id=review.booking_id,
            reviewer_id=review.reviewer_id,
            reviewee_id=review.reviewee_id,
            rating=review.rating,
            comment=review.comment,
            status=review.status,
            created_at=review.created_at,
            reviewer_name=f"{reviewer.first_name} {reviewer.last_name}" if reviewer else None,
            reviewer_role=reviewer.role.value if reviewer else None,
            job_title=job_title
        ))
    
    total_pages = (total + per_page - 1) // per_page
    
    return ReviewListResponse(
        reviews=review_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )