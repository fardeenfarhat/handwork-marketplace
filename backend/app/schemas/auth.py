from typing import Optional
from pydantic import BaseModel, EmailStr, validator
from app.db.models import UserRole

# Request schemas
class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    first_name: str
    last_name: str
    phone: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OAuthLogin(BaseModel):
    provider: str  # google, facebook, apple
    access_token: str
    role: UserRole
    
    @validator('provider')
    def validate_provider(cls, v):
        if v not in ['google', 'facebook', 'apple']:
            raise ValueError('Invalid OAuth provider')
        return v

class EmailVerificationRequest(BaseModel):
    email: EmailStr

class PhoneVerificationRequest(BaseModel):
    phone: str
    
    @validator('phone')
    def validate_phone(cls, v):
        # Basic phone validation - can be enhanced
        if not v.replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise ValueError('Invalid phone number format')
        return v

class VerifyTokenRequest(BaseModel):
    token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Response schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    first_name: str
    last_name: str
    phone: Optional[str] = None
    is_verified: bool
    is_active: bool
    email_verified: bool
    phone_verified: bool
    
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    user: UserResponse
    token: Token

class MessageResponse(BaseModel):
    message: str
    success: bool = True

class VerificationStatusResponse(BaseModel):
    email_verified: bool
    phone_verified: bool
    is_verified: bool