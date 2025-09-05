from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ReviewCreate(BaseModel):
    booking_id: int = Field(..., description="ID of the booking being reviewed")
    reviewee_id: int = Field(..., description="ID of the user being reviewed")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: Optional[str] = Field(None, max_length=1000, description="Review comment")

    @validator('comment')
    def validate_comment(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) == 0:
                return None
        return v

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: Optional[str] = Field(None, max_length=1000, description="Review comment")

    @validator('comment')
    def validate_comment(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) == 0:
                return None
        return v

class ReviewResponse(BaseModel):
    id: int
    booking_id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    comment: Optional[str]
    status: ReviewStatus
    created_at: datetime
    
    # Additional fields for display
    reviewer_name: Optional[str] = None
    reviewer_role: Optional[str] = None
    job_title: Optional[str] = None

    class Config:
        from_attributes = True

class ReviewListResponse(BaseModel):
    reviews: List[ReviewResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class ReviewFilters(BaseModel):
    reviewee_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    booking_id: Optional[int] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[ReviewStatus] = None
    page: int = Field(1, ge=1)
    per_page: int = Field(10, ge=1, le=100)

class ReviewStats(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: dict  # {1: count, 2: count, ...}
    recent_reviews_count: int  # Reviews in last 30 days

class ReviewModerationRequest(BaseModel):
    review_id: int
    action: str = Field(..., pattern="^(approve|reject)$")
    reason: Optional[str] = Field(None, max_length=500)

class ReviewReportRequest(BaseModel):
    review_id: int
    reason: str = Field(..., max_length=500, description="Reason for reporting the review")
    description: Optional[str] = Field(None, max_length=1000, description="Additional details")

class ReviewReportResponse(BaseModel):
    id: int
    review_id: int
    reported_by: int
    reason: str
    description: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserReputationScore(BaseModel):
    user_id: int
    overall_rating: float
    total_reviews: int
    reputation_score: float  # Calculated score based on various factors
    rating_distribution: dict
    recent_performance: float  # Performance in last 30 days
    completion_rate: Optional[float] = None  # For workers
    response_rate: Optional[float] = None  # For clients

class ReviewAnalytics(BaseModel):
    period: str  # "week", "month", "quarter", "year"
    total_reviews: int
    average_rating: float
    rating_trend: List[dict]  # [{date: str, rating: float, count: int}]
    top_rated_users: List[dict]  # [{user_id: int, name: str, rating: float}]
    review_volume_trend: List[dict]  # [{date: str, count: int}]