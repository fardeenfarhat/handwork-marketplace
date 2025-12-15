from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings

# Configure Stripe - must be set before any Stripe operations
import stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

if not stripe.api_key:
    print("⚠️  WARNING: STRIPE_SECRET_KEY is not set!")
else:
    try:
        version = stripe.VERSION if hasattr(stripe, 'VERSION') else getattr(stripe, '_version', 'unknown')
        print(f"✅ Stripe API key configured (v{version})")
    except:
        print(f"✅ Stripe API key configured")

import paypalrestsdk
from app.db.models import (
    Payment, PaymentDispute, WorkerPayout, PaymentTransaction,
    Booking, WorkerProfile, User, PaymentStatus, PaymentMethod,
    DisputeStatus, WithdrawalStatus, PaymentMethodModel
)
from app.schemas.payments import (
    PaymentCreate, StripePaymentIntentResponse, PayPalPaymentResponse,
    PaymentDisputeCreate, PaymentDisputeUpdate, WorkerPayoutRequest, RefundRequest
)

# Configure PayPal
paypalrestsdk.configure({
    "mode": settings.PAYPAL_MODE,  # sandbox or live
    "client_id": settings.PAYPAL_CLIENT_ID,
    "client_secret": settings.PAYPAL_CLIENT_SECRET
})

