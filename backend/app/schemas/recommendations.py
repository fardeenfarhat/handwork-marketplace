from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

from app.schemas.jobs import JobResponse
from app.schemas.profiles import WorkerProfileResponse


class RecommendationType(str, Enum):
    JOB_RECOMMENDATION = "job_recommendation"
    WORKER_RECOMMENDATION = "worker_recommendation"
    PRICE_SUGGESTION = "price_suggestion"


class FeedbackAction(str, Enum):
    VIEWED = "viewed"
    CLICKED = "clicked"
    APPLIED = "applied"
    HIRED = "hired"
    DISMISSED = "dismissed"
    RATED = "rated"


class JobRecommendation(BaseModel):
    job_id: int
    job: JobResponse
    score: float = Field(..., ge=0.0, le=1.0, description="Recommendation confidence score")
    reasons: List[str] = Field(default_factory=list, description="Human-readable reasons for recommendation")
    
    class Config:
        from_attributes = True


class WorkerRecommendation(BaseModel):
    worker_id: int
    worker: WorkerProfileResponse
    score: float = Field(..., ge=0.0, le=1.0, description="Recommendation confidence score")
    reasons: List[str] = Field(default_factory=list, description="Human-readable reasons for recommendation")
    estimated_rate: Optional[float] = Field(None, description="Estimated hourly rate for this job")
    
    class Config:
        from_attributes = True


class PriceSuggestion(BaseModel):
    suggested_min: float = Field(..., description="Suggested minimum budget")
    suggested_max: float = Field(..., description="Suggested maximum budget")
    market_average: float = Field(..., description="Market average rate")
    market_median: Optional[float] = Field(None, description="Market median rate")
    confidence_level: float = Field(..., ge=0.0, le=1.0, description="Confidence in the suggestion")
    sample_size: int = Field(..., description="Number of jobs used for calculation")
    
    class Config:
        from_attributes = True


class JobAlert(BaseModel):
    worker_id: int
    job_id: int
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    alert_type: str
    message: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class RecommendationFeedback(BaseModel):
    user_id: int
    recommendation_type: RecommendationType
    item_id: int  # job_id or worker_id
    action: FeedbackAction
    rating: Optional[int] = Field(None, ge=1, le=5, description="Optional rating (1-5)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    class Config:
        from_attributes = True


class RecommendationFeedbackResponse(BaseModel):
    success: bool
    message: str
    
    class Config:
        from_attributes = True


class JobRecommendationsResponse(BaseModel):
    recommendations: List[JobRecommendation]
    total_count: int
    page: int
    limit: int
    
    class Config:
        from_attributes = True


class WorkerRecommendationsResponse(BaseModel):
    recommendations: List[WorkerRecommendation]
    total_count: int
    page: int
    limit: int
    
    class Config:
        from_attributes = True


class PriceSuggestionRequest(BaseModel):
    category: str = Field(..., description="Job category")
    location: str = Field(..., description="Job location")
    
    class Config:
        from_attributes = True


class JobAlertPreferences(BaseModel):
    categories: List[str] = Field(default_factory=list)
    max_distance_km: Optional[float] = Field(None, ge=0)
    min_budget: Optional[float] = Field(None, ge=0)
    max_budget: Optional[float] = Field(None, ge=0)
    notification_frequency: str = Field(default="immediate")  # immediate, daily, weekly
    
    class Config:
        from_attributes = True


class JobAlertPreferencesResponse(BaseModel):
    preferences: JobAlertPreferences
    
    class Config:
        from_attributes = True


class RecommendationStats(BaseModel):
    total_recommendations_generated: int
    total_feedback_received: int
    average_recommendation_score: float
    click_through_rate: float
    conversion_rate: float  # applications/hires from recommendations
    
    class Config:
        from_attributes = True