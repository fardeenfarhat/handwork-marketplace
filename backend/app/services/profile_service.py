from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from datetime import datetime

from app.db.models import User, WorkerProfile, ClientProfile, UserRole, KYCStatus
from app.schemas.profiles import (
    WorkerProfileCreate, WorkerProfileUpdate, ClientProfileCreate, ClientProfileUpdate,
    WorkerProfileResponse, ClientProfileResponse, ProfileCompletionStatus,
    KYCStatusUpdate, UserProfileSummary
)
from app.services.file_storage import file_storage


class ProfileService:
    """Service for managing user profiles"""
    
    # Required fields for profile completion
    WORKER_REQUIRED_FIELDS = {
        'bio': 'Bio/Description',
        'skills': 'Skills',
        'service_categories': 'Service Categories',
        'hourly_rate': 'Hourly Rate',
        'location': 'Location',
        'kyc_status': 'KYC Verification'
    }
    
    CLIENT_REQUIRED_FIELDS = {
        'location': 'Location',
        'description': 'Description'
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def _calculate_worker_profile_completion(self, profile: WorkerProfile) -> ProfileCompletionStatus:
        """Calculate worker profile completion percentage and missing fields"""
        completed_fields = []
        missing_fields = []
        
        # Check each required field
        if profile.bio and profile.bio.strip():
            completed_fields.append('bio')
        else:
            missing_fields.append(self.WORKER_REQUIRED_FIELDS['bio'])
        
        if profile.skills and len(profile.skills) > 0:
            completed_fields.append('skills')
        else:
            missing_fields.append(self.WORKER_REQUIRED_FIELDS['skills'])
        
        if profile.service_categories and len(profile.service_categories) > 0:
            completed_fields.append('service_categories')
        else:
            missing_fields.append(self.WORKER_REQUIRED_FIELDS['service_categories'])
        
        if profile.hourly_rate and profile.hourly_rate > 0:
            completed_fields.append('hourly_rate')
        else:
            missing_fields.append(self.WORKER_REQUIRED_FIELDS['hourly_rate'])
        
        if profile.location and profile.location.strip():
            completed_fields.append('location')
        else:
            missing_fields.append(self.WORKER_REQUIRED_FIELDS['location'])
        
        if profile.kyc_status == KYCStatus.APPROVED:
            completed_fields.append('kyc_status')
        else:
            missing_fields.append(self.WORKER_REQUIRED_FIELDS['kyc_status'])
        
        # Calculate percentage
        total_fields = len(self.WORKER_REQUIRED_FIELDS)
        completed_count = len(completed_fields)
        completion_percentage = int((completed_count / total_fields) * 100)
        
        return ProfileCompletionStatus(
            completion_percentage=completion_percentage,
            is_complete=completion_percentage == 100,
            missing_fields=missing_fields,
            required_fields=list(self.WORKER_REQUIRED_FIELDS.values()),
            completed_fields=[self.WORKER_REQUIRED_FIELDS[field] for field in completed_fields]
        )
    
    def _calculate_client_profile_completion(self, profile: ClientProfile) -> ProfileCompletionStatus:
        """Calculate client profile completion percentage and missing fields"""
        completed_fields = []
        missing_fields = []
        
        # Check each required field
        if profile.location and profile.location.strip():
            completed_fields.append('location')
        else:
            missing_fields.append(self.CLIENT_REQUIRED_FIELDS['location'])
        
        if profile.description and profile.description.strip():
            completed_fields.append('description')
        else:
            missing_fields.append(self.CLIENT_REQUIRED_FIELDS['description'])
        
        # Calculate percentage
        total_fields = len(self.CLIENT_REQUIRED_FIELDS)
        completed_count = len(completed_fields)
        completion_percentage = int((completed_count / total_fields) * 100)
        
        return ProfileCompletionStatus(
            completion_percentage=completion_percentage,
            is_complete=completion_percentage == 100,
            missing_fields=missing_fields,
            required_fields=list(self.CLIENT_REQUIRED_FIELDS.values()),
            completed_fields=[self.CLIENT_REQUIRED_FIELDS[field] for field in completed_fields]
        )
    
    def create_worker_profile(self, user: User, profile_data: WorkerProfileCreate) -> WorkerProfileResponse:
        """Create a new worker profile"""
        if user.role != UserRole.WORKER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workers can create worker profiles"
            )
        
        # Check if profile already exists
        existing_profile = self.db.query(WorkerProfile).filter(
            WorkerProfile.user_id == user.id
        ).first()
        
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Worker profile already exists"
            )
        
        # Create new profile
        profile = WorkerProfile(
            user_id=user.id,
            bio=profile_data.bio,
            skills=profile_data.skills,
            service_categories=profile_data.service_categories,
            hourly_rate=profile_data.hourly_rate,
            location=profile_data.location,
            portfolio_images=[],
            kyc_documents=[]
        )
        
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        
        # Calculate completion status
        completion_status = self._calculate_worker_profile_completion(profile)
        
        return WorkerProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            bio=profile.bio,
            skills=profile.skills or [],
            service_categories=profile.service_categories or [],
            hourly_rate=profile.hourly_rate,
            location=profile.location,
            portfolio_images=profile.portfolio_images or [],
            kyc_status=profile.kyc_status,
            rating=profile.rating,
            total_jobs=profile.total_jobs,
            created_at=profile.created_at,
            profile_completion_percentage=completion_status.completion_percentage,
            is_profile_complete=completion_status.is_complete,
            missing_fields=completion_status.missing_fields
        )
    
    def create_client_profile(self, user: User, profile_data: ClientProfileCreate) -> ClientProfileResponse:
        """Create a new client profile"""
        if user.role != UserRole.CLIENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only clients can create client profiles"
            )
        
        # Check if profile already exists
        existing_profile = self.db.query(ClientProfile).filter(
            ClientProfile.user_id == user.id
        ).first()
        
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client profile already exists"
            )
        
        # Create new profile
        profile = ClientProfile(
            user_id=user.id,
            company_name=profile_data.company_name,
            description=profile_data.description,
            location=profile_data.location
        )
        
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        
        # Calculate completion status
        completion_status = self._calculate_client_profile_completion(profile)
        
        return ClientProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            company_name=profile.company_name,
            description=profile.description,
            location=profile.location,
            rating=profile.rating,
            total_jobs_posted=profile.total_jobs_posted,
            created_at=profile.created_at,
            profile_completion_percentage=completion_status.completion_percentage,
            is_profile_complete=completion_status.is_complete,
            missing_fields=completion_status.missing_fields
        )
    
    def get_profile_completion_status(self, user: User) -> ProfileCompletionStatus:
        """Get profile completion status for user"""
        if user.role == UserRole.WORKER:
            profile = self.db.query(WorkerProfile).filter(
                WorkerProfile.user_id == user.id
            ).first()
            
            if not profile:
                return ProfileCompletionStatus(
                    completion_percentage=0,
                    is_complete=False,
                    missing_fields=list(self.WORKER_REQUIRED_FIELDS.values()),
                    required_fields=list(self.WORKER_REQUIRED_FIELDS.values()),
                    completed_fields=[]
                )
            
            return self._calculate_worker_profile_completion(profile)
        
        elif user.role == UserRole.CLIENT:
            profile = self.db.query(ClientProfile).filter(
                ClientProfile.user_id == user.id
            ).first()
            
            if not profile:
                return ProfileCompletionStatus(
                    completion_percentage=0,
                    is_complete=False,
                    missing_fields=list(self.CLIENT_REQUIRED_FIELDS.values()),
                    required_fields=list(self.CLIENT_REQUIRED_FIELDS.values()),
                    completed_fields=[]
                )
            
            return self._calculate_client_profile_completion(profile)
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user role"
            )
    
    def get_user_profile(self, user: User, target_user_id: Optional[int] = None) -> UserProfileSummary:
        """Get user profile with role-based data filtering"""
        # If target_user_id is provided, get that user's profile, otherwise get current user's profile
        if target_user_id:
            target_user = self.db.query(User).filter(User.id == target_user_id).first()
            if not target_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
        else:
            target_user = user
        
        # Get role-specific profile
        worker_profile = None
        client_profile = None
        completion_percentage = 0
        is_complete = False
        
        if target_user.role == UserRole.WORKER:
            profile = self.db.query(WorkerProfile).filter(
                WorkerProfile.user_id == target_user.id
            ).first()
            
            if profile:
                completion_status = self._calculate_worker_profile_completion(profile)
                completion_percentage = completion_status.completion_percentage
                is_complete = completion_status.is_complete
                
                worker_profile = WorkerProfileResponse(
                    id=profile.id,
                    user_id=profile.user_id,
                    bio=profile.bio,
                    skills=profile.skills or [],
                    service_categories=profile.service_categories or [],
                    hourly_rate=profile.hourly_rate,
                    location=profile.location,
                    portfolio_images=profile.portfolio_images or [],
                    kyc_status=profile.kyc_status,
                    rating=profile.rating,
                    total_jobs=profile.total_jobs,
                    created_at=profile.created_at,
                    profile_completion_percentage=completion_status.completion_percentage,
                    is_profile_complete=completion_status.is_complete,
                    missing_fields=completion_status.missing_fields
                )
        
        elif target_user.role == UserRole.CLIENT:
            profile = self.db.query(ClientProfile).filter(
                ClientProfile.user_id == target_user.id
            ).first()
            
            if profile:
                completion_status = self._calculate_client_profile_completion(profile)
                completion_percentage = completion_status.completion_percentage
                is_complete = completion_status.is_complete
                
                client_profile = ClientProfileResponse(
                    id=profile.id,
                    user_id=profile.user_id,
                    company_name=profile.company_name,
                    description=profile.description,
                    location=profile.location,
                    rating=profile.rating,
                    total_jobs_posted=profile.total_jobs_posted,
                    created_at=profile.created_at,
                    profile_completion_percentage=completion_status.completion_percentage,
                    is_profile_complete=completion_status.is_complete,
                    missing_fields=completion_status.missing_fields
                )
        
        return UserProfileSummary(
            user_id=target_user.id,
            role=target_user.role,
            first_name=target_user.first_name,
            last_name=target_user.last_name,
            email=target_user.email if target_user.id == user.id else None,  # Only show email for own profile
            is_verified=target_user.is_verified,
            profile_completion_percentage=completion_percentage,
            is_profile_complete=is_complete,
            worker_profile=worker_profile,
            client_profile=client_profile
        )
    
    def update_worker_profile(self, user: User, profile_data: WorkerProfileUpdate) -> WorkerProfileResponse:
        """Update worker profile"""
        if user.role != UserRole.WORKER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workers can update worker profiles"
            )
        
        profile = self.db.query(WorkerProfile).filter(
            WorkerProfile.user_id == user.id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker profile not found"
            )
        
        # Update fields if provided
        update_data = profile_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        
        self.db.commit()
        self.db.refresh(profile)
        
        # Calculate completion status
        completion_status = self._calculate_worker_profile_completion(profile)
        
        return WorkerProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            bio=profile.bio,
            skills=profile.skills or [],
            service_categories=profile.service_categories or [],
            hourly_rate=profile.hourly_rate,
            location=profile.location,
            portfolio_images=profile.portfolio_images or [],
            kyc_status=profile.kyc_status,
            rating=profile.rating,
            total_jobs=profile.total_jobs,
            created_at=profile.created_at,
            profile_completion_percentage=completion_status.completion_percentage,
            is_profile_complete=completion_status.is_complete,
            missing_fields=completion_status.missing_fields
        )
    
    def update_client_profile(self, user: User, profile_data: ClientProfileUpdate) -> ClientProfileResponse:
        """Update client profile"""
        if user.role != UserRole.CLIENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only clients can update client profiles"
            )
        
        profile = self.db.query(ClientProfile).filter(
            ClientProfile.user_id == user.id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client profile not found"
            )
        
        # Update fields if provided
        update_data = profile_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        
        self.db.commit()
        self.db.refresh(profile)
        
        # Calculate completion status
        completion_status = self._calculate_client_profile_completion(profile)
        
        return ClientProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            company_name=profile.company_name,
            description=profile.description,
            location=profile.location,
            rating=profile.rating,
            total_jobs_posted=profile.total_jobs_posted,
            created_at=profile.created_at,
            profile_completion_percentage=completion_status.completion_percentage,
            is_profile_complete=completion_status.is_complete,
            missing_fields=completion_status.missing_fields
        )
def get_profile_service(db: Session) -> ProfileService:
    """Dependency to get profile service instance"""
    return ProfileService(db)