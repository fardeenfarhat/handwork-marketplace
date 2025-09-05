from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.models import BookingStatus


class BookingBase(BaseModel):
    job_id: int
    worker_id: int
    start_date: datetime
    end_date: Optional[datetime] = None
    agreed_rate: Decimal = Field(..., gt=0, description="Agreed hourly rate")


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    agreed_rate: Optional[Decimal] = Field(None, gt=0)
    status: Optional[BookingStatus] = None
    completion_notes: Optional[str] = None
    completion_photos: Optional[List[str]] = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus
    completion_notes: Optional[str] = None
    completion_photos: Optional[List[str]] = None

    @validator('completion_notes')
    def validate_completion_notes(cls, v, values):
        if values.get('status') == BookingStatus.COMPLETED and not v:
            raise ValueError('Completion notes are required when marking job as completed')
        return v


class BookingReschedule(BaseModel):
    start_date: datetime
    end_date: Optional[datetime] = None
    reason: str = Field(..., min_length=10, max_length=500)


class BookingCancel(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)


class BookingResponse(BookingBase):
    id: int
    client_id: int
    status: BookingStatus
    completion_notes: Optional[str] = None
    completion_photos: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BookingDetailResponse(BookingResponse):
    job_title: str
    job_description: str
    job_category: str
    client_name: str
    worker_name: str
    worker_rating: float


class BookingTimelineEntry(BaseModel):
    timestamp: datetime
    status: BookingStatus
    notes: Optional[str] = None
    photos: Optional[List[str]] = None


class BookingTimeline(BaseModel):
    booking_id: int
    timeline: List[BookingTimelineEntry]


class BookingListResponse(BaseModel):
    bookings: List[BookingResponse]
    total: int
    page: int
    per_page: int


class BookingFilters(BaseModel):
    status: Optional[BookingStatus] = None
    start_date_from: Optional[datetime] = None
    start_date_to: Optional[datetime] = None
    job_category: Optional[str] = None
    page: int = Field(1, ge=1)
    per_page: int = Field(10, ge=1, le=100)