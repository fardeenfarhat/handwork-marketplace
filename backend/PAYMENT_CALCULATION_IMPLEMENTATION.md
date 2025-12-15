# Payment Calculation Implementation

## Overview
This document describes the implementation of the payment calculation logic for the Stripe Payment Integration feature (Task 3).

## Implementation Details

### 1. PaymentService.calculate_job_payment() Method

**Location:** `backend/app/services/payment_service.py`

**Purpose:** Calculate payment breakdown based on working hours and hourly rate.

**Parameters:**
- `working_hours` (Decimal): Total hours worked on the job
- `hourly_rate` (Decimal): Agreed hourly rate for the job

**Returns:** Dictionary containing:
- `working_hours`: Input working hours
- `hourly_rate`: Input hourly rate
- `subtotal`: Calculated as working_hours × hourly_rate (rounded to 2 decimals)
- `platform_fee`: Calculated as subtotal × platform_fee_percentage (rounded to 2 decimals)
- `platform_fee_percentage`: Platform fee percentage from configuration
- `total`: Client pays this amount (subtotal + platform_fee)
- `worker_amount`: Worker receives this amount (equals subtotal)
- `currency`: Currency code (default: "usd")

**Calculation Logic:**
```
subtotal = working_hours × hourly_rate
platform_fee = subtotal × (platform_fee_percentage / 100)
total = subtotal + platform_fee
worker_amount = subtotal
```

**Example:**
- Working Hours: 10
- Hourly Rate: $50
- Platform Fee: 10%

Results:
- Subtotal: $500.00
- Platform Fee: $50.00
- Total (Client Pays): $550.00
- Worker Amount: $500.00

### 2. Payment Calculation API Endpoint

**Location:** `backend/app/api/api_v1/endpoints/payments.py`

**Endpoint:** `POST /api/v1/payments/calculate`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "working_hours": 10.00,
  "hourly_rate": 50.00
}
```

**Response:**
```json
{
  "working_hours": "10.00",
  "hourly_rate": "50.00",
  "subtotal": "500.00",
  "platform_fee": "50.00",
  "platform_fee_percentage": 10.0,
  "total": "550.00",
  "worker_amount": "500.00",
  "currency": "usd"
}
```

**Validation:**
- Both `working_hours` and `hourly_rate` must be greater than 0
- Values are automatically rounded to 2 decimal places
- Returns 422 validation error for invalid inputs

### 3. Schema Definitions

**Location:** `backend/app/schemas/payments.py`

**New Schemas:**

1. **PaymentBreakdown** - Response model for payment calculations
2. **PaymentCalculateRequest** - Request model with validation

Both schemas include:
- Field validation (values must be > 0)
- Automatic rounding to 2 decimal places
- Type safety with Pydantic

## Configuration

The platform fee percentage is configured in:
- **File:** `backend/app/core/config.py`
- **Environment Variable:** `PLATFORM_FEE_PERCENTAGE`
- **Default Value:** 10.0 (10%)

## Testing

A test script is provided at `backend/test_payment_calculation.py` that verifies:
- Standard calculations (whole numbers)
- Fractional hours and rates
- Small amounts
- Proper rounding to 2 decimal places

**Run tests:**
```bash
cd backend
python test_payment_calculation.py
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 1.1:** Calculate total amount as (working hours × hourly rate) + platform fee
- **Requirement 1.2:** Display breakdown showing hours, rate, subtotal, fee, and total
- **Requirement 10.1:** Display working hours as decimal number
- **Requirement 10.2:** Display hourly rate in job currency
- **Requirement 10.3:** Calculate subtotal with 2 decimal precision
- **Requirement 10.4:** Calculate platform fee based on configured percentage
- **Requirement 10.5:** Display total with 2 decimal precision

## Usage Example

### From Mobile/Frontend:
```typescript
const response = await fetch('/api/v1/payments/calculate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    working_hours: 10.0,
    hourly_rate: 50.0
  })
});

const breakdown = await response.json();
console.log(`Client pays: $${breakdown.total}`);
console.log(`Worker receives: $${breakdown.worker_amount}`);
```

### From Backend Service:
```python
from app.services.payment_service import PaymentService
from decimal import Decimal

payment_service = PaymentService(db)
breakdown = payment_service.calculate_job_payment(
    working_hours=Decimal("10.00"),
    hourly_rate=Decimal("50.00")
)
```

## Notes

- All monetary calculations use Python's `Decimal` type for precision
- Rounding is always done to 2 decimal places
- The worker receives the subtotal (hours × rate)
- The client pays the total (subtotal + platform fee)
- The platform keeps the platform fee
- Currency is currently hardcoded to "usd" but can be made configurable in future

## Next Steps

The next task in the implementation plan is:
- **Task 4:** Backend: Implement Stripe Payment Intent creation with escrow
  - Update `create_stripe_payment_intent` to accept working_hours and hourly_rate
  - Use `calculate_job_payment` to determine the payment amount
  - Create PaymentIntent with escrow (manual capture)
