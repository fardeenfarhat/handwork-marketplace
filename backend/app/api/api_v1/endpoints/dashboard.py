from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard data for current user"""
    try:
        dashboard_service = DashboardService(db)
        
        is_worker = current_user.role == "worker"
        
        if is_worker:
            stats = dashboard_service.get_worker_dashboard_stats(current_user.id)
        else:
            stats = dashboard_service.get_client_dashboard_stats(current_user.id)
        
        recent_activity = dashboard_service.get_recent_activity(
            current_user.id, 
            is_worker, 
            limit=10
        )
        
        return DashboardResponse(
            stats=stats,
            recent_activity=recent_activity
        )
    except Exception as e:
        print(f"Dashboard error: {e}")
        # Return empty stats on error to prevent crashes
        from app.schemas.dashboard import DashboardStats
        return DashboardResponse(
            stats=DashboardStats(),
            recent_activity=[]
        )