from datetime import datetime, timedelta
from typing import Any
import logging
import asyncio
import time
from functools import wraps
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.database import get_db, get_user_for_login
from app.db.models import User, VerificationToken, OAuthAccount, TokenType, UserRole, WorkerProfile, ClientProfile
from app.schemas.auth import (
    UserRegistration, UserLogin, OAuthLogin, AuthResponse, Token, UserResponse,
    EmailVerificationRequest, PhoneVerificationRequest, VerifyTokenRequest,
    PasswordResetRequest, PasswordResetConfirm, RefreshTokenRequest,
    MessageResponse, VerificationStatusResponse
)
from app.core.security import (
    verify_password, get_password_hash, create_access_token, create_refresh_token,
    verify_token, generate_verification_token, generate_reset_token,
    create_verification_token_expires, create_reset_token_expires
)
from app.core.deps import get_current_user
from app.services.email import email_service
from app.services.sms import sms_service
from app.services.oauth import oauth_service
from app.core.config import settings
from app.core.security_audit import log_login_attempt
from app.core.login_optimization import get_user_for_authentication, login_monitor

logger = logging.getLogger(__name__)
router = APIRouter()

def registration_timeout(timeout_seconds: int = 10):
    """Decorator to ensure registration completes within specified timeout"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout_seconds)
            except asyncio.TimeoutError:
                logger.error(f"Registration timed out after {timeout_seconds} seconds")
                raise HTTPException(
                    status_code=status.HTTP_408_REQUEST_TIMEOUT,
                    detail=f"Registration process timed out after {timeout_seconds} seconds. Please try again."
                )
        return wrapper
    return decorator

def login_timeout(timeout_seconds: int = 5):
    """Decorator to ensure login completes within specified timeout"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout_seconds)
            except asyncio.TimeoutError:
                logger.error(f"Login timed out after {timeout_seconds} seconds")
                raise HTTPException(
                    status_code=status.HTTP_408_REQUEST_TIMEOUT,
                    detail=f"Login process timed out after {timeout_seconds} seconds. Please try again."
                )
        return wrapper
    return decorator

async def _send_verification_email_async(email: str, token: str, user_name: str, user_id: int):
    """Send verification email asynchronously without blocking registration"""
    try:
        print(f"📧 Sending verification email to {email} (User ID: {user_id})...")
        start_time = asyncio.get_event_loop().time()
        
        email_sent = await email_service.send_verification_email(email, token, user_name)
        
        end_time = asyncio.get_event_loop().time()
        duration = end_time - start_time
        
        if email_sent:
            print(f"✅ Verification email sent successfully to {email} in {duration:.2f}s")
            logger.info(f"Verification email sent successfully to user {user_id} ({email}) in {duration:.2f}s")
        else:
            print(f"⚠️ Email sending failed for {email} after {duration:.2f}s")
            logger.warning(f"Failed to send verification email to user {user_id} ({email}) after {duration:.2f}s - registration completed successfully")
    except asyncio.TimeoutError:
        print(f"⚠️ Email service timeout for {email}")
        logger.error(f"Email service timeout for user {user_id} ({email}) - registration completed successfully")
    except Exception as e:
        print(f"⚠️ Email service error for {email}: {str(e)}")
        logger.error(f"Email service error for user {user_id} ({email}): {str(e)} - registration completed successfully")
        # Log full traceback for debugging
        import traceback
        logger.debug(f"Email service traceback for user {user_id}: {traceback.format_exc()}")

