from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import stripe

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
    StripeWebhookEvent, PayPalWebhookEvent,
    PaymentBreakdown, PaymentCalculateRequest,
    PaymentMethodAdd, PaymentMethodResponse
)
from app.services.payment_service import PaymentService

router = APIRouter()

# Payment Calculation Endpoint
@router.post("/calculate", response_model=PaymentBreakdown)
async def calculate_payment(
    calculation_data: PaymentCalculateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate payment breakdown based on working hours and hourly rate.
    Returns subtotal, platform fee, total, and worker amount.
    """
    payment_service = PaymentService(db)
    breakdown = payment_service.calculate_job_payment(
        working_hours=calculation_data.working_hours,
        hourly_rate=calculation_data.hourly_rate
    )
    return PaymentBreakdown(**breakdown)

# Payment Method Management Endpoints
@router.post("/methods", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def add_payment_method(
    payment_method_data: PaymentMethodAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a payment method for the current user.
    The payment method ID should be obtained from Stripe on the client side.
    """
    payment_service = PaymentService(db)
    payment_method = await payment_service.add_payment_method(
        user_id=current_user.id,
        payment_method_id=payment_method_data.payment_method_id
    )
    return PaymentMethodResponse.from_orm(payment_method)

@router.get("/methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all payment methods for the current user.
    Returns masked card details (last 4 digits only).
    """
    payment_service = PaymentService(db)
    payment_methods = await payment_service.get_payment_methods(user_id=current_user.id)
    return [PaymentMethodResponse.from_orm(pm) for pm in payment_methods]

@router.put("/methods/{payment_method_id}/default", status_code=status.HTTP_200_OK)
async def set_default_payment_method(
    payment_method_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set a payment method as the default for the current user.
    """
    payment_service = PaymentService(db)
    success = await payment_service.set_default_payment_method(
        user_id=current_user.id,
        payment_method_id=payment_method_id
    )
    return {"success": success, "message": "Default payment method updated"}

@router.delete("/methods/{payment_method_id}", status_code=status.HTTP_200_OK)
async def delete_payment_method(
    payment_method_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a payment method for the current user.
    If the deleted method was default, another method will be set as default automatically.
    """
    payment_service = PaymentService(db)
    success = await payment_service.delete_payment_method(
        user_id=current_user.id,
        payment_method_id=payment_method_id
    )
    return {"success": success, "message": "Payment method deleted"}

# Stripe Payment Endpoints
@router.post("/stripe/payment-intent", response_model=StripePaymentIntentResponse)
async def create_stripe_payment_intent(
    payment_data: StripePaymentIntentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Stripe Payment Intent for escrow payment with payment breakdown"""
    payment_service = PaymentService(db)
    return await payment_service.create_stripe_payment_intent(
        booking_id=payment_data.booking_id,
        working_hours=payment_data.working_hours,
        hourly_rate=payment_data.hourly_rate,
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
    """
    Process payment refund.
    
    POST /api/v1/payments/refund
    
    - Verify user is client (Requirement 6.1)
    - Accept payment_id and reason (Requirement 6.2)
    - Call process_refund method
    
    Requirements: 6.1, 6.2
    """
    # Verify user is client (Requirement 6.1)
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can request refunds"
        )
    
    # Call process_refund method
    payment_service = PaymentService(db)
    refund = await payment_service.process_refund(refund_request, current_user.id)
    return RefundResponse(**refund)

# Payment Disputes
@router.post("/disputes", response_model=PaymentDisputeResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_dispute(
    dispute_data: PaymentDisputeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create payment dispute.
    
    POST /api/v1/payments/disputes
    
    Creates a PaymentDispute record with status 'open', prevents payment release
    while dispute is open, and sends notification to admin.
    
    Requirements: 7.1, 7.2
    """
    payment_service = PaymentService(db)
    dispute = await payment_service.create_dispute(dispute_data, current_user.id)
    return PaymentDisputeResponse.from_orm(dispute)

@router.get("/disputes", response_model=List[PaymentDisputeResponse])
async def get_payment_disputes(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's payment disputes.
    
    GET /api/v1/payments/disputes
    
    Returns list of disputes initiated by the current user.
    Admins can see all disputes.
    
    Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
    """
    query = db.query(PaymentDispute)
    
    # If user is admin, show all disputes
    # Otherwise, show only disputes they initiated or are involved in
    if current_user.role != "admin":
        # Get disputes where user is the initiator or involved in the payment
        query = query.join(Payment).join(Payment.booking).filter(
            (PaymentDispute.initiated_by == current_user.id) |
            (Payment.booking.has(client_id=current_user.client_profile.id if current_user.client_profile else -1)) |
            (Payment.booking.has(worker_id=current_user.worker_profile.id if current_user.worker_profile else -1))
        )
    
    # Apply status filter if provided
    if status_filter:
        from app.db.models import DisputeStatus
        try:
            status_enum = DisputeStatus(status_filter)
            query = query.filter(PaymentDispute.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter: {status_filter}"
            )
    
    disputes = query.order_by(
        PaymentDispute.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return [PaymentDisputeResponse.from_orm(dispute) for dispute in disputes]

@router.put("/disputes/{dispute_id}", response_model=PaymentDisputeResponse)
async def update_payment_dispute(
    dispute_id: int,
    dispute_update: PaymentDisputeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update payment dispute (admin only).
    
    PUT /api/v1/payments/disputes/{id}
    
    Allows admin to update dispute status to 'under_review', 'resolved', or 'closed'.
    Stores resolution notes. If resolved in favor of client, triggers refund.
    
    Requirements: 7.3, 7.4, 7.5
    """
    # Verify user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update disputes"
        )
    
    payment_service = PaymentService(db)
    dispute = await payment_service.update_dispute(
        dispute_id=dispute_id,
        dispute_update=dispute_update,
        admin_user_id=current_user.id
    )
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

@router.get("/earnings", response_model=WorkerEarnings)
async def get_worker_earnings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get worker earnings summary.
    Returns total earned, available balance, pending balance, total withdrawn, and platform fees paid.
    """
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can view earnings"
        )
    
    if not current_user.worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    payment_service = PaymentService(db)
    
    # Get worker earnings using the new method
    earnings = await payment_service.get_worker_earnings(current_user.worker_profile.id)
    
    return WorkerEarnings(
        total_earned=earnings["total_earned"],
        available_balance=earnings["available_balance"],
        pending_balance=earnings["pending_balance"],
        total_withdrawn=earnings["total_withdrawn"],
        platform_fees_paid=earnings["platform_fees_paid"]
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

# Stripe Connect Endpoints
@router.get("/stripe-connect/account")
async def get_stripe_connect_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get worker's Stripe Connect account status"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can access Stripe Connect"
        )
    
    if not current_user.worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    worker = current_user.worker_profile
    
    # Check if worker has a Stripe account connected
    if hasattr(worker, 'stripe_account_id') and worker.stripe_account_id:
        # Verify the account is fully onboarded in Stripe
        try:
            account = stripe.Account.retrieve(worker.stripe_account_id)
            
            # Check if onboarding is complete
            if account.details_submitted and account.charges_enabled:
                return {
                    "connected": True,
                    "account_id": worker.stripe_account_id,
                    "email": current_user.email,
                    "charges_enabled": account.charges_enabled,
                    "payouts_enabled": account.payouts_enabled
                }
            else:
                # Account exists but onboarding not complete
                return {
                    "connected": False,
                    "onboarding_incomplete": True,
                    "account_id": worker.stripe_account_id
                }
        except stripe.error.StripeError:
            # Account doesn't exist in Stripe anymore
            return {
                "connected": False
            }
    else:
        return {
            "connected": False
        }

@router.post("/stripe-connect/onboard")
async def create_stripe_connect_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Stripe Connect onboarding link for worker"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can onboard to Stripe Connect"
        )
    
    if not current_user.worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    payment_service = PaymentService(db)
    
    try:
        onboarding_link = await payment_service.create_stripe_connect_account(
            worker_id=current_user.worker_profile.id,
            email=current_user.email,
            return_url="https://handwork-marketplace.com/stripe-connect/return",
            refresh_url="https://handwork-marketplace.com/stripe-connect/refresh"
        )
        
        return {"url": onboarding_link}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create onboarding link: {str(e)}"
        )

@router.post("/stripe-connect/refresh-link")
async def refresh_stripe_connect_link(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refresh Stripe Connect account link"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can access Stripe Connect"
        )
    
    if not current_user.worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    worker = current_user.worker_profile
    
    if not hasattr(worker, 'stripe_account_id') or not worker.stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe account found. Please complete onboarding first."
        )
    
    payment_service = PaymentService(db)
    
    try:
        refresh_link = await payment_service.refresh_stripe_connect_link(
            stripe_account_id=worker.stripe_account_id,
            return_url="https://handwork-marketplace.com/stripe-connect/return",
            refresh_url="https://handwork-marketplace.com/stripe-connect/refresh"
        )
        
        return {"url": refresh_link}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh link: {str(e)}"
        )

@router.delete("/stripe-connect/account")
async def disconnect_stripe_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect/remove worker's Stripe Connect account"""
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can disconnect Stripe Connect"
        )
    
    if not current_user.worker_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    worker = current_user.worker_profile
    
    if hasattr(worker, 'stripe_account_id') and worker.stripe_account_id:
        # Clear the stripe_account_id
        worker.stripe_account_id = None
        db.commit()
        db.refresh(worker)
        
        return {
            "success": True,
            "message": "Stripe account disconnected successfully"
        }
    else:
        return {
            "success": True,
            "message": "No Stripe account was connected"
        }

# Webhook Endpoints
@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhooks.
    
    POST /api/v1/payments/webhooks/stripe
    
    Verifies webhook signature, parses webhook payload, and routes to
    appropriate handler based on event type.
    
    Supported events:
    - payment_intent.succeeded: Update payment status to 'held'
    - payment_intent.payment_failed: Update payment status to 'failed'
    - transfer.paid: Update payout status to 'completed'
    - transfer.failed: Update payout status to 'failed'
    
    Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
    """
    payment_service = PaymentService(db)
    
    # Get raw payload and signature
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header"
        )
    
    # Verify webhook signature (Requirement 8.1, 8.5)
    event = await payment_service.verify_webhook_signature(payload, sig_header)
    
    # Process webhook event and route to appropriate handler (Requirement 8.1, 8.2, 8.3, 8.4, 8.5)
    result = await payment_service.process_webhook_event(event)
    
    return result

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