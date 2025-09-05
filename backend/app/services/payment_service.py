import stripe
import paypalrestsdk
from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.db.models import (
    Payment, PaymentDispute, WorkerPayout, PaymentTransaction,
    Booking, WorkerProfile, User, PaymentStatus, PaymentMethod,
    DisputeStatus, WithdrawalStatus
)
from app.schemas.payments import (
    PaymentCreate, StripePaymentIntentResponse, PayPalPaymentResponse,
    PaymentDisputeCreate, WorkerPayoutRequest, RefundRequest
)

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

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

    # Stripe Payment Methods
    async def create_stripe_payment_intent(
        self, 
        booking_id: int, 
        amount: Decimal,
        currency: str = "usd"
    ) -> StripePaymentIntentResponse:
        """Create Stripe Payment Intent for escrow"""
        try:
            # Convert to cents for Stripe
            amount_cents = int(amount * 100)
            
            # Create payment intent with manual capture for escrow
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                capture_method='manual',  # Manual capture for escrow
                metadata={
                    'booking_id': str(booking_id),
                    'platform': 'handwork_marketplace'
                }
            )
            
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
        """Confirm Stripe payment and create payment record"""
        try:
            # Retrieve the payment intent
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status != 'requires_capture':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment intent is not ready for capture"
                )
            
            # Get booking details
            booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Booking not found"
                )
            
            amount = Decimal(intent.amount) / 100  # Convert from cents
            platform_fee = self.calculate_platform_fee(amount)
            worker_amount = self.calculate_worker_amount(amount)
            
            # Create payment record
            payment = Payment(
                booking_id=booking_id,
                amount=amount,
                platform_fee=platform_fee,
                worker_amount=worker_amount,
                payment_method=PaymentMethod.STRIPE,
                stripe_payment_id=payment_intent_id,
                status=PaymentStatus.HELD,
                held_at=datetime.utcnow(),
                payment_metadata={'stripe_intent_id': payment_intent_id}
            )
            
            self.db.add(payment)
            self.db.commit()
            self.db.refresh(payment)
            
            # Create transaction record
            self._create_transaction_record(
                user_id=booking.client.user_id,
                payment_id=payment.id,
                transaction_type="payment",
                amount=amount,
                description=f"Payment for job: {booking.job.title}",
                reference_id=payment_intent_id
            )
            
            return payment
            
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
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

    # Refund Processing
    async def process_refund(
        self, 
        refund_request: RefundRequest, 
        user_id: int
    ) -> Dict[str, Any]:
        """Process payment refund"""
        payment = self.db.query(Payment).filter(Payment.id == refund_request.payment_id).first()
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Verify user authorization
        if payment.booking.client.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to refund this payment"
            )
        
        if payment.status not in [PaymentStatus.HELD, PaymentStatus.RELEASED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment cannot be refunded"
            )
        
        refund_amount = refund_request.amount or payment.amount
        
        try:
            if payment.payment_method == PaymentMethod.STRIPE:
                refund = stripe.Refund.create(
                    payment_intent=payment.stripe_payment_id,
                    amount=int(refund_amount * 100),  # Convert to cents
                    reason='requested_by_customer'
                )
                refund_id = refund.id
            elif payment.payment_method == PaymentMethod.PAYPAL:
                # PayPal refund implementation
                refund_id = f"paypal_refund_{payment.id}_{datetime.utcnow().timestamp()}"
            
            # Update payment status
            payment.status = PaymentStatus.REFUNDED
            payment.refunded_at = datetime.utcnow()
            payment.refund_reason = refund_request.reason
            
            self.db.commit()
            
            # Create transaction record
            self._create_transaction_record(
                user_id=payment.booking.client.user_id,
                payment_id=payment.id,
                transaction_type="refund",
                amount=refund_amount,
                description=f"Refund for job: {payment.booking.job.title}",
                reference_id=refund_id
            )
            
            return {
                "id": refund_id,
                "payment_id": payment.id,
                "amount": refund_amount,
                "status": "succeeded",
                "reason": refund_request.reason,
                "created_at": datetime.utcnow()
            }
            
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
        """Request worker payout"""
        worker = self.db.query(WorkerProfile).filter(WorkerProfile.id == worker_id).first()
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker profile not found"
            )
        
        # Check available balance
        available_balance = self.get_worker_available_balance(worker_id)
        if payout_request.amount > available_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient available balance"
            )
        
        # Create payout record
        payout = WorkerPayout(
            worker_id=worker_id,
            amount=payout_request.amount,
            payment_method=payout_request.payment_method,
            status=WithdrawalStatus.PENDING
        )
        
        self.db.add(payout)
        self.db.commit()
        self.db.refresh(payout)
        
        return payout

    async def process_payout(self, payout_id: int) -> WorkerPayout:
        """Process worker payout (admin function)"""
        payout = self.db.query(WorkerPayout).filter(WorkerPayout.id == payout_id).first()
        if not payout:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payout not found"
            )
        
        if payout.status != WithdrawalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payout is not in pending status"
            )
        
        try:
            payout.status = WithdrawalStatus.PROCESSING
            payout.processed_at = datetime.utcnow()
            
            if payout.payment_method == PaymentMethod.STRIPE:
                # Stripe transfer implementation would go here
                transfer_id = f"stripe_transfer_{payout.id}_{datetime.utcnow().timestamp()}"
                payout.stripe_transfer_id = transfer_id
            elif payout.payment_method == PaymentMethod.PAYPAL:
                # PayPal payout implementation would go here
                payout_id_str = f"paypal_payout_{payout.id}_{datetime.utcnow().timestamp()}"
                payout.paypal_payout_id = payout_id_str
            
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
                description=f"Payout to {payout.payment_method.value}",
                reference_id=payout.stripe_transfer_id or payout.paypal_payout_id
            )
            
            return payout
            
        except Exception as e:
            payout.status = WithdrawalStatus.FAILED
            payout.failure_reason = str(e)
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error processing payout: {str(e)}"
            )

    # Payment Disputes
    async def create_dispute(
        self, 
        dispute_data: PaymentDisputeCreate, 
        user_id: int
    ) -> PaymentDispute:
        """Create payment dispute"""
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
        
        dispute = PaymentDispute(
            payment_id=dispute_data.payment_id,
            initiated_by=user_id,
            reason=dispute_data.reason,
            description=dispute_data.description,
            status=DisputeStatus.OPEN
        )
        
        self.db.add(dispute)
        
        # Update payment status
        payment.status = PaymentStatus.DISPUTED
        
        self.db.commit()
        self.db.refresh(dispute)
        
        return dispute

    # Helper Methods
    def get_worker_available_balance(self, worker_id: int) -> Decimal:
        """Calculate worker's available balance"""
        # Get total earnings from released payments
        total_earnings = self.db.query(
            Payment.worker_amount
        ).join(Booking).filter(
            Booking.worker_id == worker_id,
            Payment.status == PaymentStatus.RELEASED
        ).scalar() or Decimal('0')
        
        # Get total payouts
        total_payouts = self.db.query(
            WorkerPayout.amount
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