# Payment Processing System

## Overview

The Handwork Marketplace payment system provides secure escrow-based payment processing with support for both Stripe and PayPal. The system ensures that payments are held in escrow until job completion, protecting both clients and workers.

## Features

### Core Payment Features
- **Escrow System**: Payments are held until job completion and client approval
- **Multi-Payment Support**: Stripe and PayPal integration
- **Platform Fees**: Configurable platform fee percentage (default 5%)
- **Payment Release**: Manual payment release by clients after job completion
- **Refund Processing**: Full and partial refund support
- **Payment Disputes**: Built-in dispute resolution system

### Worker Payout System
- **Available Balance Tracking**: Real-time calculation of worker earnings
- **Payout Requests**: Workers can request payouts to Stripe or PayPal
- **Payout Processing**: Admin-controlled payout processing
- **Transaction History**: Complete audit trail of all transactions

### Security & Compliance
- **PCI Compliance**: Stripe handles sensitive payment data
- **Webhook Verification**: Secure webhook handling for payment events
- **Transaction Logging**: Complete audit trail for all payment activities
- **Dispute Management**: Structured dispute resolution process

## Architecture

### Database Models

#### Payment Model
```python
class Payment(Base):
    id: int
    booking_id: int
    amount: Decimal
    platform_fee: Decimal
    worker_amount: Decimal
    payment_method: PaymentMethod  # STRIPE or PAYPAL
    stripe_payment_id: str
    paypal_payment_id: str
    status: PaymentStatus  # PENDING, HELD, RELEASED, REFUNDED, FAILED, DISPUTED
    created_at: datetime
    held_at: datetime
    released_at: datetime
    refunded_at: datetime
    refund_reason: str
    payment_metadata: JSON
```

#### PaymentDispute Model
```python
class PaymentDispute(Base):
    id: int
    payment_id: int
    initiated_by: int
    reason: str
    description: str
    status: DisputeStatus  # OPEN, UNDER_REVIEW, RESOLVED, CLOSED
    resolution_notes: str
    resolved_by: int
    resolved_at: datetime
    created_at: datetime
```

#### WorkerPayout Model
```python
class WorkerPayout(Base):
    id: int
    worker_id: int
    amount: Decimal
    payment_method: PaymentMethod
    stripe_transfer_id: str
    paypal_payout_id: str
    status: WithdrawalStatus  # PENDING, PROCESSING, COMPLETED, FAILED
    requested_at: datetime
    processed_at: datetime
    completed_at: datetime
    failure_reason: str
```

#### PaymentTransaction Model
```python
class PaymentTransaction(Base):
    id: int
    user_id: int
    payment_id: int
    payout_id: int
    transaction_type: str  # payment, earning, payout, refund, fee
    amount: Decimal
    description: str
    reference_id: str
    created_at: datetime
```

## API Endpoints

### Stripe Payment Endpoints

#### Create Payment Intent
```http
POST /api/v1/payments/stripe/payment-intent
Content-Type: application/json

{
    "booking_id": 1,
    "amount": 150.00,
    "currency": "usd"
}
```

#### Confirm Payment
```http
POST /api/v1/payments/stripe/confirm
Content-Type: application/json

{
    "payment_intent_id": "pi_1234567890",
    "booking_id": 1
}
```

### PayPal Payment Endpoints

#### Create PayPal Payment
```http
POST /api/v1/payments/paypal/create
Content-Type: application/json

{
    "booking_id": 1,
    "amount": 150.00,
    "currency": "USD",
    "return_url": "https://app.example.com/payment/success",
    "cancel_url": "https://app.example.com/payment/cancel"
}
```

#### Execute PayPal Payment
```http
POST /api/v1/payments/paypal/execute
Content-Type: application/json

{
    "payment_id": "PAY-1234567890",
    "payer_id": "PAYER123",
    "booking_id": 1
}
```

### Payment Management Endpoints

#### Get Payments
```http
GET /api/v1/payments/?skip=0&limit=50&status=held
Authorization: Bearer <token>
```

#### Release Payment
```http
POST /api/v1/payments/{payment_id}/release
Authorization: Bearer <token>
```

#### Process Refund
```http
POST /api/v1/payments/refund
Content-Type: application/json
Authorization: Bearer <token>

{
    "payment_id": 1,
    "amount": 75.00,
    "reason": "Partial refund requested by customer"
}
```

### Dispute Management

#### Create Dispute
```http
POST /api/v1/payments/disputes
Content-Type: application/json
Authorization: Bearer <token>

{
    "payment_id": 1,
    "reason": "Work not completed as agreed",
    "description": "The worker did not complete all tasks specified in the job"
}
```

#### Get Disputes
```http
GET /api/v1/payments/disputes?skip=0&limit=50
Authorization: Bearer <token>
```

### Worker Payout Endpoints

