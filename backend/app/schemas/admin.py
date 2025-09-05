from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.db.models import UserRole, JobStatus, PaymentStatus, ReviewStatus, DisputeStatus, KYCStatus

# Admin Authentication
class AdminLogin(BaseModel):
    email: str
    password: str

class AdminResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

# User Management
class UserOverview(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: UserRole
    is_verified: bool
    is_active: bool
    created_at: datetime
    total_jobs: Optional[int] = 0
    rating: Optional[float] = 0.0

class UserDetail(BaseModel):
    id: int
    email: str
    phone: Optional[str]
    first_name: str
    last_name: str
    role: UserRole
    is_verified: bool
    is_active: bool
    email_verified: bool
    phone_verified: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Profile information
    worker_profile: Optional[Dict[str, Any]] = None
    client_profile: Optional[Dict[str, Any]] = None
    
    # Statistics
    total_jobs: int = 0
    total_earnings: Optional[float] = 0.0
    total_spent: Optional[float] = 0.0
    rating: Optional[float] = 0.0
    total_reviews: int = 0

class UserAction(BaseModel):
    action: str = Field(..., description="Action to perform: activate, deactivate, verify, suspend")
    reason: Optional[str] = Field(None, description="Reason for the action")

# Job Management
class JobOverview(BaseModel):
    id: int
    title: str
    category: str
    status: JobStatus
    budget_min: float
    budget_max: float
    location: str
    client_name: str
    worker_name: Optional[str] = None
    created_at: datetime
    applications_count: int = 0

class JobDetail(BaseModel):
    id: int
    title: str
    description: str
    category: str
    status: JobStatus
    budget_min: float
    budget_max: float
    location: str
    preferred_date: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Related information
    client: UserOverview
    worker: Optional[UserOverview] = None
    applications_count: int = 0
    messages_count: int = 0
    
class JobAction(BaseModel):
    action: str = Field(..., description="Action to perform: suspend, reactivate, close")
    reason: Optional[str] = Field(None, description="Reason for the action")

# Payment Management
class PaymentOverview(BaseModel):
    id: int
    booking_id: int
    amount: float
    platform_fee: float
    worker_amount: float
    status: PaymentStatus
    payment_method: str
    created_at: datetime
    client_name: str
    worker_name: str
    job_title: str

class PaymentDetail(BaseModel):
    id: int
    booking_id: int
    amount: float
    platform_fee: float
    worker_amount: float
    status: PaymentStatus
    payment_method: str
    stripe_payment_id: Optional[str]
    paypal_payment_id: Optional[str]
    created_at: datetime
    held_at: Optional[datetime]
    released_at: Optional[datetime]
    refunded_at: Optional[datetime]
    refund_reason: Optional[str]
    
    # Related information
    booking: Dict[str, Any]
    client: UserOverview
    worker: UserOverview

class PaymentAction(BaseModel):
    action: str = Field(..., description="Action to perform: hold, release, refund")
    reason: Optional[str] = Field(None, description="Reason for the action")
    refund_amount: Optional[float] = Field(None, description="Amount to refund (for partial refunds)")

# Dispute Management
class DisputeOverview(BaseModel):
    id: int
    payment_id: int
    reason: str
    status: DisputeStatus
    initiated_by_name: str
    created_at: datetime
    job_title: str
    amount: float

class DisputeDetail(BaseModel):
    id: int
    payment_id: int
    reason: str
    description: Optional[str]
    status: DisputeStatus
    resolution_notes: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime
    
    # Related information
    payment: PaymentDetail
    initiator: UserOverview
    resolver: Optional[UserOverview] = None

class DisputeResolution(BaseModel):
    resolution_notes: str
    action: str = Field(..., description="Action to take: resolve_for_client, resolve_for_worker, partial_refund")
    refund_amount: Optional[float] = Field(None, description="Amount to refund (for partial resolution)")

# Content Moderation
class ReviewOverview(BaseModel):
    id: int
    booking_id: int
    rating: int
    comment: Optional[str]
    status: ReviewStatus
    reviewer_name: str
    reviewee_name: str
    job_title: str
    created_at: datetime

class ReviewDetail(BaseModel):
    id: int
    booking_id: int
    rating: int
    comment: Optional[str]
    status: ReviewStatus
    created_at: datetime
    
    # Related information
    booking: Dict[str, Any]
    reviewer: UserOverview
    reviewee: UserOverview

class ReviewAction(BaseModel):
    action: str = Field(..., description="Action to perform: approve, reject, flag")
    reason: Optional[str] = Field(None, description="Reason for the action")

class KYCDocument(BaseModel):
    id: int
    worker_name: str
    status: KYCStatus
    documents: List[str]
    submitted_at: datetime

class KYCAction(BaseModel):
    action: str = Field(..., description="Action to perform: approve, reject")
    reason: Optional[str] = Field(None, description="Reason for the action")

# Analytics
class PlatformMetrics(BaseModel):
    total_users: int
    total_workers: int
    total_clients: int
    active_users_30d: int
    total_jobs: int
    active_jobs: int
    completed_jobs: int
    total_payments: float
    platform_revenue: float
    average_job_value: float
    user_growth_rate: float
    job_completion_rate: float

class UserGrowthData(BaseModel):
    date: str
    new_users: int
    total_users: int

class RevenueData(BaseModel):
    date: str
    revenue: float
    transaction_count: int

class JobCategoryStats(BaseModel):
    category: str
    job_count: int
    avg_budget: float
    completion_rate: float

class TopPerformers(BaseModel):
    top_workers: List[Dict[str, Any]]
    top_clients: List[Dict[str, Any]]

# Filters and Pagination
class UserFilters(BaseModel):
    role: Optional[UserRole] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    search: Optional[str] = None

class JobFilters(BaseModel):
    status: Optional[JobStatus] = None
    category: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    min_budget: Optional[float] = None
    max_budget: Optional[float] = None
    search: Optional[str] = None

class PaymentFilters(BaseModel):
    status: Optional[PaymentStatus] = None
    payment_method: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None

class DisputeFilters(BaseModel):
    status: Optional[DisputeStatus] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

class ReviewFilters(BaseModel):
    status: Optional[ReviewStatus] = None
    min_rating: Optional[int] = None
    max_rating: Optional[int] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int