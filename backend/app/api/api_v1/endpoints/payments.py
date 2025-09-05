from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.db.models import User, WorkerProfile, Payment, PaymentDispute, WorkerPayout
from app.schemas.payments import (
    PaymentCreate, PaymentResponse, PaymentUpdate,
    StripePaymentIntentCreate, StripePaymentIntentResponse,
    PayPalPaymentCreate, PayPalPaymentResponse,
    PaymentDisputeCreate, PaymentDisputeResponse, PaymentDisputeUpdate,
    WorkerPayoutRequest, WorkerPayoutResponse,
    PaymentTransactionResponse, PaymentHistoryFilter,
    PaymentSummary, WorkerEarnings, RefundRequest, RefundResponse,
    StripeWebhookEvent, PayPalWebhookEvent
)
from app.services.payment_service import PaymentService

router = APIRouter()

# Stripe Payment Endpoints
@router.post("/stripe/payment-intent", response_model=StripePaymentIntentResponse)
async def create_stripe_payment_intent(
    payment_data: StripePaymentIntentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Stripe Payment Intent for escrow payment"""
    payment_service = PaymentService(db)
    return await payment_service.create_stripe_payment_intent(
        booking_id=payment_data.booking_id,
        amount=payment_data.amount,
        currency=payment_data.currency
    )

@router.post("/stripe/confirm", response_model=PaymentResponse)
async def confirm_stripe_payment(
    payment_intent_id: str,
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm Stripe payment and create payment record"""
    payment_service = PaymentService(db)
    payment = await payment_service.confirm_stripe_payment(
        payment_intent_id=payment_intent_id,
        booking_id=booking_id
    )
    return PaymentResponse.from_orm(payment)

# PayPal Payment Endpoints
@router.post("/paypal/create", response_model=PayPalPaymentResponse)
async def create_paypal_payment(
    payment_data: PayPalPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create PayPal payment for escrow"""
    payment_service = PaymentService(db)
    return await payment_service.create_paypal_payment(
        booking_id=payment_data.booking_id,
        amount=payment_data.amount,
        return_url=payment_data.return_url,
        cancel_url=payment_data.cancel_url,
        currency=payment_data.currency
    )

@router.post("/paypal/execute", response_model=PaymentResponse)
async def execute_paypal_payment(
    payment_id: str,
    payer_id: str,
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute PayPal payment and create payment record"""
    payment_service = PaymentService(db)
    payment = await payment_service.execute_paypal_payment(
        payment_id=payment_id,
        payer_id=payer_id,
        booking_id=booking_id
    )
    return PaymentResponse.from_orm(payment)

# Payment Management
@router.get("/", response_model=List[PaymentResponse])
async def get_payments(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's payments"""
    query = db.query(Payment).join(Payment.booking)
    
    # Filter by user involvement (either as client or worker)
    if current_user.role == "client":
        query = query.filter(Payment.booking.has(client_id=current_user.client_profile.id))
    elif current_user.role == "worker":
        query = query.filter(Payment.booking.has(worker_id=current_user.worker_profile.id))
    
    if status:
        query = query.filter(Payment.status == status)
    
    payments = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()
    return [PaymentResponse.from_orm(payment) for payment in payments]

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific payment details"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Verify user access
    if (current_user.role == "client" and 
        payment.booking.client.user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this payment"
        )
    elif (current_user.role == "worker" and 
          payment.booking.worker.user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this payment"
        )
    
    return PaymentResponse.from_orm(payment)

@router.post("/{payment_id}/release", response_model=PaymentResponse)
async def release_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Release payment from escrow to worker"""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can release payments"
        )
    
    payment_service = PaymentService(db)
    payment = await payment_service.release_payment(payment_id, current_user.id)
    return PaymentResponse.from_orm(payment)

@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_update: PaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update payment (admin only)"""
    # This would typically be admin-only
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment_update.status:
        payment.status = payment_update.status
    if payment_update.refund_reason:
        payment.refund_reason = payment_update.refund_reason
    
    db.commit()
    db.refresh(payment)
    return PaymentResponse.from_orm(payment)

# Refund Processing
@router.post("/refund", response_model=RefundResponse)
async def process_refund(
    refund_request: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process payment refund"""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can request refunds"
        )
    
    payment_service = PaymentService(db)
    refund = await payment_service.process_refund(refund_request, current_user.id)
    return RefundResponse(**refund)

# Payment Disputes
@router.post("/disputes", response_model=PaymentDisputeResponse)
async def create_payment_dispute(
    dispute_data: PaymentDisputeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create payment dispute"""
    payment_service = PaymentService(db)
    dispute = await payment_service.create_dispute(dispute_data, current_user.id)
    return PaymentDisputeResponse.from_orm(dispute)

@router.get("/disputes", response_model=List[PaymentDisputeResponse])
async def get_payment_disputes(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's payment disputes"""
    disputes = db.query(PaymentDispute).filter(
        PaymentDispute.initiated_by == current_user.id
    ).order_by(PaymentDispute.created_at.desc()).offset(skip).limit(limit).all()
    
    return [PaymentDisputeResponse.from_orm(dispute) for dispute in disputes]

@router.put("/disputes/{dispute_id}", response_model=PaymentDisputeResponse)
async def update_payment_dispute(
    dispute_id: int,
    dispute_update: PaymentDisputeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update payment dispute (admin only)"""
    dispute = db.query(PaymentDispute).filter(PaymentDispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispute not found"
        )
    
    if dispute_update.status:
        dispute.status = dispute_update.status
    if dispute_update.resolution_notes:
        dispute.resolution_notes = dispute_update.resolution_notes
        dispute.resolved_by = current_user.id
        from datetime import datetime
        dispute.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(dispute)
    return PaymentDisputeResponse.from_orm(dispute)

# Worker Payouts
@router.post("/payouts/request", response_model=WorkerPayoutResponse)
async def request_worker_payout(
    payout_request: WorkerPayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request worker payout"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can request payouts"
        )
    
    if not current_user.worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    payment_service = PaymentService(db)
    payout = await payment_service.request_payout(
        payout_request, 
        current_user.worker_profile.id
    )
    return WorkerPayoutResponse.from_orm(payout)

@router.get("/payouts", response_model=List[WorkerPayoutResponse])
async def get_worker_payouts(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get worker's payout history"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can view payouts"
        )
    
    payouts = db.query(WorkerPayout).filter(
        WorkerPayout.worker_id == current_user.worker_profile.id
    ).order_by(WorkerPayout.requested_at.desc()).offset(skip).limit(limit).all()
    
    return [WorkerPayoutResponse.from_orm(payout) for payout in payouts]

@router.post("/payouts/{payout_id}/process", response_model=WorkerPayoutResponse)
async def process_worker_payout(
    payout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process worker payout (admin only)"""
    # This would typically require admin privileges
    payment_service = PaymentService(db)
    payout = await payment_service.process_payout(payout_id)
    return WorkerPayoutResponse.from_orm(payout)

# Payment Analytics and Summary
@router.get("/summary/client", response_model=PaymentSummary)
async def get_client_payment_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get client payment summary"""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can view payment summary"
        )
    
    # Calculate summary statistics
    payments = db.query(Payment).join(Payment.booking).filter(
        Payment.booking.has(client_id=current_user.client_profile.id)
    ).all()
    
    total_payments = len(payments)
    total_amount = sum(p.amount for p in payments)
    total_fees = sum(p.platform_fee for p in payments)
    pending_amount = sum(p.amount for p in payments if p.status == "pending")
    completed_amount = sum(p.amount for p in payments if p.status == "released")
    refunded_amount = sum(p.amount for p in payments if p.status == "refunded")
    
    return PaymentSummary(
        total_payments=total_payments,
        total_amount=total_amount,
        total_fees=total_fees,
        pending_amount=pending_amount,
        completed_amount=completed_amount,
        refunded_amount=refunded_amount
    )

@router.get("/earnings/worker", response_model=WorkerEarnings)
async def get_worker_earnings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get worker earnings summary"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can view earnings"
        )
    
    payment_service = PaymentService(db)
    
    # Calculate earnings
    payments = db.query(Payment).join(Payment.booking).filter(
        Payment.booking.has(worker_id=current_user.worker_profile.id)
    ).all()
    
    total_earned = sum(p.worker_amount for p in payments if p.status == "released")
    pending_balance = sum(p.worker_amount for p in payments if p.status == "held")
    platform_fees_paid = sum(p.platform_fee for p in payments if p.status == "released")
    
    # Get available balance
    available_balance = payment_service.get_worker_available_balance(
        current_user.worker_profile.id
    )
    
    # Calculate total withdrawn
    payouts = db.query(WorkerPayout).filter(
        WorkerPayout.worker_id == current_user.worker_profile.id,
        WorkerPayout.status == "completed"
    ).all()
    total_withdrawn = sum(p.amount for p in payouts)
    
    return WorkerEarnings(
        total_earned=total_earned,
        available_balance=available_balance,
        pending_balance=pending_balance,
        total_withdrawn=total_withdrawn,
        platform_fees_paid=platform_fees_paid
    )

@router.get("/transactions", response_model=List[PaymentTransactionResponse])
async def get_payment_transactions(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's payment transaction history"""
    payment_service = PaymentService(db)
    transactions = payment_service.get_payment_history(
        user_id=current_user.id,
        limit=limit,
        offset=skip
    )
    return [PaymentTransactionResponse.from_orm(t) for t in transactions]

# Webhook Endpoints
@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Stripe webhooks"""
    import stripe
    from app.core.config import settings
    
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        # Update payment status if needed
        pass
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        # Handle failed payment
        pass
    
    return {"status": "success"}

@router.post("/webhooks/paypal")
async def paypal_webhook(
    webhook_event: PayPalWebhookEvent,
    db: Session = Depends(get_db)
):
    """Handle PayPal webhooks"""
    # Handle PayPal webhook events
    if webhook_event.event_type == "PAYMENT.CAPTURE.COMPLETED":
        # Handle successful payment capture
        pass
    elif webhook_event.event_type == "PAYMENT.CAPTURE.DENIED":
        # Handle failed payment
        pass
    
    return {"status": "success"}