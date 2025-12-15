from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, validator
from enum import Enum

class PaymentMethodEnum(str, Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"

class PaymentStatusEnum(str, Enum):
    PENDING = "pending"
    HELD = "held"
    RELEASED = "released"
    REFUNDED = "refunded"
    FAILED = "failed"
    DISPUTED = "disputed"

class DisputeStatusEnum(str, Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    CLOSED = "closed"

class WithdrawalStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# Payment Breakdown Schema
class PaymentBreakdown(BaseModel):
    working_hours: Decimal = Field(..., gt=0, description="Working hours")
    hourly_rate: Decimal = Field(..., gt=0, description="Hourly rate")
    subtotal: Decimal = Field(..., description="Subtotal (hours × rate)")
    platform_fee: Decimal = Field(..., description="Platform fee amount")
    platform_fee_percentage: float = Field(..., description="Platform fee percentage")
    total: Decimal = Field(..., description="Total amount to charge")
    worker_amount: Decimal = Field(..., description="Amount worker receives")
    currency: str = Field(default="usd", description="Currency code")
    
    class Config:
        from_attributes = True

class PaymentCalculateRequest(BaseModel):
    working_hours: Decimal = Field(..., gt=0, description="Working hours")
    hourly_rate: Decimal = Field(..., gt=0, description="Hourly rate per hour")
    
    @validator('working_hours', 'hourly_rate')
    def validate_positive(cls, v):
        if v <= 0:
            raise ValueError('Value must be greater than 0')
        return round(v, 2)

# Payment Schemas
class PaymentCreate(BaseModel):
    booking_id: int
    payment_method: PaymentMethodEnum
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return round(v, 2)

class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatusEnum] = None
    refund_reason: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    amount: Decimal
    platform_fee: Decimal
    worker_amount: Decimal
    payment_method: PaymentMethodEnum
    stripe_payment_id: Optional[str] = None
    paypal_payment_id: Optional[str] = None
    status: PaymentStatusEnum
    created_at: datetime
    held_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    refund_reason: Optional[str] = None
    payment_metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# Stripe Payment Intent
class StripePaymentIntentCreate(BaseModel):
    booking_id: int
    working_hours: Decimal = Field(..., gt=0, description="Working hours")
    hourly_rate: Decimal = Field(..., gt=0, description="Hourly rate")
    currency: str = "usd"
    
    @validator('working_hours', 'hourly_rate')
    def validate_positive(cls, v):
        if v <= 0:
            raise ValueError('Value must be greater than 0')
        return round(v, 2)
    
class StripePaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str

# PayPal Payment
class PayPalPaymentCreate(BaseModel):
    booking_id: int
    amount: Decimal
    currency: str = "USD"
    return_url: str
    cancel_url: str

class PayPalPaymentResponse(BaseModel):
    payment_id: str
    approval_url: str
    status: str

# Payment Dispute Schemas
class PaymentDisputeCreate(BaseModel):
    payment_id: int
    reason: str = Field(..., min_length=10, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)

class PaymentDisputeUpdate(BaseModel):
    status: Optional[DisputeStatusEnum] = None
    resolution_notes: Optional[str] = Field(None, max_length=2000)

class PaymentDisputeResponse(BaseModel):
    id: int
    payment_id: int
    initiated_by: int
    reason: str
    description: Optional[str] = None
    status: DisputeStatusEnum
    resolution_notes: Optional[str] = None
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Worker Payout Schemas
class WorkerPayoutRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Payout amount")
    payment_method: PaymentMethodEnum
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return round(v, 2)

class WorkerPayoutResponse(BaseModel):
    id: int
    worker_id: int
    amount: Decimal
    payment_method: PaymentMethodEnum
    stripe_transfer_id: Optional[str] = None
    paypal_payout_id: Optional[str] = None
    status: WithdrawalStatusEnum
    requested_at: datetime
    processed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None

    class Config:
        from_attributes = True

# Payment Transaction Schemas
class PaymentTransactionResponse(BaseModel):
    id: int
    user_id: int
    payment_id: Optional[int] = None
    payout_id: Optional[int] = None
    transaction_type: str
    amount: Decimal
    description: str
    reference_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Payment History and Summary
class PaymentHistoryFilter(BaseModel):
    user_id: Optional[int] = None
    payment_method: Optional[PaymentMethodEnum] = None
    status: Optional[PaymentStatusEnum] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=50, le=100)
    offset: int = Field(default=0, ge=0)

class PaymentSummary(BaseModel):
    total_payments: int
    total_amount: Decimal
    total_fees: Decimal
    pending_amount: Decimal
    completed_amount: Decimal
    refunded_amount: Decimal

class WorkerEarnings(BaseModel):
    total_earned: Decimal
    available_balance: Decimal
    pending_balance: Decimal
    total_withdrawn: Decimal
    platform_fees_paid: Decimal

# Webhook Schemas
class StripeWebhookEvent(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]
    created: int

class PayPalWebhookEvent(BaseModel):
    id: str
    event_type: str
    resource: Dict[str, Any]
    create_time: str

# Refund Schemas
class RefundRequest(BaseModel):
    payment_id: int
    amount: Optional[Decimal] = None  # If None, full refund
    reason: str = Field(..., min_length=5, max_length=500)

class RefundResponse(BaseModel):
    id: str
    payment_id: int
    amount: Decimal
    status: str
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

# Payment Method Management Schemas
class PaymentMethodAdd(BaseModel):
    payment_method_id: str = Field(..., description="Stripe payment method ID from client")

class PaymentMethodResponse(BaseModel):
    id: int
    type: str
    brand: Optional[str] = None
    last4: Optional[str] = None
    expiry_month: Optional[int] = None
    expiry_year: Optional[int] = None
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True