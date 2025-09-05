from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User, WorkerProfile, ClientProfile, UserRole
from app.services.recommendation_service import RecommendationService
from app.services.notification_service import NotificationService
from app.services.job_alert_service import JobAlertService
from app.schemas.recommendations import (
    JobRecommendationsResponse, WorkerRecommendationsResponse,
    PriceSuggestion, PriceSuggestionRequest, RecommendationFeedback,
    RecommendationFeedbackResponse, JobAlertPreferences,
    JobAlertPreferencesResponse, RecommendationStats
)

router = APIRouter()


@router.get("/jobs", response_model=JobRecommendationsResponse)
async def get_job_recommendations(
    limit: int = Query(10, ge=1, le=50),
    page: int = Query(1, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get personalized job recommendations for a worker
    """
    if current_user.role != UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Only workers can get job recommendations")
    
    worker_profile = db.query(WorkerProfile).filter(
        WorkerProfile.user_id == current_user.id
    ).first()
    
    if not worker_profile:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    
    recommendation_service = RecommendationService(db)
    recommendations = recommendation_service.get_job_recommendations_for_worker(
        worker_profile.id, limit
    )
    
    return JobRecommendationsResponse(
        recommendations=recommendations,
        total_count=len(recommendations),
        page=page,
        limit=limit
    )


@router.get("/workers/{job_id}", response_model=WorkerRecommendationsResponse)
async def get_worker_recommendations(
    job_id: int,
    limit: int = Query(10, ge=1, le=50),
    page: int = Query(1, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get suggested workers for a specific job (clients only)
    """
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can get worker recommendations")
    
    client_profile = db.query(ClientProfile).filter(
        ClientProfile.user_id == current_user.id
    ).first()
    
    if not client_profile:
        raise HTTPException(status_code=404, detail="Client profile not found")
    
    recommendation_service = RecommendationService(db)
    recommendations = recommendation_service.get_worker_suggestions_for_job(
        job_id, client_profile.id, limit
    )
    
    return WorkerRecommendationsResponse(
        recommendations=recommendations,
        total_count=len(recommendations),
        page=page,
        limit=limit
    )


@router.post("/price-suggestions", response_model=PriceSuggestion)
async def get_price_suggestions(
    request: PriceSuggestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get market-based price suggestions for a job category and location
    """
    recommendation_service = RecommendationService(db)
    price_suggestion = recommendation_service.get_price_suggestions(
        request.category, request.location
    )
    
    return price_suggestion


@router.post("/feedback", response_model=RecommendationFeedbackResponse)
async def submit_recommendation_feedback(
    feedback: RecommendationFeedback,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit feedback on recommendations to improve future suggestions
    """
    if feedback.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only submit feedback for your own recommendations")
    
    recommendation_service = RecommendationService(db)
    success = recommendation_service.record_recommendation_feedback(feedback)
    
    if success:
        return RecommendationFeedbackResponse(
            success=True,
            message="Feedback recorded successfully"
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to record feedback")


@router.get("/alert-preferences", response_model=JobAlertPreferencesResponse)
async def get_job_alert_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get job alert preferences for a worker
    """
    if current_user.role != UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Only workers can manage job alert preferences")
    
    worker_profile = db.query(WorkerProfile).filter(
        WorkerProfile.user_id == current_user.id
    ).first()
    
    if not worker_profile:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    
    # For now, return default preferences
    # In production, you'd store these in the database
    preferences = JobAlertPreferences(
        categories=worker_profile.service_categories or [],
        max_distance_km=50.0,
        notification_frequency="immediate"
    )
    
    return JobAlertPreferencesResponse(preferences=preferences)


@router.put("/alert-preferences", response_model=JobAlertPreferencesResponse)
async def update_job_alert_preferences(
    preferences: JobAlertPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update job alert preferences for a worker
    """
    if current_user.role != UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Only workers can manage job alert preferences")
    
    worker_profile = db.query(WorkerProfile).filter(
        WorkerProfile.user_id == current_user.id
    ).first()
    
    if not worker_profile:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    
    # For now, we'll just return the preferences
    # In production, you'd store these in a preferences table
    return JobAlertPreferencesResponse(preferences=preferences)


@router.get("/stats", response_model=RecommendationStats)
async def get_recommendation_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recommendation system statistics (admin only)
    """
    # This would typically be admin-only
    # For now, return mock stats
    stats = RecommendationStats(
        total_recommendations_generated=1000,
        total_feedback_received=250,
        average_recommendation_score=0.75,
        click_through_rate=0.35,
        conversion_rate=0.15
    )
    
    return stats


@router.post("/jobs/{job_id}/alerts")
async def create_job_alerts(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create job alerts for relevant workers when a new job is posted
    This endpoint would typically be called internally when a job is created
    """
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can create job alerts")
    
    job_alert_service = JobAlertService(db)
    result = job_alert_service.send_job_alerts_for_new_job(job_id)
    
    return result


@router.post("/alerts/daily-digest")
async def send_daily_digest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send daily job digest to the current worker
    """
    if current_user.role != UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Only workers can receive job digests")
    
    job_alert_service = JobAlertService(db)
    result = job_alert_service.send_daily_job_digest(current_user.id)
    
    return result


@router.post("/alerts/weekly-digest")
async def send_weekly_digest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send weekly job market digest to the current worker
    """
    if current_user.role != UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Only workers can receive job digests")
    
    job_alert_service = JobAlertService(db)
    result = job_alert_service.send_weekly_job_digest(current_user.id)
    
    return result


@router.post("/alerts/price-alert/{category}")
async def send_price_alert(
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send price alert for a specific category to the current worker
    """
    if current_user.role != UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Only workers can receive price alerts")
    
    job_alert_service = JobAlertService(db)
    result = job_alert_service.send_price_alert(current_user.id, category)
    
    return result