async def _send_password_reset_email_async(email: str, token: str, user_name: str, user_id: int):
    """Send password reset email asynchronously without blocking the request"""
    try:
        print(f"📧 Sending password reset email to {email} (User ID: {user_id})...")
        start_time = asyncio.get_event_loop().time()
        
        email_sent = await email_service.send_password_reset_email(email, token, user_name)
        
        end_time = asyncio.get_event_loop().time()
        duration = end_time - start_time
        
        if email_sent:
            print(f"✅ Password reset email sent successfully to {email} in {duration:.2f}s")
            logger.info(f"Password reset email sent successfully to user {user_id} ({email}) in {duration:.2f}s")
        else:
            print(f"⚠️ Password reset email sending failed for {email} after {duration:.2f}s")
            logger.warning(f"Failed to send password reset email to user {user_id} ({email}) after {duration:.2f}s - request completed successfully")
    except asyncio.TimeoutError:
        print(f"⚠️ Password reset email service timeout for {email}")
        logger.error(f"Password reset email service timeout for user {user_id} ({email}) - request completed successfully")
    except Exception as e:
        print(f"⚠️ Password reset email service error for {email}: {str(e)}")
        logger.error(f"Password reset email service error for user {user_id} ({email}): {str(e)} - request completed successfully")
        # Log full traceback for debugging
        import traceback
        logger.debug(f"Password reset email service traceback for user {user_id}: {traceback.format_exc()}")