#### Request Payout
```http
POST /api/v1/payments/payouts/request
Content-Type: application/json
Authorization: Bearer <token>

{
    "amount": 100.00,
    "payment_method": "stripe"
}
```

#### Get Payout History
```http
GET /api/v1/payments/payouts?skip=0&limit=50
Authorization: Bearer <token>
```

#### Process Payout (Admin)
```http
POST /api/v1/payments/payouts/{payout_id}/process
Authorization: Bearer <admin_token>
```

### Analytics Endpoints

#### Client Payment Summary
```http
GET /api/v1/payments/summary/client
Authorization: Bearer <token>
```

#### Worker Earnings Summary
```http
GET /api/v1/payments/earnings/worker
Authorization: Bearer <token>
```

#### Transaction History
```http
GET /api/v1/payments/transactions?skip=0&limit=50
Authorization: Bearer <token>
```

## Payment Flow

### 1. Job Booking and Payment
1. Client posts a job and worker applies
2. Client hires worker and creates booking
3. Client initiates payment through Stripe or PayPal
4. Payment is held in escrow (status: HELD)
5. Platform fee is calculated and recorded

### 2. Job Completion and Payment Release
1. Worker completes the job and marks it as complete
2. Client reviews the work and approves completion
3. Client releases payment from escrow
4. Payment status changes to RELEASED
5. Worker's available balance is updated

### 3. Worker Payout
1. Worker requests payout from available balance
2. Admin processes the payout request
3. Funds are transferred to worker's account
4. Payout status changes to COMPLETED

### 4. Dispute Resolution
1. Either party can create a dispute
2. Payment status changes to DISPUTED
3. Admin reviews the dispute
4. Admin resolves dispute and updates payment status

## Configuration

### Environment Variables
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox  # or live

# Platform Settings
PLATFORM_FEE_PERCENTAGE=5.0
```

### Stripe Setup
1. Create Stripe account and get API keys
2. Set up webhook endpoints for payment events
3. Configure webhook secret for security
4. Test with Stripe test cards

### PayPal Setup
1. Create PayPal developer account
2. Create REST API application
3. Get client ID and secret
4. Configure sandbox/live mode
5. Test with PayPal sandbox accounts

## Security Considerations

### Payment Security
- All sensitive payment data is handled by Stripe/PayPal
- No credit card information is stored in the application
- Webhook signatures are verified for authenticity
- Payment intents use manual capture for escrow

### Access Control
- Only clients can release payments for their bookings
- Only workers can request payouts from their earnings
- Admin privileges required for dispute resolution
- Transaction history is user-specific

### Data Protection
- Payment metadata is encrypted in database
- Audit logs track all payment activities
- PII is handled according to GDPR requirements
- Secure API endpoints with authentication

## Testing

### Unit Tests
```bash
# Run payment system tests
python -m pytest tests/test_payments.py -v
```

### Integration Tests
```bash
# Test with Stripe test environment
STRIPE_SECRET_KEY=sk_test_... python -m pytest tests/test_stripe_integration.py

# Test with PayPal sandbox
PAYPAL_MODE=sandbox python -m pytest tests/test_paypal_integration.py
```

### Demo Script
```bash
# Run payment system demo
python demo_payments.py
```

## Monitoring and Logging

### Payment Events
- All payment state changes are logged
- Failed payments trigger alerts
- Webhook failures are monitored
- Dispute creation notifications

### Metrics to Track
- Payment success/failure rates
- Average payment processing time
- Platform fee revenue
- Dispute resolution time
- Worker payout processing time

### Error Handling
- Graceful handling of payment failures
- Retry logic for webhook processing
- User-friendly error messages
- Admin notifications for critical errors

## Troubleshooting

### Common Issues

#### Payment Intent Fails
- Check Stripe API keys
- Verify webhook configuration
- Check payment amount limits
- Review Stripe dashboard for errors

#### PayPal Payment Fails
- Verify PayPal credentials
- Check sandbox/live mode settings
- Review PayPal developer logs
- Validate return/cancel URLs

#### Webhook Not Received
- Check webhook URL accessibility
- Verify webhook secret
- Review webhook event types
- Check firewall settings

#### Payout Fails
- Verify worker bank account details
- Check available balance
- Review payout method configuration
- Check for account restrictions

### Support Contacts
- Stripe Support: https://support.stripe.com
- PayPal Developer Support: https://developer.paypal.com/support
- Platform Admin: admin@handworkmarketplace.com

## Future Enhancements

### Planned Features
- Automatic payment release after timeout
- Recurring payment support
- Multi-currency support
- Advanced fraud detection
- Mobile payment methods (Apple Pay, Google Pay)
- Cryptocurrency payment support

### Performance Optimizations
- Payment processing queue
- Batch payout processing
- Caching for balance calculations
- Database query optimization
- Webhook event deduplication

This payment system provides a robust, secure, and scalable foundation for the Handwork Marketplace platform, ensuring smooth financial transactions between clients and workers while maintaining platform revenue through fees.