from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum


class DashboardStats(BaseModel):
    total_jobs: int = 0
    completed_jobs: int = 0
    active_jobs: int = 0
    total_earnings: float = 0.0
    average_rating: float = 0.0
    total_reviews: int = 0
    unread_messages: int = 0


class ActivityType(str, Enum):
    JOB_APPLIED = "job_applied"
    JOB_COMPLETED = "job_completed"
    MESSAGE_RECEIVED = "message_received"
    PAYMENT_RECEIVED = "payment_received"
    REVIEW_RECEIVED = "review_received"


class RecentActivity(BaseModel):
    id: str
    type: ActivityType
    title: str
    description: str
    timestamp: datetime
    amount: Optional[float] = None


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_activity: List[RecentActivity]