@router.post("/register", response_model=AuthResponse)
@registration_timeout(timeout_seconds=10)
async def register_user(
    user_data: UserRegistration,
    db: Session = Depends(get_db)
):
    """Register a new user with role selection"""
    
    print("🚀 REGISTRATION ENDPOINT CALLED")
    print(f"📧 Email: {user_data.email}")
    print(f"👤 Name: {user_data.first_name} {user_data.last_name}")
    print(f"🎭 Role: {user_data.role}")
    print(f"📱 Phone: {user_data.phone}")
    
    # Check if user already exists
    print("🔍 Checking if user already exists...")
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        print(f"❌ User already exists with email: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    print("✅ Email is available")
    
    # Check phone number if provided
    if user_data.phone:
        print(f"📱 Checking phone number: {user_data.phone}")
        existing_phone = db.query(User).filter(User.phone == user_data.phone).first()
        if existing_phone:
            print(f"❌ Phone number already exists: {user_data.phone}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
        print("✅ Phone number is available")
    
    # Create new user
    print("🔐 Hashing password...")
    hashed_password = get_password_hash(user_data.password)
    print("✅ Password hashed successfully")
    
    print("👤 Creating user object...")
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        is_verified=False,
        email_verified=False,
        phone_verified=False if user_data.phone else True
    )
    
    print("💾 Adding user to database...")
    db.add(db_user)
    print("💾 Committing user to database...")
    db.commit()
    print("🔄 Refreshing user object...")
    db.refresh(db_user)
    print(f"✅ User created with ID: {db_user.id}")
    
    # Create role-specific profile
    print(f"🎭 Creating {user_data.role} profile...")
    if user_data.role == UserRole.WORKER:
        worker_profile = WorkerProfile(user_id=db_user.id)
        db.add(worker_profile)
        print("✅ Worker profile created")
    else:
        client_profile = ClientProfile(user_id=db_user.id)
        db.add(client_profile)
        print("✅ Client profile created")
    
    print("💾 Committing profile to database...")
    db.commit()
    print("✅ Profile committed successfully")
    
    # Generate email verification token
    print("🎫 Generating email verification token...")
    verification_token = generate_verification_token()
    token_expires = create_verification_token_expires()
    print(f"✅ Verification token generated: {verification_token}")
    print(f"⏰ Token expires at: {token_expires}")
    
    print("💾 Creating verification token record...")
    db_token = VerificationToken(
        user_id=db_user.id,
        token=verification_token,
        token_type=TokenType.EMAIL_VERIFICATION,
        expires_at=token_expires
    )
    db.add(db_token)
    print("💾 Committing verification token...")
    db.commit()
    print("✅ Verification token saved to database")
    
    # Send verification email asynchronously (non-blocking)
    print("📧 Scheduling verification email to be sent asynchronously...")
    asyncio.create_task(
        _send_verification_email_async(
            db_user.email,
            verification_token,
            f"{db_user.first_name} {db_user.last_name}",
            db_user.id
        )
    )
    print("✅ Email sending scheduled - registration continues immediately")
    
    # Generate JWT tokens
    print("🎫 Creating JWT tokens...")
    try:
        print("🔑 Creating access token...")
        access_token = create_access_token(subject=db_user.id)
        print(f"✅ Access token created: {access_token[:20]}...")
        
        print("🔄 Creating refresh token...")
        refresh_token = create_refresh_token(subject=db_user.id)
        print(f"✅ Refresh token created: {refresh_token[:20]}...")
        
        print("👤 Creating user response...")
        user_response = UserResponse.from_orm(db_user)
        print(f"✅ User response created for: {user_response.email}")
        print(f"📋 User response data: {user_response.dict()}")
        
        print("🎫 Creating token response...")
        token_response = Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        print("✅ Token response created successfully")
        
        print("📦 Creating auth response...")
        auth_response = AuthResponse(
            user=user_response,
            token=token_response
        )
        print("✅ Auth response created successfully")
        print(f"📋 Auth response structure: user={type(auth_response.user)}, token={type(auth_response.token)}")
        
        print("📤 Returning response to client...")
        return auth_response
        
    except Exception as e:
        print(f"💥 ERROR in response creation: {e}")
        import traceback
        traceback.print_exc()
        raise

@router.post("/login", response_model=AuthResponse)
@login_timeout(timeout_seconds=5)
async def login_user(
    user_credentials: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """Login user with email and password with optimized performance"""
    
    start_time = time.time()
    user_id = None
    
    try:
        logger.info(f"Login attempt for email: {user_credentials.email}")
        
        # Optimized database query with performance monitoring
        query_start = time.time()
        user = get_user_for_authentication(db, user_credentials.email)
        query_duration = time.time() - query_start
        
        if query_duration > 1.0:  # Log slow queries
            logger.warning(f"Slow database query for login: {query_duration:.3f}s for email {user_credentials.email}")
        
        if not user:
            # Log failed login attempt without revealing user existence
            log_login_attempt(
                user_id=None,
                success=False,
                request=request,
                details={
                    "email": user_credentials.email,
                    "reason": "user_not_found",
                    "duration": time.time() - start_time
                }
            )
            logger.warning(f"Login failed - user not found: {user_credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        user_id = user.id
        
        # Check if user is active before password verification for better performance
        if not user.is_active:
            log_login_attempt(
                user_id=user_id,
                success=False,
                request=request,
                details={
                    "email": user_credentials.email,
                    "reason": "account_deactivated",
                    "duration": time.time() - start_time
                }
            )
            logger.warning(f"Login failed - account deactivated: {user_credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is deactivated"
            )
        
        # Verify password
        password_start = time.time()
        if not verify_password(user_credentials.password, user.password_hash):
            password_duration = time.time() - password_start
            log_login_attempt(
                user_id=user_id,
                success=False,
                request=request,
                details={
                    "email": user_credentials.email,
                    "reason": "invalid_password",
                    "duration": time.time() - start_time,
                    "password_check_duration": password_duration
                }
            )
            logger.warning(f"Login failed - invalid password: {user_credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        password_duration = time.time() - password_start
        if password_duration > 0.5:  # Log slow password verification
            logger.warning(f"Slow password verification: {password_duration:.3f}s for user {user_id}")
        
        # Generate JWT tokens
        token_start = time.time()
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)
        token_duration = time.time() - token_start
        
        if token_duration > 0.2:  # Log slow token generation
            logger.warning(f"Slow token generation: {token_duration:.3f}s for user {user_id}")
        
        total_duration = time.time() - start_time
        
        # Log performance metrics
        performance_breakdown = {
            "query_duration": query_duration,
            "password_duration": password_duration,
            "token_duration": token_duration
        }
        
        login_monitor.log_login_performance(
            total_duration, 
            user_id, 
            performance_breakdown
        )
        
        # Log successful login
        log_login_attempt(
            user_id=user_id,
            success=True,
            request=request,
            details={
                "email": user_credentials.email,
                "duration": total_duration,
                **performance_breakdown
            }
        )
        
        logger.info(f"Login successful for user {user_id} ({user_credentials.email}) in {total_duration:.3f}s")
        
        return AuthResponse(
            user=UserResponse.from_orm(user),
            token=Token(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (authentication failures)
        raise
    except Exception as e:
        # Log unexpected errors
        total_duration = time.time() - start_time
        log_login_attempt(
            user_id=user_id,
            success=False,
            request=request,
            details={
                "email": user_credentials.email,
                "reason": "internal_error",
                "error": str(e),
                "duration": total_duration
            }
        )
        logger.error(f"Login internal error for {user_credentials.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

@router.post("/oauth/login", response_model=AuthResponse)
async def oauth_login(
    oauth_data: OAuthLogin,
    db: Session = Depends(get_db)
):
    """Login or register user with OAuth (Google, Facebook, Apple)"""
    
    # Verify OAuth token
    user_info = await oauth_service.verify_oauth_token(
        oauth_data.provider, 
        oauth_data.access_token
    )
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OAuth token"
        )
    
    # Check if OAuth account exists
    oauth_account = db.query(OAuthAccount).filter(
        OAuthAccount.provider == oauth_data.provider,
        OAuthAccount.provider_user_id == user_info["provider_user_id"]
    ).first()
    
    if oauth_account:
        # Existing OAuth account - login
        user = oauth_account.user
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is deactivated"
            )
    else:
        # New OAuth account - check if email exists
        existing_user = db.query(User).filter(User.email == user_info["email"]).first()
        
        if existing_user:
            # Link OAuth account to existing user
            user = existing_user
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider=oauth_data.provider,
                provider_user_id=user_info["provider_user_id"],
                provider_email=user_info["email"]
            )
            db.add(oauth_account)
        else:
            # Create new user
            user = User(
                email=user_info["email"],
                role=oauth_data.role,
                first_name=user_info["first_name"] or "User",
                last_name=user_info["last_name"] or "",
                is_verified=user_info.get("verified_email", False),
                email_verified=user_info.get("verified_email", False),
                phone_verified=True  # No phone for OAuth
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create role-specific profile
            if oauth_data.role == UserRole.WORKER:
                worker_profile = WorkerProfile(user_id=user.id)
                db.add(worker_profile)
            else:
                client_profile = ClientProfile(user_id=user.id)
                db.add(client_profile)
            
            # Create OAuth account
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider=oauth_data.provider,
                provider_user_id=user_info["provider_user_id"],
                provider_email=user_info["email"]
            )
            db.add(oauth_account)
        
        db.commit()
    
    # Generate JWT tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    return AuthResponse(
        user=UserResponse.from_orm(user),
        token=Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    
    user_id = verify_token(token_data.refresh_token, "refresh")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Generate new tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/send-email-verification", response_model=MessageResponse)
async def send_email_verification(
    request: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """Send email verification token"""
    
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate verification token
    verification_token = generate_verification_token()
    token_expires = create_verification_token_expires()
    
    # Invalidate existing tokens
    db.query(VerificationToken).filter(
        VerificationToken.user_id == user.id,
        VerificationToken.token_type == TokenType.EMAIL_VERIFICATION,
        VerificationToken.is_used == False
    ).update({"is_used": True})
    
    # Create new token
    db_token = VerificationToken(
        user_id=user.id,
        token=verification_token,
        token_type=TokenType.EMAIL_VERIFICATION,
        expires_at=token_expires
    )
    db.add(db_token)
    db.commit()
    
    # Send verification email asynchronously (non-blocking)
    asyncio.create_task(
        _send_verification_email_async(
            user.email,
            verification_token,
            f"{user.first_name} {user.last_name}",
            user.id
        )
    )
    
    return MessageResponse(message="Verification email sent successfully")

@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    request: VerifyTokenRequest,
    db: Session = Depends(get_db)
):
    """Verify email using token"""
    
    # Find valid token
    token = db.query(VerificationToken).filter(
        VerificationToken.token == request.token,
        VerificationToken.token_type == TokenType.EMAIL_VERIFICATION,
        VerificationToken.is_used == False,
        VerificationToken.expires_at > datetime.utcnow()
    ).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Update user and token
    user = token.user
    user.email_verified = True
    user.is_verified = user.email_verified and user.phone_verified
    token.is_used = True
    
    db.commit()
    
    return MessageResponse(message="Email verified successfully")

@router.post("/send-phone-verification", response_model=MessageResponse)
async def send_phone_verification(
    request: PhoneVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send phone verification SMS"""
    
    if current_user.phone_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone already verified"
        )
    
    # Update user phone if different
    if current_user.phone != request.phone:
        # Check if phone is already used
        existing_phone = db.query(User).filter(
            User.phone == request.phone,
            User.id != current_user.id
        ).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
        
        current_user.phone = request.phone
        db.commit()
    
    # Generate verification code
    verification_code = sms_service.generate_verification_code()
    token_expires = create_verification_token_expires()
    
    # Invalidate existing tokens
    db.query(VerificationToken).filter(
        VerificationToken.user_id == current_user.id,
        VerificationToken.token_type == TokenType.PHONE_VERIFICATION,
        VerificationToken.is_used == False
    ).update({"is_used": True})
    
    # Create new token
    db_token = VerificationToken(
        user_id=current_user.id,
        token=verification_code,
        token_type=TokenType.PHONE_VERIFICATION,
        expires_at=token_expires
    )
    db.add(db_token)
    db.commit()
    
    # Send SMS
    success = await sms_service.send_verification_sms(request.phone, verification_code)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification SMS"
        )
    
    return MessageResponse(message="Verification SMS sent successfully")

@router.post("/verify-phone", response_model=MessageResponse)
async def verify_phone(
    request: VerifyTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify phone using SMS code"""
    
    # Find valid token
    token = db.query(VerificationToken).filter(
        VerificationToken.user_id == current_user.id,
        VerificationToken.token == request.token,
        VerificationToken.token_type == TokenType.PHONE_VERIFICATION,
        VerificationToken.is_used == False,
        VerificationToken.expires_at > datetime.utcnow()
    ).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Update user and token
    current_user.phone_verified = True
    current_user.is_verified = current_user.email_verified and current_user.phone_verified
    token.is_used = True
    
    db.commit()
    
    return MessageResponse(message="Phone verified successfully")

@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Send password reset email"""
    
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists or not
        return MessageResponse(message="If the email exists, a password reset link has been sent")
    
    # Generate reset token
    reset_token = generate_reset_token()
    token_expires = create_reset_token_expires()
    
    # Invalidate existing tokens
    db.query(VerificationToken).filter(
        VerificationToken.user_id == user.id,
        VerificationToken.token_type == TokenType.PASSWORD_RESET,
        VerificationToken.is_used == False
    ).update({"is_used": True})
    
    # Create new token
    db_token = VerificationToken(
        user_id=user.id,
        token=reset_token,
        token_type=TokenType.PASSWORD_RESET,
        expires_at=token_expires
    )
    db.add(db_token)
    db.commit()
    
    # Send reset email asynchronously (non-blocking)
    asyncio.create_task(
        _send_password_reset_email_async(
            user.email,
            reset_token,
            f"{user.first_name} {user.last_name}",
            user.id
        )
    )
    
    return MessageResponse(message="If the email exists, a password reset link has been sent")

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password using token"""
    
    # Find valid token
    token = db.query(VerificationToken).filter(
        VerificationToken.token == request.token,
        VerificationToken.token_type == TokenType.PASSWORD_RESET,
        VerificationToken.is_used == False,
        VerificationToken.expires_at > datetime.utcnow()
    ).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update user password and token
    user = token.user
    user.password_hash = get_password_hash(request.new_password)
    token.is_used = True
    
    db.commit()
    
    return MessageResponse(message="Password reset successfully")

@router.get("/verification-status", response_model=VerificationStatusResponse)
async def get_verification_status(
    current_user: User = Depends(get_current_user)
):
    """Get current user's verification status"""
    
    return VerificationStatusResponse(
        email_verified=current_user.email_verified,
        phone_verified=current_user.phone_verified,
        is_verified=current_user.is_verified
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    
    return UserResponse.from_orm(current_user)