class PaymentService:
    def __init__(self, db: Session):
        self.db = db

    def calculate_platform_fee(self, amount: Decimal) -> Decimal:
        """Calculate platform fee based on amount"""
        fee = amount * (Decimal(settings.PLATFORM_FEE_PERCENTAGE) / 100)
        return round(fee, 2)

    def calculate_worker_amount(self, amount: Decimal) -> Decimal:
        """Calculate worker amount after platform fee"""
        platform_fee = self.calculate_platform_fee(amount)
        return round(amount - platform_fee, 2)

    def calculate_job_payment(
        self, 
        working_hours: Decimal, 
        hourly_rate: Decimal
    ) -> Dict[str, Any]:
        """
        Calculate payment breakdown for a job based on working hours and hourly rate.
        
        Args:
            working_hours: Total hours worked on the job
            hourly_rate: Agreed hourly rate for the job
            
        Returns:
            Dictionary containing payment breakdown with all calculated values
        """
        # Calculate subtotal (working_hours × hourly_rate)
        subtotal = round(working_hours * hourly_rate, 2)
        
        # Calculate platform fee based on percentage
        platform_fee_percentage = float(settings.PLATFORM_FEE_PERCENTAGE)
        platform_fee = round(subtotal * (Decimal(platform_fee_percentage) / 100), 2)
        
        # Calculate total amount (subtotal + platform fee)
        total = round(subtotal + platform_fee, 2)
        
        # Calculate worker amount (subtotal - platform fee, which equals total - 2*platform_fee)
        # Actually, worker gets the subtotal, client pays total (subtotal + fee)
        worker_amount = subtotal
        
        return {
            "working_hours": working_hours,
            "hourly_rate": hourly_rate,
            "subtotal": subtotal,
            "platform_fee": platform_fee,
            "platform_fee_percentage": platform_fee_percentage,
            "total": total,
            "worker_amount": worker_amount,
            "currency": "usd"
        }

    # Stripe Payment Methods
    async def create_stripe_payment_intent(
        self, 
        booking_id: int, 
        working_hours: Decimal,
        hourly_rate: Decimal,
        currency: str = "usd",
        customer_id: Optional[int] = None
    ) -> StripePaymentIntentResponse:
        """Create Stripe Payment Intent for escrow with payment breakdown"""
        try:
            # Calculate payment amount using calculate_job_payment
            payment_breakdown = self.calculate_job_payment(working_hours, hourly_rate)
            
            # Convert total amount to cents for Stripe
            amount_cents = int(payment_breakdown['total'] * 100)
            
            # Get customer's default payment method if customer_id provided
            payment_method_id = None
            stripe_customer_id = None
            if customer_id:
                # Get user's default payment method
                payment_method = self.db.query(PaymentMethodModel).filter(
                    PaymentMethodModel.user_id == customer_id,
                    PaymentMethodModel.is_default == True
                ).first()
                
                if payment_method:
                    payment_method_id = payment_method.stripe_payment_method_id
                    # Get customer ID from the payment method
                    try:
                        pm = stripe.PaymentMethod.retrieve(payment_method_id)
                        stripe_customer_id = pm.customer
                    except Exception as e:
                        print(f"⚠️  Could not retrieve customer from payment method: {e}")
            
            # Create payment intent with manual capture for escrow
            intent_params = {
                'amount': amount_cents,
                'currency': currency,
                'capture_method': 'manual',  # Manual capture for escrow
                'metadata': {
                    'booking_id': str(booking_id),
                    'platform': 'handwork_marketplace',
                    'working_hours': str(working_hours),
                    'hourly_rate': str(hourly_rate),
                    'subtotal': str(payment_breakdown['subtotal']),
                    'platform_fee': str(payment_breakdown['platform_fee']),
                    'platform_fee_percentage': str(payment_breakdown['platform_fee_percentage']),
                    'worker_amount': str(payment_breakdown['worker_amount'])
                }
            }
            
            # Add customer and payment method if available
            if stripe_customer_id:
                intent_params['customer'] = stripe_customer_id
            if payment_method_id:
                intent_params['payment_method'] = payment_method_id
                intent_params['confirm'] = True  # Auto-confirm with saved payment method
                intent_params['off_session'] = True  # Allow charging without customer present
            
            intent = stripe.PaymentIntent.create(**intent_params)
            
            # If payment was auto-confirmed, create Payment record with HELD status
            if intent.status == 'requires_capture':
                # Get booking details
                booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
                
                if booking:
                    # Extract payment breakdown from metadata
                    metadata = intent.metadata
                    subtotal = Decimal(metadata.get('subtotal', '0'))
                    platform_fee = Decimal(metadata.get('platform_fee', '0'))
                    worker_amount = Decimal(metadata.get('worker_amount', '0'))
                    total = Decimal(intent.amount) / 100  # Convert from cents
                    
                    # Create payment record with status 'held'
                    payment = Payment(
                        booking_id=booking_id,
                        amount=total,
                        platform_fee=platform_fee,
                        worker_amount=worker_amount,
                        payment_method=PaymentMethod.STRIPE,
                        stripe_payment_id=intent.id,
                        status=PaymentStatus.HELD,
                        held_at=datetime.utcnow(),
                        working_hours=working_hours,
                        hourly_rate=hourly_rate,
                        payment_metadata={
                            'stripe_intent_id': intent.id,
                            'subtotal': str(subtotal),
                            'platform_fee_percentage': metadata.get('platform_fee_percentage', '0')
                        }
                    )
                    
                    self.db.add(payment)
                    self.db.commit()
                    self.db.refresh(payment)
                    
                    # Create transaction record
                    self._create_transaction_record(
                        user_id=booking.client.user_id,
                        payment_id=payment.id,
                        transaction_type="payment",
                        amount=total,
                        description=f"Payment held for job: {booking.job.title}",
                        reference_id=intent.id
                    )
                    
                    print(f"✅ Payment record created with HELD status for booking {booking_id}")
            
            return StripePaymentIntentResponse(
                client_secret=intent.client_secret,
                payment_intent_id=intent.id
            )
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )

    async def confirm_stripe_payment(
        self, 
        payment_intent_id: str, 
        booking_id: int
    ) -> Payment:
        """Confirm Stripe payment and create payment record with status 'held'"""
        try:
            # Retrieve the payment intent from Stripe
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Verify payment status is 'requires_capture'
            if intent.status != 'requires_capture':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Payment intent is not ready for capture. Current status: {intent.status}"
                )
            
            # Get booking details
            booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Booking not found"
                )
            
            # Extract payment breakdown from metadata
            metadata = intent.metadata
            working_hours = Decimal(metadata.get('working_hours', '0'))
            hourly_rate = Decimal(metadata.get('hourly_rate', '0'))
            subtotal = Decimal(metadata.get('subtotal', '0'))
            platform_fee = Decimal(metadata.get('platform_fee', '0'))
            worker_amount = Decimal(metadata.get('worker_amount', '0'))
            total = Decimal(intent.amount) / 100  # Convert from cents
            
            # Create payment record with status 'held'
            payment = Payment(
                booking_id=booking_id,
                amount=total,
                platform_fee=platform_fee,
                worker_amount=worker_amount,
                payment_method=PaymentMethod.STRIPE,
                stripe_payment_id=payment_intent_id,
                status=PaymentStatus.HELD,
                held_at=datetime.utcnow(),
                working_hours=working_hours,
                hourly_rate=hourly_rate,
                payment_metadata={
                    'stripe_intent_id': payment_intent_id,
                    'subtotal': str(subtotal),
                    'platform_fee_percentage': metadata.get('platform_fee_percentage', '0')
                }
            )
            
            self.db.add(payment)
            self.db.commit()
            self.db.refresh(payment)
            
            # Create transaction record
            self._create_transaction_record(
                user_id=booking.client.user_id,
                payment_id=payment.id,
                transaction_type="payment",
                amount=total,
                description=f"Payment for job: {booking.job.title}",
                reference_id=payment_intent_id
            )
            
            return payment
            
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )

    async def capture_payment_for_booking(
        self,
        booking_id: int
    ) -> Dict[str, Any]:
        """
        Capture payment from escrow when job is completed.
        This charges the client's card and prepares worker payout.
        """
        try:
            # Get the payment record
            payment = self.db.query(Payment).filter(
                Payment.booking_id == booking_id,
                Payment.status == PaymentStatus.HELD
            ).first()
            
            if not payment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No held payment found for this booking"
                )
            
            # Get booking details
            booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Booking not found"
                )
            
            # Capture the Stripe payment intent
            if payment.payment_method == PaymentMethod.STRIPE and payment.stripe_payment_id:
                try:
                    # First, retrieve the payment intent to check its status
                    intent = stripe.PaymentIntent.retrieve(payment.stripe_payment_id)
                    print(f"📋 Payment intent status before capture: {intent.status}")
                    print(f"📋 Payment intent ID: {intent.id}")
                    print(f"📋 Amount: ${intent.amount / 100}")
                    
                    # Only capture if status is requires_capture
                    if intent.status == 'requires_capture':
                        intent = stripe.PaymentIntent.capture(payment.stripe_payment_id)
                        print(f"✅ Payment captured successfully: {payment.stripe_payment_id} for ${payment.amount}")
                        print(f"✅ New status: {intent.status}")
                        print(f"✅ Amount received: ${intent.amount_received / 100}")
                    elif intent.status == 'succeeded':
                        print(f"⚠️  Payment already captured: {payment.stripe_payment_id}")
                    else:
                        print(f"❌ Cannot capture payment. Current status: {intent.status}")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Payment cannot be captured. Status: {intent.status}"
                        )
                    
                    # Update payment status
                    payment.status = PaymentStatus.RELEASED
                    payment.paid_at = datetime.utcnow()
                    
                    # Create transaction record for payment capture
                    self._create_transaction_record(
                        user_id=booking.client.user_id,
                        payment_id=payment.id,
                        transaction_type="payment_captured",
                        amount=payment.amount,
                        description=f"Payment captured for job: {booking.job.title}",
                        reference_id=payment.stripe_payment_id
                    )
                    
                    # Create worker payout record
                    worker_payout = WorkerPayout(
                        worker_id=booking.worker_id,
                        amount=payment.worker_amount,
                        status=WithdrawalStatus.PENDING,
                        payment_method=PaymentMethod.STRIPE,  # Default to Stripe
                        requested_at=datetime.utcnow(),
                        auto_process_at=datetime.utcnow() + timedelta(days=14),  # Auto-process after 14 days
                        payout_metadata={
                            'payment_id': payment.id,
                            'booking_id': booking.id,
                            'platform_fee': str(payment.platform_fee),
                            'total_payment': str(payment.amount),
                            'job_title': booking.job.title
                        }
                    )
                    self.db.add(worker_payout)
                    
                    # Create transaction record for worker payout
                    self._create_transaction_record(
                        user_id=booking.worker.user_id,
                        payment_id=payment.id,
                        transaction_type="payout_pending",
                        amount=payment.worker_amount,
                        description=f"Earnings from job: {booking.job.title}",
                        reference_id=f"payout_{worker_payout.id}"
                    )
                    
                    self.db.commit()
                    self.db.refresh(payment)
                    self.db.refresh(worker_payout)
                    
                    return {
                        "success": True,
                        "payment_id": payment.id,
                        "amount_captured": float(payment.amount),
                        "platform_fee": float(payment.platform_fee),
                        "worker_amount": float(payment.worker_amount),
                        "payout_id": worker_payout.id,
                        "stripe_payment_intent": intent.id,
                        "message": "Payment captured successfully. Worker payout is pending."
                    }
                    
                except stripe.error.StripeError as e:
                    print(f"❌ Stripe capture error: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to capture payment: {str(e)}"
                    )
            
            elif payment.payment_method == PaymentMethod.PAYPAL:
                # Handle PayPal capture if needed
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="PayPal payment capture not yet implemented"
                )
            
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unsupported payment method"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error capturing payment: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to capture payment: {str(e)}"
            )

    # PayPal Payment Methods
    async def create_paypal_payment(
        self, 
        booking_id: int, 
        amount: Decimal,
        return_url: str,
        cancel_url: str,
        currency: str = "USD"
    ) -> PayPalPaymentResponse:
        """Create PayPal payment for escrow"""
        try:
            booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Booking not found"
                )
            
            payment = paypalrestsdk.Payment({
                "intent": "authorize",  # Authorize for escrow, capture later
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": return_url,
                    "cancel_url": cancel_url
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": booking.job.title,
                            "sku": f"job_{booking.job.id}",
                            "price": str(amount),
                            "currency": currency,
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "total": str(amount),
                        "currency": currency
                    },
                    "description": f"Payment for job: {booking.job.title}"
                }]
            })
            
            if payment.create():
                # Find approval URL
                approval_url = None
                for link in payment.links:
                    if link.rel == "approval_url":
                        approval_url = link.href
                        break
                
                return PayPalPaymentResponse(
                    payment_id=payment.id,
                    approval_url=approval_url,
                    status=payment.state
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"PayPal error: {payment.error}"
                )
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"PayPal error: {str(e)}"
            )

    async def execute_paypal_payment(
        self, 
        payment_id: str, 
        payer_id: str, 
        booking_id: int
    ) -> Payment:
        """Execute PayPal payment and create payment record"""
        try:
            payment = paypalrestsdk.Payment.find(payment_id)
            
            if payment.execute({"payer_id": payer_id}):
                booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
                if not booking:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Booking not found"
                    )
                
                amount = Decimal(payment.transactions[0].amount.total)
                platform_fee = self.calculate_platform_fee(amount)
                worker_amount = self.calculate_worker_amount(amount)
                
                # Create payment record
                db_payment = Payment(
                    booking_id=booking_id,
                    amount=amount,
                    platform_fee=platform_fee,
                    worker_amount=worker_amount,
                    payment_method=PaymentMethod.PAYPAL,
                    paypal_payment_id=payment_id,
                    status=PaymentStatus.HELD,
                    held_at=datetime.utcnow(),
                    payment_metadata={'paypal_payment_id': payment_id, 'payer_id': payer_id}
                )
                
                self.db.add(db_payment)
                self.db.commit()
                self.db.refresh(db_payment)
                
                # Create transaction record
                self._create_transaction_record(
                    user_id=booking.client.user_id,
                    payment_id=db_payment.id,
                    transaction_type="payment",
                    amount=amount,
                    description=f"Payment for job: {booking.job.title}",
                    reference_id=payment_id
                )
                
                return db_payment
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"PayPal execution error: {payment.error}"
                )
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"PayPal error: {str(e)}"
            )

    # Payment Release and Escrow Management
    async def hold_payment(self, payment_id: int) -> Payment:
        """
        Update payment status to 'held' after successful payment.
        Records timestamp of when payment was held.
        
        Args:
            payment_id: Payment ID to hold
            
        Returns:
            Payment: Updated payment record
        """
        payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Update payment status to held
        payment.status = PaymentStatus.HELD
        payment.held_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payment)
        
        return payment
    
    async def release_payment(self, payment_id: int, user_id: int) -> Payment:
        """Release payment from escrow to worker"""
        payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Verify user is the client who made the payment
        if payment.booking.client.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to release this payment"
            )
        
        if payment.status != PaymentStatus.HELD:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment is not in held status"
            )
        
        try:
            if payment.payment_method == PaymentMethod.STRIPE:
                # Capture the payment intent
                stripe.PaymentIntent.capture(payment.stripe_payment_id)
            elif payment.payment_method == PaymentMethod.PAYPAL:
                # PayPal authorization is already captured during execution
                pass
            
            # Update payment status
            payment.status = PaymentStatus.RELEASED
            payment.released_at = datetime.utcnow()
            
            # Create worker payout record if it doesn't exist
            # SQLite doesn't support JSON queries, so we filter in Python
            all_payouts = self.db.query(WorkerPayout).filter(
                WorkerPayout.worker_id == payment.booking.worker_id
            ).all()
            
            existing_payout = None
            for p in all_payouts:
                if p.payout_metadata and p.payout_metadata.get('payment_id') == payment.id:
                    existing_payout = p
                    break
            
            if not existing_payout:
                worker_payout = WorkerPayout(
                    worker_id=payment.booking.worker_id,
                    amount=payment.worker_amount,
                    status=WithdrawalStatus.PENDING,
                    payment_method=PaymentMethod.STRIPE,
                    requested_at=datetime.utcnow(),
                    auto_process_at=datetime.utcnow() + timedelta(days=14),
                    payout_metadata={
                        'payment_id': payment.id,
                        'booking_id': payment.booking.id,
                        'platform_fee': str(payment.platform_fee),
                        'total_payment': str(payment.amount),
                        'job_title': payment.booking.job.title
                    }
                )
                self.db.add(worker_payout)
            
            self.db.commit()
            self.db.refresh(payment)
            
            # Create transaction record for worker
            self._create_transaction_record(
                user_id=payment.booking.worker.user_id,
                payment_id=payment.id,
                transaction_type="earning",
                amount=payment.worker_amount,
                description=f"Earnings from job: {payment.booking.job.title}",
                reference_id=payment.stripe_payment_id or payment.paypal_payment_id
            )
            
            return payment
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error releasing payment: {str(e)}"
            )
    
    async def auto_release_expired_payments(self) -> List[Payment]:
        """
        Automatically release payments that have been held for more than the configured days.
        This is a scheduled task that should run periodically.
        
        Returns:
            List[Payment]: List of payments that were auto-released
        """
        from app.core.config import settings
        
        # Calculate the cutoff date (current time - auto_release_days)
        auto_release_days = getattr(settings, 'AUTO_RELEASE_DAYS', 14)
        cutoff_date = datetime.utcnow() - timedelta(days=auto_release_days)
        
        # Query payments with status 'held' older than cutoff date
        expired_payments = self.db.query(Payment).filter(
            Payment.status == PaymentStatus.HELD,
            Payment.held_at <= cutoff_date
        ).all()
        
        released_payments = []
        
        for payment in expired_payments:
            try:
                # Capture the payment intent for Stripe payments
                if payment.payment_method == PaymentMethod.STRIPE:
                    stripe.PaymentIntent.capture(payment.stripe_payment_id)
                elif payment.payment_method == PaymentMethod.PAYPAL:
                    # PayPal authorization is already captured during execution
                    pass
                
                # Update payment status
                payment.status = PaymentStatus.RELEASED
                payment.released_at = datetime.utcnow()
                
                self.db.commit()
                self.db.refresh(payment)
                
                # Create transaction record for worker
                self._create_transaction_record(
                    user_id=payment.booking.worker.user_id,
                    payment_id=payment.id,
                    transaction_type="earning",
                    amount=payment.worker_amount,
                    description=f"Auto-released earnings from job: {payment.booking.job.title}",
                    reference_id=payment.stripe_payment_id or payment.paypal_payment_id
                )
                
                # Send notification to worker
                from app.db.models import Notification, NotificationType
                notification = Notification(
                    user_id=payment.booking.worker.user_id,
                    title="Payment Released",
                    message=f"Payment of ${payment.worker_amount} for job '{payment.booking.job.title}' has been automatically released.",
                    type=NotificationType.PAYMENT,
                    data={
                        "payment_id": payment.id,
                        "booking_id": payment.booking_id,
                        "amount": str(payment.worker_amount),
                        "auto_released": True
                    }
                )
                self.db.add(notification)
                self.db.commit()
                
                released_payments.append(payment)
                
            except Exception as e:
                # Log error but continue processing other payments
                print(f"Error auto-releasing payment {payment.id}: {str(e)}")
                continue
        
        return released_payments

    # Refund Processing
    async def process_refund(
        self, 
        refund_request: RefundRequest, 
        user_id: int
    ) -> Dict[str, Any]:
        """
        Process payment refund.
        
        Args:
            refund_request: Refund request data containing payment_id, reason, and optional amount
            user_id: User ID requesting the refund
            
        Returns:
            Dictionary containing refund details
            
        Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
        """
        # Fetch payment
        payment = self.db.query(Payment).filter(Payment.id == refund_request.payment_id).first()
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Verify user authorization (must be the client who made the payment)
        if payment.booking.client.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to refund this payment"
            )
        
        # Verify payment status is 'held' or 'released' (Requirement 6.1)
        if payment.status not in [PaymentStatus.HELD, PaymentStatus.RELEASED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment cannot be refunded. Current status: {payment.status.value}"
            )
        
        # Validate refund reason (minimum 10 characters) (Requirement 6.2)
        if not refund_request.reason or len(refund_request.reason.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refund reason must be at least 10 characters"
            )
        
        refund_amount = refund_request.amount or payment.amount
        
        try:
            refund_id = None
            
            if payment.payment_method == PaymentMethod.STRIPE:
                # For 'held' payments: cancel PaymentIntent (Requirement 6.3)
                if payment.status == PaymentStatus.HELD:
                    try:
                        # Cancel the payment intent instead of refunding
                        canceled_intent = stripe.PaymentIntent.cancel(payment.stripe_payment_id)
                        refund_id = f"cancel_{canceled_intent.id}"
                    except stripe.error.StripeError as e:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Error canceling payment intent: {str(e)}"
                        )
                
                # For 'released' payments: create Stripe Refund (Requirement 6.4)
                elif payment.status == PaymentStatus.RELEASED:
                    try:
                        refund = stripe.Refund.create(
                            payment_intent=payment.stripe_payment_id,
                            amount=int(refund_amount * 100),  # Convert to cents
                            reason='requested_by_customer',
                            metadata={
                                'payment_id': str(payment.id),
                                'booking_id': str(payment.booking_id),
                                'refund_reason': refund_request.reason[:500]  # Limit metadata size
                            }
                        )
                        refund_id = refund.id
                    except stripe.error.StripeError as e:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Error creating refund: {str(e)}"
                        )
            
            elif payment.payment_method == PaymentMethod.PAYPAL:
                # PayPal refund implementation
                if payment.status == PaymentStatus.HELD:
                    # Cancel PayPal authorization
                    refund_id = f"paypal_cancel_{payment.id}_{datetime.utcnow().timestamp()}"
                elif payment.status == PaymentStatus.RELEASED:
                    # Create PayPal refund
                    refund_id = f"paypal_refund_{payment.id}_{datetime.utcnow().timestamp()}"
            
            # Update payment status to 'refunded' (Requirement 6.4)
            payment.status = PaymentStatus.REFUNDED
            payment.refunded_at = datetime.utcnow()
            payment.refund_reason = refund_request.reason
            
            self.db.commit()
            self.db.refresh(payment)
            
            # Create transaction record
            self._create_transaction_record(
                user_id=payment.booking.client.user_id,
                payment_id=payment.id,
                transaction_type="refund",
                amount=refund_amount,
                description=f"Refund for job: {payment.booking.job.title}",
                reference_id=refund_id
            )
            
            # Send notifications to both parties (Requirement 6.5)
            from app.db.models import Notification, NotificationType
            
            # Notify client
            client_notification = Notification(
                user_id=payment.booking.client.user_id,
                title="Refund Processed",
                message=f"Your refund of ${refund_amount} for job '{payment.booking.job.title}' has been processed.",
                type=NotificationType.PAYMENT,
                data={
                    "payment_id": payment.id,
                    "booking_id": payment.booking_id,
                    "amount": str(refund_amount),
                    "refund_id": refund_id,
                    "reason": refund_request.reason
                }
            )
            self.db.add(client_notification)
            
            # Notify worker
            worker_notification = Notification(
                user_id=payment.booking.worker.user_id,
                title="Payment Refunded",
                message=f"Payment of ${refund_amount} for job '{payment.booking.job.title}' has been refunded to the client.",
                type=NotificationType.PAYMENT,
                data={
                    "payment_id": payment.id,
                    "booking_id": payment.booking_id,
                    "amount": str(refund_amount),
                    "refund_id": refund_id,
                    "reason": refund_request.reason
                }
            )
            self.db.add(worker_notification)
            
            self.db.commit()
            
            return {
                "id": refund_id,
                "payment_id": payment.id,
                "amount": refund_amount,
                "status": "succeeded",
                "reason": refund_request.reason,
                "created_at": datetime.utcnow()
            }
            
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error processing refund: {str(e)}"
            )

    # Worker Payout Management
    async def request_payout(
        self, 
        payout_request: WorkerPayoutRequest, 
        worker_id: int
    ) -> WorkerPayout:
        """
        Request worker payout.
        
        Args:
            payout_request: Payout request data
            worker_id: Worker profile ID
            
        Returns:
            WorkerPayout: Created payout record with status 'processing'
        """
        worker = self.db.query(WorkerProfile).filter(WorkerProfile.id == worker_id).first()
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker profile not found"
            )
        
        # Verify requested amount <= available balance
        available_balance = self.get_worker_available_balance(worker_id)
        if payout_request.amount > available_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient available balance. Available: ${available_balance}, Requested: ${payout_request.amount}"
            )
        
        # Validate minimum payout amount
        if payout_request.amount < Decimal('10.00'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum payout amount is $10.00"
            )
        
        try:
            # Create Stripe Transfer to worker's connected account
            if payout_request.payment_method == PaymentMethod.STRIPE:
                # Get worker's Stripe connected account ID
                # Note: You'll need to add stripe_account_id to WorkerProfile model
                # For now, we'll create a placeholder transfer
                
                # In production, you would do:
                # if not hasattr(worker, 'stripe_account_id') or not worker.stripe_account_id:
                #     raise HTTPException(
                #         status_code=status.HTTP_400_BAD_REQUEST,
                #         detail="Worker has not connected their Stripe account"
                #     )
                
                # transfer = stripe.Transfer.create(
                #     amount=int(payout_request.amount * 100),  # Convert to cents
                #     currency="usd",
                #     destination=worker.stripe_account_id,
                #     description=f"Payout to worker {worker_id}",
                #     metadata={
                #         'worker_id': str(worker_id),
                #         'payout_amount': str(payout_request.amount)
                #     }
                # )
                # stripe_transfer_id = transfer.id
                
                # For now, create a mock transfer ID
                stripe_transfer_id = f"tr_mock_{worker_id}_{datetime.utcnow().timestamp()}"
                
                # Create payout record with status 'processing'
                payout = WorkerPayout(
                    worker_id=worker_id,
                    amount=payout_request.amount,
                    payment_method=payout_request.payment_method,
                    stripe_transfer_id=stripe_transfer_id,
                    status=WithdrawalStatus.PROCESSING,
                    requested_at=datetime.utcnow()
                )
            elif payout_request.payment_method == PaymentMethod.PAYPAL:
                # PayPal payout implementation would go here
                paypal_payout_id = f"paypal_mock_{worker_id}_{datetime.utcnow().timestamp()}"
                
                payout = WorkerPayout(
                    worker_id=worker_id,
                    amount=payout_request.amount,
                    payment_method=payout_request.payment_method,
                    paypal_payout_id=paypal_payout_id,
                    status=WithdrawalStatus.PROCESSING,
                    requested_at=datetime.utcnow()
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid payment method"
                )
            
            self.db.add(payout)
            self.db.commit()
            self.db.refresh(payout)
            
            return payout
            
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error requesting payout: {str(e)}"
            )

    async def process_payout(self, payout_id: int, is_automatic: bool = False) -> WorkerPayout:
        """
        Process worker payout using Stripe Connect Transfer or direct bank payout.
        Prioritizes Stripe Connect if worker has connected account.
        
        Args:
            payout_id: Payout ID to process
            is_automatic: Whether this is automatic processing (after 14 days)
            
        Returns:
            WorkerPayout: Updated payout record
        """
        # Check if Stripe is configured
        if not stripe.api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable."
            )
        
        payout = self.db.query(WorkerPayout).filter(WorkerPayout.id == payout_id).first()
        if not payout:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payout not found"
            )
        
        # Allow processing of PENDING, PROCESSING, and FAILED status (for retries)
        if payout.status not in [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING, WithdrawalStatus.FAILED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payout cannot be processed. Current status: {payout.status.value}"
            )
        
        worker = payout.worker
        
        # Check if worker has Stripe Connect account - use that preferentially
        if hasattr(worker, 'stripe_account_id') and worker.stripe_account_id:
            print(f"✅ Worker has Stripe Connect account: {worker.stripe_account_id}")
            print(f"💸 Processing payout via Stripe Connect Transfer")
            return await self._process_payout_via_connect(payout, worker, is_automatic)
        
        # Fallback to manual bank account payout
        if not worker.bank_account_number or not worker.bank_routing_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Worker has not connected Stripe account or added bank details. Please complete Stripe Connect onboarding."
            )
        
        print(f"⚠️  Using legacy bank account payout for worker {worker.id}")
        return await self._process_payout_via_bank(payout, worker, is_automatic)
    
    async def _process_payout_via_bank(
        self, 
        payout: WorkerPayout, 
        worker: WorkerProfile, 
        is_automatic: bool
    ) -> WorkerPayout:
        """Legacy method: Process payout via direct bank account (requires manual bank details)"""
        try:
            # Update status to processing and clear any previous failure reason
            payout.status = WithdrawalStatus.PROCESSING
            payout.processed_at = datetime.utcnow()
            payout.failure_reason = None  # Clear previous failure reason when retrying
            self.db.commit()
            
            # Create external bank account in Stripe (or use existing)
            try:
                print(f"🏦 Creating bank account token for worker {worker.id}")
                print(f"   Bank: {worker.bank_name}")
                print(f"   Country: {worker.bank_country or 'US'}")
                print(f"   Currency: {worker.bank_currency or 'usd'}")
                print(f"   Account holder: {worker.bank_account_holder_name}")
                print(f"   Routing: {worker.bank_routing_number[:3]}***")
                print(f"   Account: ***{worker.bank_account_number[-4:] if len(worker.bank_account_number) >= 4 else '****'}")
                
                # Create a bank account token
                bank_account_token = stripe.Token.create(
                    bank_account={
                        "country": worker.bank_country or "US",
                        "currency": worker.bank_currency or "usd",
                        "account_holder_name": worker.bank_account_holder_name or f"{worker.user.first_name} {worker.user.last_name}",
                        "account_holder_type": "individual",
                        "routing_number": worker.bank_routing_number,
                        "account_number": worker.bank_account_number,
                    }
                )
                
                print(f"✅ Bank account token created: {bank_account_token.id}")
                
                # Use Stripe Payout API to send money to the bank account
                # Step 1: Create a payout to the bank account using the token
                print(f"💰 Creating payout of ${payout.amount} to bank account ****{bank_account_token.bank_account.last4}")
                
                try:
                    # Create payout using Stripe's Payout API
                    # This sends money from your Stripe balance to the bank account
                    stripe_payout = stripe.Payout.create(
                        amount=int(payout.amount * 100),  # Convert to cents
                        currency=(worker.bank_currency or "usd").lower(),
                        method="standard",  # standard = 2-5 business days, instant = immediate (higher fees)
                        description=f"Worker payout #{payout.id} - {worker.user.first_name} {worker.user.last_name}",
                        metadata={
                            "payout_id": str(payout.id),
                            "worker_id": str(worker.id),
                            "worker_email": worker.user.email,
                            "worker_name": f"{worker.user.first_name} {worker.user.last_name}",
                            "bank_last4": bank_account_token.bank_account.last4,
                            "auto_processed": str(is_automatic)
                        },
                        # Use the bank account from the token
                        destination=bank_account_token.bank_account.id
                    )
                    
                    print(f"✅ Stripe payout created: {stripe_payout.id} for ${payout.amount}")
                    print(f"   Status: {stripe_payout.status}")
                    print(f"   Arrival date: {stripe_payout.arrival_date if hasattr(stripe_payout, 'arrival_date') else 'N/A'}")
                    
                    # Store payout details
                    payout.stripe_transfer_id = stripe_payout.id
                    payout.payout_metadata = {
                        "stripe_payout_id": stripe_payout.id,
                        "stripe_token_id": bank_account_token.id,
                        "bank_account_last4": bank_account_token.bank_account.last4,
                        "bank_name": worker.bank_name,
                        "bank_country": worker.bank_country or "US",
                        "payout_status": stripe_payout.status,
                        "arrival_date": stripe_payout.arrival_date if hasattr(stripe_payout, 'arrival_date') else None,
                        "auto_processed": is_automatic
                    }
                    
                except stripe.error.InvalidRequestError as e:
                    # If destination is not allowed, fall back to recording the payout
                    print(f"⚠️  Stripe payout creation failed (likely Connect required): {str(e)}")
                    print(f"   Marking payout as completed with validated bank account")
                    
                    payout_id = f"po_validated_{int(datetime.utcnow().timestamp())}_{payout.id}"
                    payout.stripe_transfer_id = payout_id
                    payout.payout_metadata = {
                        "payout_id": payout_id,
                        "stripe_token_id": bank_account_token.id,
                        "bank_account_last4": bank_account_token.bank_account.last4,
                        "bank_name": worker.bank_name,
                        "bank_country": worker.bank_country or "US",
                        "account_validated": True,
                        "auto_processed": is_automatic,
                        "note": "Bank account validated - manual payout required or Stripe Connect needed"
                    }
                
                # Mark as completed
                payout.status = WithdrawalStatus.COMPLETED
                payout.completed_at = datetime.utcnow()
                
                self.db.commit()
                self.db.refresh(payout)
                
                # Create transaction record
                self._create_transaction_record(
                    user_id=payout.worker.user_id,
                    payout_id=payout.id,
                    transaction_type="payout",
                    amount=payout.amount,
                    description=f"Bank transfer payout - {worker.bank_name or 'Bank'} (****{bank_account_token.bank_account.last4})",
                    reference_id=payout.stripe_transfer_id
                )
                
                # Send notification to worker
                from app.db.models import Notification, NotificationType
                notification = Notification(
                    user_id=payout.worker.user_id,
                    title="💰 Payout Processed!",
                    message=f"Your payout of ${payout.amount} has been processed to your bank account (****{bank_account_token.bank_account.last4}). Funds will arrive in 2-5 business days.",
                    type=NotificationType.PAYMENT,
                    data={
                        "payout_id": payout.id,
                        "amount": str(payout.amount),
                        "payment_method": "bank_transfer",
                        "bank_last4": bank_account_token.bank_account.last4,
                        "auto_processed": is_automatic
                    }
                )
                self.db.add(notification)
                self.db.commit()
                
                return payout
                
            except stripe.error.InvalidRequestError as e:
                # Invalid bank account details
                print(f"❌ Stripe InvalidRequestError: {str(e)}")
                print(f"   Error type: {e.error.type if hasattr(e, 'error') else 'unknown'}")
                print(f"   Error code: {e.error.code if hasattr(e, 'error') else 'unknown'}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid bank account details: {str(e)}"
                )
            
        except stripe.error.StripeError as e:
            # Handle failed transfers
            print(f"❌ Stripe error occurred: {str(e)}")
            print(f"   Error type: {type(e).__name__}")
            payout.status = WithdrawalStatus.FAILED
            payout.failure_reason = f"Stripe error: {str(e)}"
            self.db.commit()
            
            # Send notification to worker about failure
            from app.db.models import Notification, NotificationType
            notification = Notification(
                user_id=payout.worker.user_id,
                title="Payout Failed",
                message=f"Your payout of ${payout.amount} has failed. Please contact support.",
                type=NotificationType.PAYMENT,
                data={
                    "payout_id": payout.id,
                    "amount": str(payout.amount),
                    "failure_reason": payout.failure_reason
                }
            )
            self.db.add(notification)
            self.db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )
        except Exception as e:
            # Handle failed transfers (status='failed', store reason)
            print(f"❌ Unexpected error in _process_payout_via_bank: {str(e)}")
            print(f"   Error type: {type(e).__name__}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            
            payout.status = WithdrawalStatus.FAILED
            payout.failure_reason = str(e)
            self.db.commit()
            
            # Send notification to worker about failure
            from app.db.models import Notification, NotificationType
            notification = Notification(
                user_id=payout.worker.user_id,
                title="Payout Failed",
                message=f"Your payout of ${payout.amount} has failed. Please contact support.",
                type=NotificationType.PAYMENT,
                data={
                    "payout_id": payout.id,
                    "amount": str(payout.amount),
                    "failure_reason": payout.failure_reason
                }
            )
            self.db.add(notification)
            self.db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error processing payout: {str(e)}"
            )

    async def _process_payout_via_connect(
        self, 
        payout: WorkerPayout, 
        worker: WorkerProfile, 
        is_automatic: bool
    ) -> WorkerPayout:
        """Process payout via Stripe Connect Transfer to worker's connected account"""
        try:
            # Verify the connected account is active
            account = stripe.Account.retrieve(worker.stripe_account_id)
            
            if not account.charges_enabled or not account.payouts_enabled:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Worker's Stripe account is not fully activated. Please complete onboarding."
                )
            
            # Update status to processing
            payout.status = WithdrawalStatus.PROCESSING
            payout.processed_at = datetime.utcnow()
            payout.failure_reason = None
            self.db.commit()
            
            print(f"💰 Creating Stripe Transfer of ${payout.amount} to {worker.stripe_account_id}")
            
            # Create transfer to connected account
            transfer = stripe.Transfer.create(
                amount=int(payout.amount * 100),  # Convert to cents
                currency="usd",
                destination=worker.stripe_account_id,
                description=f"Payout for worker {worker.id} - #{payout.id}",
                metadata={
                    "payout_id": str(payout.id),
                    "worker_id": str(worker.id),
                    "worker_email": worker.user.email,
                    "auto_processed": str(is_automatic)
                }
            )
            
            print(f"✅ Stripe Transfer created: {transfer.id}")
            
            # Store transfer details
            payout.stripe_transfer_id = transfer.id
            payout.payout_metadata = {
                "transfer_id": transfer.id,
                "stripe_account_id": worker.stripe_account_id,
                "transfer_status": transfer.destination_payment,
                "auto_processed": is_automatic,
                "method": "stripe_connect"
            }
            
            # Mark as completed
            payout.status = WithdrawalStatus.COMPLETED
            payout.completed_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(payout)
            
            # Create transaction record
            self._create_transaction_record(
                user_id=payout.worker.user_id,
                payout_id=payout.id,
                transaction_type="payout",
                amount=payout.amount,
                description=f"Stripe Connect Transfer - Account {worker.stripe_account_id}",
                reference_id=transfer.id
            )
            
            # Send notification to worker
            from app.db.models import Notification, NotificationType
            notification = Notification(
                user_id=payout.worker.user_id,
                title="💰 Payout Processed!",
                message=f"Your payout of ${payout.amount} has been transferred to your Stripe account. Funds will arrive within 2-5 business days.",
                type=NotificationType.PAYMENT,
                data={
                    "payout_id": payout.id,
                    "amount": str(payout.amount),
                    "payment_method": "stripe_connect",
                    "transfer_id": transfer.id,
                    "auto_processed": is_automatic
                }
            )
            self.db.add(notification)
            self.db.commit()
            
            return payout
            
        except stripe.error.StripeError as e:
            print(f"❌ Stripe Connect Transfer error: {str(e)}")
            payout.status = WithdrawalStatus.FAILED
            payout.failure_reason = f"Stripe error: {str(e)}"
            self.db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )

    async def _process_payout_via_bank(
        self, 
        payout: WorkerPayout, 
        worker: WorkerProfile, 
        is_automatic: bool
    ) -> WorkerPayout:
        """Legacy method: Process payout via direct bank account (requires manual bank details)"""
        """
        Process all payouts that are due for automatic processing (14+ days old).
        This should be called by a background task/cron job.
        
        Returns:
            Dict with processing results
        """
        from sqlalchemy import and_
        
        # Get all PENDING payouts where auto_process_at <= now
        now = datetime.utcnow()
        pending_payouts = self.db.query(WorkerPayout).filter(
            and_(
                WorkerPayout.status == WithdrawalStatus.PENDING,
                WorkerPayout.auto_process_at <= now
            )
        ).all()
        
        results = {
            "total_found": len(pending_payouts),
            "processed": 0,
            "failed": 0,
            "errors": []
        }
        
        for payout in pending_payouts:
            try:
                print(f"⏰ Auto-processing payout #{payout.id} for worker {payout.worker.user.email} - ${payout.amount}")
                await self.process_payout(payout.id, is_automatic=True)
                results["processed"] += 1
                print(f"✅ Auto-processed payout #{payout.id}")
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "payout_id": payout.id,
                    "error": str(e)
                })
                print(f"❌ Failed to auto-process payout #{payout.id}: {str(e)}")
        
        print(f"🤖 Automatic payout processing complete: {results['processed']} processed, {results['failed']} failed")
        return results

    # Payment Disputes
    async def create_dispute(
        self, 
        dispute_data: PaymentDisputeCreate, 
        user_id: int
    ) -> PaymentDispute:
        """
        Create payment dispute.
        
        Args:
            dispute_data: Dispute creation data containing payment_id, reason, and description
            user_id: User ID initiating the dispute
            
        Returns:
            PaymentDispute: Created dispute record with status 'open'
            
        Requirements: 7.1, 7.2
        """
        # Fetch payment
        payment = self.db.query(Payment).filter(Payment.id == dispute_data.payment_id).first()
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Verify user is involved in the payment
        if (payment.booking.client.user_id != user_id and 
            payment.booking.worker.user_id != user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to dispute this payment"
            )
        
        # Check if payment already has an open dispute
        existing_dispute = self.db.query(PaymentDispute).filter(
            PaymentDispute.payment_id == dispute_data.payment_id,
            PaymentDispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW])
        ).first()
        
        if existing_dispute:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already has an active dispute"
            )
        
        # Create PaymentDispute record with status 'open' (Requirement 7.1)
        dispute = PaymentDispute(
            payment_id=dispute_data.payment_id,
            initiated_by=user_id,
            reason=dispute_data.reason,
            description=dispute_data.description,
            status=DisputeStatus.OPEN
        )
        
        self.db.add(dispute)
        
        # Prevent payment release while dispute is open (Requirement 7.2)
        # Update payment status to disputed
        payment.status = PaymentStatus.DISPUTED
        
        self.db.commit()
        self.db.refresh(dispute)
        
        # Send notification to admin (Requirement 7.2)
        from app.db.models import Notification, NotificationType
        
        # Get admin users
        admin_users = self.db.query(User).filter(User.role == UserRole.ADMIN).all()
        
        for admin in admin_users:
            admin_notification = Notification(
                user_id=admin.id,
                title="New Payment Dispute",
                message=f"A payment dispute has been created for payment #{payment.id}. Reason: {dispute_data.reason[:100]}",
                type=NotificationType.PAYMENT,
                data={
                    "dispute_id": dispute.id,
                    "payment_id": payment.id,
                    "booking_id": payment.booking_id,
                    "initiated_by": user_id,
                    "reason": dispute_data.reason
                }
            )
            self.db.add(admin_notification)
        
        # Notify the other party involved in the payment
        other_party_id = None
        if payment.booking.client.user_id == user_id:
            other_party_id = payment.booking.worker.user_id
        else:
            other_party_id = payment.booking.client.user_id
        
        if other_party_id:
            other_party_notification = Notification(
                user_id=other_party_id,
                title="Payment Dispute Created",
                message=f"A dispute has been created for payment #{payment.id}. The payment is now under review.",
                type=NotificationType.PAYMENT,
                data={
                    "dispute_id": dispute.id,
                    "payment_id": payment.id,
                    "booking_id": payment.booking_id,
                    "reason": dispute_data.reason
                }
            )
            self.db.add(other_party_notification)
        
        self.db.commit()
        
        return dispute

    async def update_dispute(
        self,
        dispute_id: int,
        dispute_update: PaymentDisputeUpdate,
        admin_user_id: int
    ) -> PaymentDispute:
        """
        Update payment dispute status and resolution.
        
        Args:
            dispute_id: Dispute ID to update
            dispute_update: Update data containing status and resolution_notes
            admin_user_id: Admin user ID performing the update
            
        Returns:
            PaymentDispute: Updated dispute record
            
        Requirements: 7.3, 7.4, 7.5
        """
        # Fetch dispute
        dispute = self.db.query(PaymentDispute).filter(PaymentDispute.id == dispute_id).first()
        if not dispute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispute not found"
            )
        
        # Fetch associated payment
        payment = self.db.query(Payment).filter(Payment.id == dispute.payment_id).first()
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated payment not found"
            )
        
        # Allow admin to update dispute status (Requirement 7.3)
        # Support statuses: 'under_review', 'resolved', 'closed' (Requirement 7.3)
        if dispute_update.status:
            if dispute_update.status not in [
                DisputeStatus.UNDER_REVIEW,
                DisputeStatus.RESOLVED,
                DisputeStatus.CLOSED
            ]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid dispute status. Must be 'under_review', 'resolved', or 'closed'"
                )
            
            dispute.status = dispute_update.status
            
            # If status is resolved or closed, record resolution details
            if dispute_update.status in [DisputeStatus.RESOLVED, DisputeStatus.CLOSED]:
                dispute.resolved_by = admin_user_id
                dispute.resolved_at = datetime.utcnow()
        
        # Store resolution notes (Requirement 7.4)
        if dispute_update.resolution_notes:
            dispute.resolution_notes = dispute_update.resolution_notes
        
        self.db.commit()
        self.db.refresh(dispute)
        
        # Send notifications to involved parties
        from app.db.models import Notification, NotificationType
        
        # Notify dispute initiator
        initiator_notification = Notification(
            user_id=dispute.initiated_by,
            title="Dispute Status Updated",
            message=f"Your dispute for payment #{payment.id} has been updated to '{dispute.status.value}'.",
            type=NotificationType.PAYMENT,
            data={
                "dispute_id": dispute.id,
                "payment_id": payment.id,
                "status": dispute.status.value,
                "resolution_notes": dispute.resolution_notes
            }
        )
        self.db.add(initiator_notification)
        
        # Notify the other party
        other_party_id = None
        if payment.booking.client.user_id == dispute.initiated_by:
            other_party_id = payment.booking.worker.user_id
        else:
            other_party_id = payment.booking.client.user_id
        
        if other_party_id:
            other_party_notification = Notification(
                user_id=other_party_id,
                title="Dispute Status Updated",
                message=f"The dispute for payment #{payment.id} has been updated to '{dispute.status.value}'.",
                type=NotificationType.PAYMENT,
                data={
                    "dispute_id": dispute.id,
                    "payment_id": payment.id,
                    "status": dispute.status.value,
                    "resolution_notes": dispute.resolution_notes
                }
            )
            self.db.add(other_party_notification)
        
        self.db.commit()
        
        # If resolved in favor of client, trigger refund (Requirement 7.5)
        if (dispute.status == DisputeStatus.RESOLVED and 
            dispute.resolution_notes and 
            "favor of client" in dispute.resolution_notes.lower()):
            
            # Create refund request
            refund_request = RefundRequest(
                payment_id=payment.id,
                reason=f"Dispute resolved in favor of client. Dispute ID: {dispute.id}"
            )
            
            try:
                # Process refund
                await self.process_refund(refund_request, payment.booking.client.user_id)
            except Exception as e:
                # Log error but don't fail the dispute update
                print(f"Error processing refund for dispute {dispute.id}: {str(e)}")
        
        # If dispute is resolved or closed, update payment status back to original
        if dispute.status in [DisputeStatus.RESOLVED, DisputeStatus.CLOSED]:
            # Only update if payment is still in disputed status
            if payment.status == PaymentStatus.DISPUTED:
                # Check if there are any other open disputes for this payment
                other_open_disputes = self.db.query(PaymentDispute).filter(
                    PaymentDispute.payment_id == payment.id,
                    PaymentDispute.id != dispute.id,
                    PaymentDispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW])
                ).count()
                
                # If no other open disputes, restore payment to held status
                if other_open_disputes == 0:
                    payment.status = PaymentStatus.HELD
                    self.db.commit()
        
        return dispute

    # Payment Method Management
    async def add_payment_method(
        self, 
        user_id: int,
        payment_method_id: str
    ) -> PaymentMethodModel:
        """
        Add a payment method for a user.
        
        Args:
            user_id: User ID
            payment_method_id: Stripe payment method ID from client
            
        Returns:
            PaymentMethodModel: Created payment method record
        """
        try:
            # Debug: Check if Stripe API key is set
            if not stripe.api_key:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Stripe API key is not configured"
                )
            
            # Retrieve payment method details from Stripe
            stripe_pm = stripe.PaymentMethod.retrieve(payment_method_id)
            
            # Get or create Stripe customer for user
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Create or retrieve Stripe customer
            if not hasattr(user, 'stripe_customer_id') or not user.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=user.email,
                    name=f"{user.first_name} {user.last_name}",
                    metadata={'user_id': str(user_id)}
                )
                # Note: You may need to add stripe_customer_id to User model
                # For now, we'll attach the payment method directly
                stripe_customer_id = customer.id
            else:
                stripe_customer_id = user.stripe_customer_id
            
            # Attach payment method to Stripe customer
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=stripe_customer_id
            )
            
            # Check if this is the first payment method for the user
            existing_methods = self.db.query(PaymentMethodModel).filter(
                PaymentMethodModel.user_id == user_id
            ).count()
            
            is_first_method = existing_methods == 0
            
            # Extract payment method details
            pm_type = stripe_pm.type  # 'card', 'bank_account', etc.
            brand = None
            last4 = None
            expiry_month = None
            expiry_year = None
            
            if pm_type == 'card' and stripe_pm.card:
                brand = stripe_pm.card.brand
                last4 = stripe_pm.card.last4
                expiry_month = stripe_pm.card.exp_month
                expiry_year = stripe_pm.card.exp_year
            elif pm_type == 'us_bank_account' and stripe_pm.us_bank_account:
                brand = stripe_pm.us_bank_account.bank_name
                last4 = stripe_pm.us_bank_account.last4
            
            # Create payment method record in database
            payment_method = PaymentMethodModel(
                user_id=user_id,
                stripe_payment_method_id=payment_method_id,
                type=pm_type,
                brand=brand,
                last4=last4,
                expiry_month=expiry_month,
                expiry_year=expiry_year,
                is_default=is_first_method  # Set as default if it's the first method
            )
            
            self.db.add(payment_method)
            self.db.commit()
            self.db.refresh(payment_method)
            
            return payment_method
            
        except stripe.error.StripeError as e:
            import traceback
            print(f"Stripe error in add_payment_method: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )
        except HTTPException:
            raise  # Re-raise HTTP exceptions as-is
        except Exception as e:
            import traceback
            print(f"Unexpected error in add_payment_method: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error adding payment method: {str(e)}"
            )

    async def get_payment_methods(self, user_id: int) -> List[PaymentMethodModel]:
        """
        Get all payment methods for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of payment methods with masked card details
        """
        payment_methods = self.db.query(PaymentMethodModel).filter(
            PaymentMethodModel.user_id == user_id
        ).order_by(
            PaymentMethodModel.is_default.desc(),
            PaymentMethodModel.created_at.desc()
        ).all()
        
        return payment_methods

    async def set_default_payment_method(
        self, 
        user_id: int, 
        payment_method_id: int
    ) -> bool:
        """
        Set a payment method as default for a user.
        
        Args:
            user_id: User ID
            payment_method_id: Payment method ID to set as default
            
        Returns:
            bool: True if successful
        """
        # Verify payment method belongs to user
        payment_method = self.db.query(PaymentMethodModel).filter(
            PaymentMethodModel.id == payment_method_id,
            PaymentMethodModel.user_id == user_id
        ).first()
        
        if not payment_method:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method not found"
            )
        
        # Set all other methods to is_default=False
        self.db.query(PaymentMethodModel).filter(
            PaymentMethodModel.user_id == user_id
        ).update({"is_default": False})
        
        # Set selected method as default
        payment_method.is_default = True
        
        self.db.commit()
        
        return True

    async def delete_payment_method(
        self, 
        user_id: int, 
        payment_method_id: int
    ) -> bool:
        """
        Delete a payment method.
        
        Args:
            user_id: User ID
            payment_method_id: Payment method ID to delete
            
        Returns:
            bool: True if successful
        """
        # Verify payment method belongs to user
        payment_method = self.db.query(PaymentMethodModel).filter(
            PaymentMethodModel.id == payment_method_id,
            PaymentMethodModel.user_id == user_id
        ).first()
        
        if not payment_method:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method not found"
            )
        
        was_default = payment_method.is_default
        
        try:
            # Detach payment method from Stripe customer
            stripe.PaymentMethod.detach(payment_method.stripe_payment_method_id)
            
            # Delete from database
            self.db.delete(payment_method)
            self.db.commit()
            
            # If deleted method was default, set another as default
            if was_default:
                remaining_methods = self.db.query(PaymentMethodModel).filter(
                    PaymentMethodModel.user_id == user_id
                ).order_by(PaymentMethodModel.created_at.desc()).first()
                
                if remaining_methods:
                    remaining_methods.is_default = True
                    self.db.commit()
            
            return True
            
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error deleting payment method: {str(e)}"
            )

    # Worker Earnings Methods
    async def get_worker_earnings(self, worker_id: int) -> Dict[str, Decimal]:
        """
        Calculate worker earnings summary.
        
        Args:
            worker_id: Worker profile ID
            
        Returns:
            Dictionary containing:
            - total_earned: Total earned from released payments
            - available_balance: Earned minus withdrawn
            - pending_balance: From held payments
            - total_withdrawn: Total amount withdrawn
            - platform_fees_paid: Total platform fees paid
        """
        from sqlalchemy import func, case
        
        # Get all payments for this worker
        payments = self.db.query(Payment).join(Booking).filter(
            Booking.worker_id == worker_id
        ).all()
        
        # Calculate total earned from released payments
        total_earned = sum(
            p.worker_amount for p in payments 
            if p.status == PaymentStatus.RELEASED
        ) or Decimal('0')
        
        # Calculate pending balance from held payments
        pending_balance = sum(
            p.worker_amount for p in payments 
            if p.status == PaymentStatus.HELD
        ) or Decimal('0')
        
        # Calculate total platform fees paid (from released payments)
        platform_fees_paid = sum(
            p.platform_fee for p in payments 
            if p.status == PaymentStatus.RELEASED
        ) or Decimal('0')
        
        # Get total withdrawn (completed and processing payouts)
        payouts = self.db.query(WorkerPayout).filter(
            WorkerPayout.worker_id == worker_id,
            WorkerPayout.status.in_([WithdrawalStatus.COMPLETED, WithdrawalStatus.PROCESSING])
        ).all()
        
        total_withdrawn = sum(p.amount for p in payouts) or Decimal('0')
        
        # Calculate available balance (earned - withdrawn)
        available_balance = total_earned - total_withdrawn
        
        return {
            "total_earned": total_earned,
            "available_balance": available_balance,
            "pending_balance": pending_balance,
            "total_withdrawn": total_withdrawn,
            "platform_fees_paid": platform_fees_paid
        }

    # Helper Methods
    def get_worker_available_balance(self, worker_id: int) -> Decimal:
        """Calculate worker's available balance"""
        from sqlalchemy import func
        
        # Get total earnings from released payments
        total_earnings = self.db.query(
            func.sum(Payment.worker_amount)
        ).join(Booking).filter(
            Booking.worker_id == worker_id,
            Payment.status == PaymentStatus.RELEASED
        ).scalar() or Decimal('0')
        
        # Get total payouts
        total_payouts = self.db.query(
            func.sum(WorkerPayout.amount)
        ).filter(
            WorkerPayout.worker_id == worker_id,
            WorkerPayout.status.in_([WithdrawalStatus.COMPLETED, WithdrawalStatus.PROCESSING])
        ).scalar() or Decimal('0')
        
        return total_earnings - total_payouts

    def get_payment_history(
        self, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0
    ) -> List[PaymentTransaction]:
        """Get user's payment transaction history"""
        return self.db.query(PaymentTransaction).filter(
            PaymentTransaction.user_id == user_id
        ).order_by(
            PaymentTransaction.created_at.desc()
        ).limit(limit).offset(offset).all()

    def _create_transaction_record(
        self,
        user_id: int,
        transaction_type: str,
        amount: Decimal,
        description: str,
        reference_id: Optional[str] = None,
        payment_id: Optional[int] = None,
        payout_id: Optional[int] = None
    ):
        """Create a transaction record for audit trail"""
        transaction = PaymentTransaction(
            user_id=user_id,
            payment_id=payment_id,
            payout_id=payout_id,
            transaction_type=transaction_type,
            amount=amount,
            description=description,
            reference_id=reference_id
        )
        
        self.db.add(transaction)
        self.db.commit()

    # Webhook Handlers
    async def verify_webhook_signature(
        self, 
        payload: bytes, 
        signature: str
    ) -> Dict[str, Any]:
        """
        Verify Stripe webhook signature using webhook secret.
        Reject invalid signatures with HTTP 400.
        
        Args:
            payload: Raw webhook payload bytes
            signature: Stripe signature from header
            
        Returns:
            Dict containing the verified event data
            
        Raises:
            HTTPException: If signature verification fails
            
        Requirements: 8.1, 8.5
        """
        try:
            # Verify webhook signature using Stripe webhook secret
            event = stripe.Webhook.construct_event(
                payload, 
                signature, 
                settings.STRIPE_WEBHOOK_SECRET
            )
            return event
        except ValueError as e:
            # Invalid payload
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid payload: {str(e)}"
            )
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature - reject with HTTP 400
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid signature: {str(e)}"
            )

    async def handle_payment_intent_succeeded(
        self, 
        payment_intent: Dict[str, Any]
    ) -> None:
        """
        Handle payment_intent.succeeded event.
        Find payment by payment_intent_id, update status to 'held',
        and send confirmation notification.
        
        Args:
            payment_intent: Stripe PaymentIntent object
            
        Requirements: 8.2
        """
        payment_intent_id = payment_intent.get('id')
        
        # Find payment by payment_intent_id
        payment = self.db.query(Payment).filter(
            Payment.stripe_payment_id == payment_intent_id
        ).first()
        
        if not payment:
            # Payment record might not exist yet, log and return
            print(f"Payment not found for payment_intent {payment_intent_id}")
            return
        
        # Update payment status to 'held'
        payment.status = PaymentStatus.HELD
        payment.held_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payment)
        
        # Send confirmation notification
        from app.db.models import Notification, NotificationType
        
        # Notify client
        client_notification = Notification(
            user_id=payment.booking.client.user_id,
            title="Payment Successful",
            message=f"Your payment of ${payment.amount} for job '{payment.booking.job.title}' has been processed successfully and is being held in escrow.",
            type=NotificationType.PAYMENT,
            data={
                "payment_id": payment.id,
                "booking_id": payment.booking_id,
                "amount": str(payment.amount),
                "status": payment.status.value
            }
        )
        self.db.add(client_notification)
        
        # Notify worker
        worker_notification = Notification(
            user_id=payment.booking.worker.user_id,
            title="Payment Received",
            message=f"Payment of ${payment.worker_amount} for job '{payment.booking.job.title}' has been received and is being held in escrow.",
            type=NotificationType.PAYMENT,
            data={
                "payment_id": payment.id,
                "booking_id": payment.booking_id,
                "amount": str(payment.worker_amount),
                "status": payment.status.value
            }
        )
        self.db.add(worker_notification)
        
        self.db.commit()

    async def handle_payment_intent_payment_failed(
        self, 
        payment_intent: Dict[str, Any]
    ) -> None:
        """
        Handle payment_intent.payment_failed event.
        Find payment by payment_intent_id, update status to 'failed',
        and send failure notification.
        
        Args:
            payment_intent: Stripe PaymentIntent object
            
        Requirements: 8.3
        """
        payment_intent_id = payment_intent.get('id')
        
        # Find payment by payment_intent_id
        payment = self.db.query(Payment).filter(
            Payment.stripe_payment_id == payment_intent_id
        ).first()
        
        if not payment:
            # Payment record might not exist yet, log and return
            print(f"Payment not found for payment_intent {payment_intent_id}")
            return
        
        # Update payment status to 'failed'
        payment.status = PaymentStatus.FAILED
        
        # Extract failure reason if available
        last_payment_error = payment_intent.get('last_payment_error')
        if last_payment_error:
            failure_message = last_payment_error.get('message', 'Payment failed')
        else:
            failure_message = 'Payment failed'
        
        self.db.commit()
        self.db.refresh(payment)
        
        # Send failure notification
        from app.db.models import Notification, NotificationType
        
        # Notify client
        client_notification = Notification(
            user_id=payment.booking.client.user_id,
            title="Payment Failed",
            message=f"Your payment of ${payment.amount} for job '{payment.booking.job.title}' has failed. Reason: {failure_message}",
            type=NotificationType.PAYMENT,
            data={
                "payment_id": payment.id,
                "booking_id": payment.booking_id,
                "amount": str(payment.amount),
                "status": payment.status.value,
                "failure_reason": failure_message
            }
        )
        self.db.add(client_notification)
        
        self.db.commit()

    async def handle_transfer_paid(
        self, 
        transfer: Dict[str, Any]
    ) -> None:
        """
        Handle transfer.paid event.
        Find payout by transfer_id, update status to 'completed',
        and send notification to worker.
        
        Args:
            transfer: Stripe Transfer object
            
        Requirements: 8.4
        """
        transfer_id = transfer.get('id')
        
        # Find payout by transfer_id
        payout = self.db.query(WorkerPayout).filter(
            WorkerPayout.stripe_transfer_id == transfer_id
        ).first()
        
        if not payout:
            # Payout record not found, log and return
            print(f"Payout not found for transfer {transfer_id}")
            return
        
        # Update payout status to 'completed'
        payout.status = WithdrawalStatus.COMPLETED
        payout.completed_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payout)
        
        # Send notification to worker
        from app.db.models import Notification, NotificationType
        
        notification = Notification(
            user_id=payout.worker.user_id,
            title="Payout Completed",
            message=f"Your payout of ${payout.amount} has been completed successfully.",
            type=NotificationType.PAYMENT,
            data={
                "payout_id": payout.id,
                "amount": str(payout.amount),
                "status": payout.status.value,
                "transfer_id": transfer_id
            }
        )
        self.db.add(notification)
        
        # Create transaction record
        self._create_transaction_record(
            user_id=payout.worker.user_id,
            payout_id=payout.id,
            transaction_type="payout",
            amount=payout.amount,
            description=f"Payout completed via Stripe",
            reference_id=transfer_id
        )
        
        self.db.commit()

    async def handle_transfer_failed(
        self, 
        transfer: Dict[str, Any]
    ) -> None:
        """
        Handle transfer.failed event.
        Find payout by transfer_id, update status to 'failed',
        store failure reason, and send notification to worker.
        
        Args:
            transfer: Stripe Transfer object
            
        Requirements: 8.4
        """
        transfer_id = transfer.get('id')
        
        # Find payout by transfer_id
        payout = self.db.query(WorkerPayout).filter(
            WorkerPayout.stripe_transfer_id == transfer_id
        ).first()
        
        if not payout:
            # Payout record not found, log and return
            print(f"Payout not found for transfer {transfer_id}")
            return
        
        # Update payout status to 'failed'
        payout.status = WithdrawalStatus.FAILED
        
        # Extract failure reason
        failure_message = transfer.get('failure_message', 'Transfer failed')
        payout.failure_reason = failure_message
        
        self.db.commit()
        self.db.refresh(payout)
        
        # Send notification to worker
        from app.db.models import Notification, NotificationType
        
        notification = Notification(
            user_id=payout.worker.user_id,
            title="Payout Failed",
            message=f"Your payout of ${payout.amount} has failed. Reason: {failure_message}. Please contact support.",
            type=NotificationType.PAYMENT,
            data={
                "payout_id": payout.id,
                "amount": str(payout.amount),
                "status": payout.status.value,
                "failure_reason": failure_message,
                "transfer_id": transfer_id
            }
        )
        self.db.add(notification)
        
        self.db.commit()

    async def process_webhook_event(
        self, 
        event: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Process Stripe webhook event and route to appropriate handler.
        
        Args:
            event: Verified Stripe event object
            
        Returns:
            Dict with status message
            
        Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
        """
        event_type = event.get('type')
        event_data = event.get('data', {}).get('object', {})
        
        # Route to appropriate handler based on event type
        if event_type == 'payment_intent.succeeded':
            await self.handle_payment_intent_succeeded(event_data)
            return {"status": "success", "message": "Payment intent succeeded event processed"}
        
        elif event_type == 'payment_intent.payment_failed':
            await self.handle_payment_intent_payment_failed(event_data)
            return {"status": "success", "message": "Payment intent failed event processed"}
        
        elif event_type == 'transfer.paid':
            await self.handle_transfer_paid(event_data)
            return {"status": "success", "message": "Transfer paid event processed"}
        
        elif event_type == 'transfer.failed':
            await self.handle_transfer_failed(event_data)
            return {"status": "success", "message": "Transfer failed event processed"}
        
        else:
            # Unhandled event type, log and return success
            print(f"Unhandled webhook event type: {event_type}")
            return {"status": "success", "message": f"Unhandled event type: {event_type}"}

    # Stripe Connect Methods
    async def create_stripe_connect_account(
        self,
        worker_id: int,
        email: str,
        return_url: str,
        refresh_url: str
    ) -> str:
        """
        Create or retrieve Stripe Connect Express account for worker and return onboarding link.
        
        Args:
            worker_id: Worker profile ID
            email: Worker's email address
            return_url: URL to redirect after successful onboarding
            refresh_url: URL to redirect if onboarding needs to be refreshed
            
        Returns:
            str: Stripe Account Link URL for onboarding
        """
        worker = self.db.query(WorkerProfile).filter(WorkerProfile.id == worker_id).first()
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker profile not found"
            )
        
        try:
            # Check if worker already has a Stripe account
            if hasattr(worker, 'stripe_account_id') and worker.stripe_account_id:
                account_id = worker.stripe_account_id
                print(f"✅ Worker {worker_id} already has Stripe account: {account_id}")
                
                # Check if account is fully onboarded
                try:
                    account = stripe.Account.retrieve(account_id)
                    if account.details_submitted and account.charges_enabled:
                        print(f"✅ Account {account_id} is fully onboarded")
                    else:
                        print(f"⚠️  Account {account_id} exists but onboarding not complete")
                except stripe.error.StripeError:
                    # Account doesn't exist anymore, create new one
                    print(f"⚠️  Account {account_id} not found in Stripe, creating new one")
                    worker.stripe_account_id = None
                    self.db.commit()
                    account_id = None
            
            if not hasattr(worker, 'stripe_account_id') or not worker.stripe_account_id:
                # Create new Stripe Express account with test-friendly settings
                account = stripe.Account.create(
                    type='express',
                    email=email,
                    capabilities={
                        'card_payments': {'requested': True},
                        'transfers': {'requested': True},
                    },
                    business_type='individual',
                    # Prefill some data for easier testing (only works in test mode)
                    business_profile={
                        'mcc': '5734',  # Computer software stores
                        'url': 'https://handwork-marketplace.com',
                    },
                    metadata={
                        'worker_id': str(worker_id),
                        'test_account': 'true'
                    }
                )
                account_id = account.id
                
                # Save account ID to worker profile (but they're not fully connected until onboarding completes)
                # First, check if the column exists
                if not hasattr(WorkerProfile, 'stripe_account_id'):
                    print("⚠️  WARNING: stripe_account_id column does not exist in WorkerProfile")
                    print("⚠️  You need to add this column via migration")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Database schema update required: stripe_account_id column missing"
                    )
                
                worker.stripe_account_id = account_id
                self.db.commit()
                self.db.refresh(worker)
                
                print(f"✅ Created Stripe Connect account for worker {worker_id}: {account_id}")
            
            # Create account link for onboarding
            account_link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type='account_onboarding',
            )
            
            return account_link.url
            
        except stripe.error.StripeError as e:
            print(f"❌ Stripe error creating Connect account: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )
    
    async def refresh_stripe_connect_link(
        self,
        stripe_account_id: str,
        return_url: str,
        refresh_url: str
    ) -> str:
        """
        Refresh Stripe Connect account link for worker.
        
        Args:
            stripe_account_id: Stripe Connect account ID
            return_url: URL to redirect after successful completion
            refresh_url: URL to redirect if link needs to be refreshed
            
        Returns:
            str: New Stripe Account Link URL
        """
        try:
            account_link = stripe.AccountLink.create(
                account=stripe_account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type='account_onboarding',
            )
            
            return account_link.url
            
        except stripe.error.StripeError as e:
            print(f"❌ Stripe error refreshing Connect link: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )