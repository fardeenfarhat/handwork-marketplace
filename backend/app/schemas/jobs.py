from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum

from app.db.models import JobStatus, ApplicationStatus


class JobCategory(str, Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    CONSTRUCTION = "construction"
    CLEANING = "cleaning"
    AC_REPAIR = "ac_repair"
    HVAC = "hvac"
    PAINTING = "painting"
    CARPENTRY = "carpentry"
    LANDSCAPING = "landscaping"
    ROOFING = "roofing"
    FLOORING = "flooring"
    HANDYMAN = "handyman"
    OTHER = "other"


class JobBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    category: JobCategory
    budget_min: Decimal = Field(..., gt=0, le=999999.99)
    budget_max: Decimal = Field(..., gt=0, le=999999.99)
    location: str = Field(..., min_length=3, max_length=200)
    preferred_date: Optional[datetime] = None
    requirements: Optional[Dict[str, Any]] = None

    @validator('budget_max')
    def validate_budget_range(cls, v, values):
        if 'budget_min' in values and v < values['budget_min']:
            raise ValueError('budget_max must be greater than or equal to budget_min')
        return v

    @validator('preferred_date')
    def validate_preferred_date(cls, v):
        if v:
            # Handle timezone-aware vs timezone-naive datetime comparison
            from datetime import timezone, timedelta
            
            if v.tzinfo is not None:
                # If the input datetime is timezone-aware, make now timezone-aware too
                now = datetime.now(timezone.utc)
                # Convert v to UTC if it's not already
                if v.tzinfo != timezone.utc:
                    v = v.astimezone(timezone.utc)
            else:
                # If input is timezone-naive, ensure now is also timezone-naive
                now = datetime.now()
            
            # Add a small buffer (1 minute) to account for processing time
            if v < (now - timedelta(minutes=1)):
                raise ValueError('preferred_date cannot be in the past')
        return v


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    category: Optional[JobCategory] = None
    budget_min: Optional[Decimal] = Field(None, gt=0, le=999999.99)
    budget_max: Optional[Decimal] = Field(None, gt=0, le=999999.99)
    location: Optional[str] = Field(None, min_length=3, max_length=200)
    preferred_date: Optional[datetime] = None
    requirements: Optional[Dict[str, Any]] = None
    status: Optional[JobStatus] = None

    @validator('budget_max')
    def validate_budget_range(cls, v, values):
        if v and 'budget_min' in values and values['budget_min'] and v < values['budget_min']:
            raise ValueError('budget_max must be greater than or equal to budget_min')
        return v

    @validator('preferred_date')
    def validate_preferred_date(cls, v):
        if v:
            # Handle timezone-aware vs timezone-naive datetime comparison
            from datetime import timezone, timedelta
            
            if v.tzinfo is not None:
                # If the input datetime is timezone-aware, make now timezone-aware too
                now = datetime.now(timezone.utc)
                # Convert v to UTC if it's not already
                if v.tzinfo != timezone.utc:
                    v = v.astimezone(timezone.utc)
            else:
                # If input is timezone-naive, ensure now is also timezone-naive
                now = datetime.now()
            
            # Add a small buffer (1 minute) to account for processing time
            if v < (now - timedelta(minutes=1)):
                raise ValueError('preferred_date cannot be in the past')
        return v


class JobStatusUpdate(BaseModel):
    status: JobStatus


class JobFilters(BaseModel):
    category: Optional[JobCategory] = None
    budget_min: Optional[Decimal] = None
    budget_max: Optional[Decimal] = None
    location: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: Optional[float] = Field(None, gt=0, le=1000)
    search: Optional[str] = None
    status: Optional[JobStatus] = JobStatus.OPEN
    page: int = Field(1, ge=1)
    limit: int = Field(10, ge=1, le=100)


class JobResponse(BaseModel):
    id: int
    client_id: int
    title: str
    description: str
    category: str
    budget_min: Decimal
    budget_max: Decimal
    location: str
    preferred_date: Optional[datetime]
    status: JobStatus
    requirements: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    distance_km: Optional[float] = None
    application_count: Optional[int] = None
    client_name: Optional[str] = None
    client_rating: Optional[float] = None
    client_review_count: Optional[int] = None
    client_user_id: Optional[int] = None

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    jobs: List[JobResponse]
    total: int
    page: int
    limit: int
    has_next: bool


# Job Application Schemas
class JobApplicationBase(BaseModel):
    message: Optional[str] = Field(None, max_length=1000)
    proposed_rate: Optional[Decimal] = Field(None, gt=0, le=999999.99)
    proposed_start_date: Optional[datetime] = None

    @validator('proposed_start_date')
    def validate_proposed_start_date(cls, v):
        if v:
            # Handle timezone-aware vs timezone-naive datetime comparison
            from datetime import timezone, timedelta
            
            if v.tzinfo is not None:
                # If the input datetime is timezone-aware, make now timezone-aware too
                now = datetime.now(timezone.utc)
                # Convert v to UTC if it's not already
                if v.tzinfo != timezone.utc:
                    v = v.astimezone(timezone.utc)
            else:
                # If input is timezone-naive, ensure now is also timezone-naive
                now = datetime.now()
            
            # Add a small buffer (1 minute) to account for processing time
            if v < (now - timedelta(minutes=1)):
                raise ValueError('proposed_start_date cannot be in the past')
        return v


class JobApplicationCreate(JobApplicationBase):
    pass


class JobApplicationUpdate(BaseModel):
    message: Optional[str] = Field(None, max_length=1000)
    proposed_rate: Optional[Decimal] = Field(None, gt=0, le=999999.99)
    proposed_start_date: Optional[datetime] = None
    status: Optional[ApplicationStatus] = None

    @validator('proposed_start_date')
    def validate_proposed_start_date(cls, v):
        if v:
            # Handle timezone-aware vs timezone-naive datetime comparison
            from datetime import timezone, timedelta
            
            if v.tzinfo is not None:
                # If the input datetime is timezone-aware, make now timezone-aware too
                now = datetime.now(timezone.utc)
                # Convert v to UTC if it's not already
                if v.tzinfo != timezone.utc:
                    v = v.astimezone(timezone.utc)
            else:
                # If input is timezone-naive, ensure now is also timezone-naive
                now = datetime.now()
            
            # Add a small buffer (1 minute) to account for processing time
            if v < (now - timedelta(minutes=1)):
                raise ValueError('proposed_start_date cannot be in the past')
        return v


class JobApplicationResponse(BaseModel):
    id: int
    job_id: int
    worker_id: int
    message: Optional[str]
    proposed_rate: Optional[Decimal]
    proposed_start_date: Optional[datetime]
    status: ApplicationStatus
    created_at: datetime
    worker_name: Optional[str] = None
    worker_rating: Optional[float] = None
    worker_skills: Optional[List[str]] = None

    class Config:
        from_attributes = True


class JobApplicationListResponse(BaseModel):
    applications: List[JobApplicationResponse]
    total: int


# Job Invitation Schemas
class JobInvitationCreate(BaseModel):
    worker_id: int
    message: Optional[str] = Field(None, max_length=1000)
    proposed_rate: Optional[Decimal] = Field(None, gt=0, le=999999.99)


class JobInvitationResponse(BaseModel):
    success: bool
    message: str
    application_id: Optional[int] = None