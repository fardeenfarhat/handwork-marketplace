from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from app.db.models import KYCStatus, UserRole


class ProfileImageUpload(BaseModel):
    """Schema for profile image upload"""
    filename: str
    content_type: str
    size: int


class KYCDocumentUpload(BaseModel):
    """Schema for KYC document upload"""
    document_type: str = Field(..., description="Type of document (id_card, passport, driver_license, etc.)")
    filename: str
    content_type: str
    size: int


class WorkerProfileCreate(BaseModel):
    """Schema for creating worker profile"""
    bio: Optional[str] = Field(None, max_length=2000, description="Worker bio/description")
    skills: List[str] = Field(default_factory=list, description="List of worker skills")
    service_categories: List[str] = Field(..., min_items=1, description="Service categories worker provides")
    hourly_rate: Optional[float] = Field(None, ge=0, description="Hourly rate in USD")
    location: str = Field(..., min_length=1, description="Worker location")
    
    @validator('skills')
    def validate_skills(cls, v):
        if v and len(v) > 50:
            raise ValueError('Maximum 50 skills allowed')
        return v
    
    @validator('service_categories')
    def validate_service_categories(cls, v):
        if len(v) > 10:
            raise ValueError('Maximum 10 service categories allowed')
        return v


class WorkerProfileUpdate(BaseModel):
    """Schema for updating worker profile"""
    bio: Optional[str] = Field(None, max_length=2000)
    skills: Optional[List[str]] = None
    service_categories: Optional[List[str]] = None
    hourly_rate: Optional[float] = Field(None, ge=0)
    location: Optional[str] = None
    
    @validator('skills')
    def validate_skills(cls, v):
        if v and len(v) > 50:
            raise ValueError('Maximum 50 skills allowed')
        return v
    
    @validator('service_categories')
    def validate_service_categories(cls, v):
        if v and len(v) > 10:
            raise ValueError('Maximum 10 service categories allowed')
        return v


class ClientProfileCreate(BaseModel):
    """Schema for creating client profile"""
    company_name: Optional[str] = Field(None, max_length=200, description="Company name (optional)")
    description: Optional[str] = Field(None, max_length=2000, description="Company/client description")
    location: str = Field(..., min_length=1, description="Client location")


class ClientProfileUpdate(BaseModel):
    """Schema for updating client profile"""
    company_name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = None


class WorkerProfileResponse(BaseModel):
    """Schema for worker profile response"""
    id: int
    user_id: int
    bio: Optional[str]
    skills: List[str]
    service_categories: List[str]
    hourly_rate: Optional[float]
    location: str
    portfolio_images: List[str]
    kyc_status: KYCStatus
    rating: float
    total_jobs: int
    created_at: datetime
    
    # Profile completion fields
    profile_completion_percentage: int
    is_profile_complete: bool
    missing_fields: List[str]
    
    class Config:
        from_attributes = True


class ClientProfileResponse(BaseModel):
    """Schema for client profile response"""
    id: int
    user_id: int
    company_name: Optional[str]
    description: Optional[str]
    location: str
    rating: float
    total_jobs_posted: int
    created_at: datetime
    
    # Profile completion fields
    profile_completion_percentage: int
    is_profile_complete: bool
    missing_fields: List[str]
    
    class Config:
        from_attributes = True


class ProfileCompletionStatus(BaseModel):
    """Schema for profile completion status"""
    completion_percentage: int = Field(..., ge=0, le=100)
    is_complete: bool
    missing_fields: List[str]
    required_fields: List[str]
    completed_fields: List[str]


class KYCDocumentResponse(BaseModel):
    """Schema for KYC document response"""
    document_type: str
    filename: str
    upload_date: datetime
    status: str


class KYCStatusUpdate(BaseModel):
    """Schema for updating KYC status (admin only)"""
    status: KYCStatus
    rejection_reason: Optional[str] = None


class ProfileImageResponse(BaseModel):
    """Schema for profile image response"""
    filename: str
    url: str
    upload_date: datetime


class UserProfileSummary(BaseModel):
    """Schema for user profile summary (role-agnostic)"""
    user_id: int
    role: UserRole
    first_name: str
    last_name: str
    email: Optional[str]
    is_verified: bool
    profile_completion_percentage: int
    is_profile_complete: bool
    
    # Role-specific profile data
    worker_profile: Optional[WorkerProfileResponse] = None
    client_profile: Optional[ClientProfileResponse] = None
    
    class Config:
        from_attributes = True