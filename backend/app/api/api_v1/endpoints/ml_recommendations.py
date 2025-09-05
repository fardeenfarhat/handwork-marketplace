from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User, UserRole
# ML service import - optional dependency
try:
    from app.services.ml_recommendation_service import MLRecommendationService
    ML_AVAILABLE = True
except ImportError:
    MLRecommendationService = None
    ML_AVAILABLE = False

router = APIRouter()


@router.post("/train/job-recommendations")
async def train_job_recommendation_model(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Train the job recommendation ML model using historical data
    Admin only endpoint
    """
    # In production, this would be admin-only
    # For now, allow any authenticated user for testing
    
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="Machine learning features not available")
    
    ml_service = MLRecommendationService(db)
    training_results = ml_service.train_job_recommendation_model()
    
    return {
        "message": "Job recommendation model training completed",
        "results": training_results
    }


@router.post("/train/worker-recommendations")
async def train_worker_recommendation_model(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Train the worker recommendation ML model using historical data
    Admin only endpoint
    """
    # In production, this would be admin-only
    # For now, allow any authenticated user for testing
    
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="Machine learning features not available")
    
    ml_service = MLRecommendationService(db)
    training_results = ml_service.train_worker_recommendation_model()
    
    return {
        "message": "Worker recommendation model training completed",
        "results": training_results
    }


@router.post("/process-feedback")
async def process_recommendation_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Process accumulated feedback to improve model accuracy
    Admin only endpoint
    """
    # In production, this would be admin-only
    # For now, allow any authenticated user for testing
    
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="Machine learning features not available")
    
    ml_service = MLRecommendationService(db)
    processing_results = ml_service.process_feedback_for_learning()
    
    return {
        "message": "Feedback processing completed",
        "results": processing_results
    }


@router.get("/model-status")
async def get_model_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get the status of ML models (loaded, training metrics, etc.)
    """
    status = {
        "ml_available": ML_AVAILABLE,
        "job_model_loaded": False,
        "worker_model_loaded": False,
        "scaler_loaded": False,
        "sklearn_available": ML_AVAILABLE
    }
    
    if ML_AVAILABLE:
        ml_service = MLRecommendationService(db)
        status.update({
            "job_model_loaded": ml_service.job_model is not None,
            "worker_model_loaded": ml_service.worker_model is not None,
            "scaler_loaded": ml_service.scaler is not None,
        })
    
    try:
        from sklearn import __version__ as sklearn_version
        status["sklearn_version"] = sklearn_version
    except ImportError:
        status["sklearn_available"] = False
        status["sklearn_version"] = None
    
    return status


@router.post("/predict/job-score")
async def predict_job_recommendation_score(
    job_id: int,
    worker_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get ML model prediction for a specific job-worker pair
    For testing and debugging purposes
    """
    if not ML_AVAILABLE:
        return {
            "job_id": job_id,
            "worker_id": worker_id,
            "ml_prediction": None,
            "model_available": False,
            "error": "Machine learning features not available"
        }
    
    ml_service = MLRecommendationService(db)
    
    # Get prediction from ML model
    ml_score = ml_service.predict_job_recommendation_score(job_id, worker_id)
    
    return {
        "job_id": job_id,
        "worker_id": worker_id,
        "ml_prediction": ml_score,
        "model_available": ml_score is not None
    }


@router.post("/predict/worker-score")
async def predict_worker_recommendation_score(
    worker_id: int,
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get ML model prediction for a specific worker-job pair
    For testing and debugging purposes
    """
    if not ML_AVAILABLE:
        return {
            "worker_id": worker_id,
            "job_id": job_id,
            "ml_prediction": None,
            "model_available": False,
            "error": "Machine learning features not available"
        }
    
    ml_service = MLRecommendationService(db)
    
    # Get prediction from ML model
    ml_score = ml_service.predict_worker_recommendation_score(worker_id, job_id)
    
    return {
        "worker_id": worker_id,
        "job_id": job_id,
        "ml_prediction": ml_score,
        "model_available": ml_score is not None
    }