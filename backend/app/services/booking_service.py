from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime

from app.db.models import (
    Booking, Job, User, WorkerProfile, ClientProfile, 
    BookingStatus, JobStatus, Notification, NotificationType,
    BookingStatusHistory
)
from app.schemas.bookings import (
    BookingCreate, BookingUpdate, BookingStatusUpdate, 
    BookingReschedule, BookingCancel, BookingFilters
)
from app.services.notification_service import NotificationService
from app.services.file_storage import FileStorageService


class BookingService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
        self.file_storage = FileStorageService()

    async def create_booking(self, booking_data: BookingCreate, client_user_id: int) -> Booking:
        """Create a new booking from a job application"""
        
        # Verify job exists and belongs to client
        job = self.db.query(Job).filter(Job.id == booking_data.job_id).first()
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Get client profile
        client_profile = self.db.query(ClientProfile).filter(
            ClientProfile.user_id == client_user_id
        ).first()
        if not client_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client profile not found"
            )
        
        if job.client_id != client_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create bookings for your own jobs"
            )
        
        # Verify worker exists
        worker = self.db.query(WorkerProfile).filter(
            WorkerProfile.id == booking_data.worker_id
        ).first()
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker not found"
            )
        
        # Check if job is still available
        if job.status != JobStatus.OPEN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job is no longer available for booking"
            )
        
        # Check for existing active bookings for this job
        existing_booking = self.db.query(Booking).filter(
            and_(
                Booking.job_id == booking_data.job_id,
                Booking.status.in_([
                    BookingStatus.PENDING, 
                    BookingStatus.CONFIRMED, 
                    BookingStatus.IN_PROGRESS
                ])
            )
        ).first()
        
        if existing_booking:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job already has an active booking"
            )
        
        # Create booking
        booking = Booking(
            job_id=booking_data.job_id,
            worker_id=booking_data.worker_id,
            client_id=client_profile.id,
            start_date=booking_data.start_date,
            end_date=booking_data.end_date,
            agreed_rate=booking_data.agreed_rate,
            status=BookingStatus.PENDING
        )
        
        self.db.add(booking)
        self.db.flush()  # Get the booking ID
        
        # Update job status
        job.status = JobStatus.ASSIGNED
        
        # Create initial status history entry
        self._create_status_history(
            booking.id, None, BookingStatus.PENDING, client_user_id, "Booking created"
        )
        
        # Send notifications
        self._send_booking_notification(
            booking, 
            "Booking Created", 
            f"You have been hired for the job: {job.title}"
        )
        
        self.db.commit()
        self.db.refresh(booking)
        
        return booking

    async def confirm_booking(self, booking_id: int, user_id: int) -> Booking:
        """Worker confirms the booking"""
        
        booking = await self._get_booking_with_access_check(booking_id, user_id, "worker")
        
        if booking.status != BookingStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending bookings can be confirmed"
            )
        
        old_status = booking.status
        booking.status = BookingStatus.CONFIRMED
        
        # Create status history entry
        self._create_status_history(
            booking.id, old_status, BookingStatus.CONFIRMED, user_id, "Booking confirmed by worker"
        )
        
        # Update job status
        booking.job.status = JobStatus.ASSIGNED
        
        # Send notification to client
        self._send_booking_notification(
            booking,
            "Booking Confirmed",
            f"Worker has confirmed the booking for: {booking.job.title}"
        )
        
        self.db.commit()
        self.db.refresh(booking)
        
        return booking

    async def update_booking_status(
        self, 
        booking_id: int, 
        status_update: BookingStatusUpdate, 
        user_id: int
    ) -> Booking:
        """Update booking status with progress tracking"""
        
        booking = await self._get_booking_with_access_check(booking_id, user_id)
        
        # Validate status transitions
        await self._validate_status_transition(booking, status_update.status, user_id)
        
        old_status = booking.status
        booking.status = status_update.status
        
        # Create status history entry
        self._create_status_history(
            booking.id, 
            old_status, 
            status_update.status, 
            user_id, 
            status_update.completion_notes,
            status_update.completion_photos
        )
        
        # Handle completion
        if status_update.status == BookingStatus.COMPLETED:
            booking.completion_notes = status_update.completion_notes
            booking.end_date = datetime.utcnow()
            
            # Handle completion photos
            if status_update.completion_photos:
                booking.completion_photos = status_update.completion_photos
            
            # Update job status
            booking.job.status = JobStatus.COMPLETED
        
        # Handle in progress
        elif status_update.status == BookingStatus.IN_PROGRESS:
            booking.job.status = JobStatus.IN_PROGRESS
        
        # Send status change notification
        self._send_status_change_notification(booking, old_status, status_update.status)
        
        self.db.commit()
        self.db.refresh(booking)
        
        return booking

    async def reschedule_booking(
        self, 
        booking_id: int, 
        reschedule_data: BookingReschedule, 
        user_id: int
    ) -> Booking:
        """Reschedule a booking"""
        
        booking = await self._get_booking_with_access_check(booking_id, user_id)
        
        if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending or confirmed bookings can be rescheduled"
            )
        
        booking.start_date = reschedule_data.start_date
        booking.end_date = reschedule_data.end_date
        
        # Send reschedule notification
        user = self.db.query(User).filter(User.id == user_id).first()
        other_party_id = (
            booking.client.user_id if user.role == "worker" 
            else booking.worker.user_id
        )
        
        self.notification_service.create_notification(
            user_id=other_party_id,
            title="Booking Rescheduled",
            message=f"Booking for '{booking.job.title}' has been rescheduled. Reason: {reschedule_data.reason}",
            notification_type=NotificationType.JOB_UPDATE,
            data={
                "booking_id": booking.id,
                "new_start_date": reschedule_data.start_date.isoformat(),
                "reason": reschedule_data.reason
            }
        )
        
        self.db.commit()
        self.db.refresh(booking)
        
        return booking

    async def cancel_booking(
        self, 
        booking_id: int, 
        cancel_data: BookingCancel, 
        user_id: int
    ) -> Booking:
        """Cancel a booking"""
        
        booking = await self._get_booking_with_access_check(booking_id, user_id)
        
        if booking.status in [BookingStatus.COMPLETED, BookingStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel completed or already cancelled bookings"
            )
        
        old_status = booking.status
        booking.status = BookingStatus.CANCELLED
        booking.completion_notes = f"Cancelled: {cancel_data.reason}"
        
        # Create status history entry
        self._create_status_history(
            booking.id, old_status, BookingStatus.CANCELLED, user_id, f"Cancelled: {cancel_data.reason}"
        )
        
        # Update job status back to open if not started
        if old_status in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
            booking.job.status = JobStatus.OPEN
        
        # Send cancellation notification
        user = self.db.query(User).filter(User.id == user_id).first()
        other_party_id = (
            booking.client.user_id if user.role == "worker" 
            else booking.worker.user_id
        )
        
        self.notification_service.create_notification(
            user_id=other_party_id,
            title="Booking Cancelled",
            message=f"Booking for '{booking.job.title}' has been cancelled. Reason: {cancel_data.reason}",
            notification_type=NotificationType.JOB_UPDATE,
            data={
                "booking_id": booking.id,
                "reason": cancel_data.reason
            }
        )
        
        self.db.commit()
        self.db.refresh(booking)
        
        return booking

    async def get_booking(self, booking_id: int, user_id: int) -> Booking:
        """Get a specific booking"""
        return await self._get_booking_with_access_check(booking_id, user_id)

    async def get_user_bookings(
        self, 
        user_id: int, 
        filters: BookingFilters
    ) -> tuple[List[Booking], int]:
        """Get user's bookings with filtering"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Base query
        query = self.db.query(Booking)
        
        # Filter by user role
        if user.role == "client":
            query = query.filter(Booking.client_id == user.client_profile.id)
        elif user.role == "worker":
            query = query.filter(Booking.worker_id == user.worker_profile.id)
        
        # Apply filters
        if filters.status:
            query = query.filter(Booking.status == filters.status)
        
        if filters.start_date_from:
            query = query.filter(Booking.start_date >= filters.start_date_from)
        
        if filters.start_date_to:
            query = query.filter(Booking.start_date <= filters.start_date_to)
        
        if filters.job_category:
            query = query.join(Job).filter(Job.category == filters.job_category)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (filters.page - 1) * filters.per_page
        bookings = query.offset(offset).limit(filters.per_page).all()
        
        return bookings, total

    async def get_booking_timeline(self, booking_id: int, user_id: int) -> List[dict]:
        """Get booking timeline/history"""
        
        booking = await self._get_booking_with_access_check(booking_id, user_id)
        
        # Get status history from database
        status_history = self.db.query(BookingStatusHistory).filter(
            BookingStatusHistory.booking_id == booking_id
        ).order_by(BookingStatusHistory.created_at).all()
        
        timeline = []
        for entry in status_history:
            timeline.append({
                "timestamp": entry.created_at,
                "status": entry.new_status,
                "notes": entry.notes,
                "photos": entry.photos,
                "changed_by": f"{entry.user.first_name} {entry.user.last_name}"
            })
        
        return timeline

    async def _get_booking_with_access_check(
        self, 
        booking_id: int, 
        user_id: int, 
        required_role: Optional[str] = None
    ) -> Booking:
        """Get booking and verify user access"""
        
        booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check access permissions
        has_access = False
        if user.role == "client" and booking.client.user_id == user_id:
            has_access = True
        elif user.role == "worker" and booking.worker.user_id == user_id:
            has_access = True
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this booking"
            )
        
        # Check required role
        if required_role and user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires {required_role} role"
            )
        
        return booking

    async def _validate_status_transition(
        self, 
        booking: Booking, 
        new_status: BookingStatus, 
        user_id: int
    ):
        """Validate if status transition is allowed"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        current_status = booking.status
        
        # Define allowed transitions
        allowed_transitions = {
            BookingStatus.PENDING: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
            BookingStatus.CONFIRMED: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
            BookingStatus.IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
            BookingStatus.COMPLETED: [],  # No transitions from completed
            BookingStatus.CANCELLED: []   # No transitions from cancelled
        }
        
        if new_status not in allowed_transitions.get(current_status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from {current_status} to {new_status}"
            )
        
        # Role-specific validations
        if new_status == BookingStatus.CONFIRMED and user.role != "worker":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workers can confirm bookings"
            )
        
        if new_status == BookingStatus.IN_PROGRESS and user.role != "worker":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workers can start work"
            )
        
        if new_status == BookingStatus.COMPLETED and user.role != "worker":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only workers can mark work as completed"
            )

    def _send_booking_notification(
        self, 
        booking: Booking, 
        title: str, 
        message: str
    ):
        """Send booking-related notification"""
        
        self.notification_service.create_notification(
            user_id=booking.worker.user_id,
            title=title,
            message=message,
            notification_type=NotificationType.JOB_UPDATE,
            data={"booking_id": booking.id}
        )

    def _send_status_change_notification(
        self, 
        booking: Booking, 
        old_status: BookingStatus, 
        new_status: BookingStatus
    ):
        """Send notification for status changes"""
        
        status_messages = {
            BookingStatus.CONFIRMED: "Booking has been confirmed",
            BookingStatus.IN_PROGRESS: "Work has started",
            BookingStatus.COMPLETED: "Work has been completed",
            BookingStatus.CANCELLED: "Booking has been cancelled"
        }
        
        message = status_messages.get(new_status, f"Booking status changed to {new_status}")
        
        # Send to both client and worker
        for user_id in [booking.client.user_id, booking.worker.user_id]:
            self.notification_service.create_notification(
                user_id=user_id,
                title="Booking Status Update",
                message=f"{booking.job.title}: {message}",
                notification_type=NotificationType.JOB_UPDATE,
                data={
                    "booking_id": booking.id,
                    "old_status": old_status,
                    "new_status": new_status
                }
            )

    def _create_status_history(
        self, 
        booking_id: int, 
        old_status: Optional[BookingStatus], 
        new_status: BookingStatus, 
        user_id: int, 
        notes: Optional[str] = None,
        photos: Optional[List[str]] = None
    ):
        """Create a status history entry"""
        
        history_entry = BookingStatusHistory(
            booking_id=booking_id,
            old_status=old_status,
            new_status=new_status,
            changed_by=user_id,
            notes=notes,
            photos=photos
        )
        
        self.db.add(history_entry)
        self.db.flush()  # Ensure it's saved