from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.schemas.bookings import (
    BookingCreate, BookingResponse, BookingDetailResponse, BookingUpdate,
    BookingStatusUpdate, BookingReschedule, BookingCancel, BookingFilters,
    BookingListResponse, BookingTimeline
)
from app.services.booking_service import BookingService
from app.services.file_storage import FileStorageService

router = APIRouter()


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new booking (Client only)"""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can create bookings"
        )
    
    booking_service = BookingService(db)
    booking = await booking_service.create_booking(booking_data, current_user.id)
    return BookingResponse.from_orm(booking)


@router.get("/", response_model=BookingListResponse)
async def get_user_bookings(
    status_filter: Optional[str] = None,
    start_date_from: Optional[str] = None,
    start_date_to: Optional[str] = None,
    job_category: Optional[str] = None,
    page: int = 1,
    per_page: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's bookings with filtering"""
    
    # Parse filters
    filters = BookingFilters(
        status=status_filter,
        start_date_from=start_date_from,
        start_date_to=start_date_to,
        job_category=job_category,
        page=page,
        per_page=per_page
    )
    
    booking_service = BookingService(db)
    bookings, total = await booking_service.get_user_bookings(current_user.id, filters)
    
    # Create detailed responses for all bookings
    detailed_bookings = []
    for booking in bookings:
        # Check if current user has already reviewed this booking
        from app.db.models import Review
        has_user_review = db.query(Review).filter(
            Review.booking_id == booking.id,
            Review.reviewer_id == current_user.id
        ).first() is not None
        
        detailed_booking = BookingDetailResponse(
            id=booking.id,
            job_id=booking.job_id,
            worker_id=booking.worker_id,
            client_id=booking.client_id,
            start_date=booking.start_date,
            end_date=booking.end_date,
            agreed_rate=booking.agreed_rate,
            status=booking.status,
            completion_notes=booking.completion_notes,
            completion_photos=booking.completion_photos,
            created_at=booking.created_at,
            job_title=booking.job.title,
            job_description=booking.job.description,
            job_category=booking.job.category,
            client_name=f"{booking.client.user.first_name} {booking.client.user.last_name}",
            worker_name=f"{booking.worker.user.first_name} {booking.worker.user.last_name}",
            worker_rating=booking.worker.rating,
            client_user_id=booking.client.user_id,
            worker_user_id=booking.worker.user_id,
            has_user_review=has_user_review
        )
        detailed_bookings.append(detailed_booking)
    
    return BookingListResponse(
        bookings=detailed_bookings,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{booking_id}", response_model=BookingDetailResponse)
async def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific booking with details"""
    
    booking_service = BookingService(db)
    booking = await booking_service.get_booking(booking_id, current_user.id)
    
    # Check if current user has already reviewed this booking
    from app.db.models import Review
    has_user_review = db.query(Review).filter(
        Review.booking_id == booking.id,
        Review.reviewer_id == current_user.id
    ).first() is not None
    
    # Create detailed response
    return BookingDetailResponse(
        id=booking.id,
        job_id=booking.job_id,
        worker_id=booking.worker_id,
        client_id=booking.client_id,
        start_date=booking.start_date,
        end_date=booking.end_date,
        agreed_rate=booking.agreed_rate,
        status=booking.status,
        completion_notes=booking.completion_notes,
        completion_photos=booking.completion_photos,
        created_at=booking.created_at,
        job_title=booking.job.title,
        job_description=booking.job.description,
        job_category=booking.job.category,
        client_name=f"{booking.client.user.first_name} {booking.client.user.last_name}",
        worker_name=f"{booking.worker.user.first_name} {booking.worker.user.last_name}",
        worker_rating=booking.worker.rating,
        client_user_id=booking.client.user_id,
        worker_user_id=booking.worker.user_id,
        has_user_review=has_user_review
    )


@router.post("/{booking_id}/confirm", response_model=BookingResponse)
async def confirm_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm a booking (Worker only)"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can confirm bookings"
        )
    
    booking_service = BookingService(db)
    booking = await booking_service.confirm_booking(booking_id, current_user.id)
    return BookingResponse.from_orm(booking)


@router.patch("/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: int,
    status_update: BookingStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update booking status with progress tracking"""
    
    booking_service = BookingService(db)
    booking = await booking_service.update_booking_status(
        booking_id, status_update, current_user.id
    )
    return BookingResponse.from_orm(booking)


@router.post("/{booking_id}/reschedule", response_model=BookingResponse)
async def reschedule_booking(
    booking_id: int,
    reschedule_data: BookingReschedule,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reschedule a booking"""
    
    booking_service = BookingService(db)
    booking = await booking_service.reschedule_booking(
        booking_id, reschedule_data, current_user.id
    )
    return BookingResponse.from_orm(booking)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    cancel_data: BookingCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a booking"""
    
    booking_service = BookingService(db)
    booking = await booking_service.cancel_booking(
        booking_id, cancel_data, current_user.id
    )
    return BookingResponse.from_orm(booking)


@router.get("/{booking_id}/timeline", response_model=BookingTimeline)
async def get_booking_timeline(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get booking timeline and milestone tracking"""
    
    booking_service = BookingService(db)
    timeline = await booking_service.get_booking_timeline(booking_id, current_user.id)
    
    return BookingTimeline(
        booking_id=booking_id,
        timeline=timeline
    )


@router.post("/{booking_id}/completion-photos", response_model=dict)
async def upload_completion_photos(
    booking_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload completion photos for a booking (Worker only)"""
    
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can upload completion photos"
        )
    
    # Verify booking access
    booking_service = BookingService(db)
    booking = await booking_service.get_booking(booking_id, current_user.id)
    
    if booking.status not in ["in_progress", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only upload photos for in-progress or completed bookings"
        )
    
    # Upload files
    file_storage = FileStorageService()
    uploaded_files = []
    
    for file in files:
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} is not an image"
            )
        
        file_path = await file_storage.save_file(
            file, 
            f"bookings/{booking_id}/completion"
        )
        uploaded_files.append(file_path)
    
    # Update booking with photo paths
    if not booking.completion_photos:
        booking.completion_photos = []
    
    booking.completion_photos.extend(uploaded_files)
    db.commit()
    
    return {
        "message": f"Uploaded {len(uploaded_files)} photos",
        "photos": uploaded_files
    }


@router.get("/{booking_id}/status-history")
async def get_booking_status_history(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed status change history for a booking"""
    
    booking_service = BookingService(db)
    booking = await booking_service.get_booking(booking_id, current_user.id)
    
    # In a production system, you'd have a separate BookingStatusHistory table
    # For now, return basic information
    return {
        "booking_id": booking_id,
        "current_status": booking.status,
        "created_at": booking.created_at,
        "completion_date": booking.end_date,
        "notes": booking.completion_notes
    }