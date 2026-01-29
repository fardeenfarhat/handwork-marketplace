# Implementation Plan

- [x] 1. Backend: Set up Stripe configuration and environment

  - Install stripe Python SDK if not already installed
  - Add Stripe configuration to settings (secret key, publishable key, webhook secret)
  - Add platform fee percentage and auto-release days to configuration
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Backend: Enhance database models for payment tracking

  - [x] 2.1 Add working_hours and hourly_rate columns to Payment model

    - Add Numeric columns for working_hours and hourly_rate
    - Create database migration script
    - _Requirements: 1.1, 10.1, 10.2_

  - [x] 2.2 Create PaymentMethod model for storing user payment methods

    - Create PaymentMethod table with user_id, stripe_payment_method_id, type, brand, last4, expiry, is_default
    - Add relationship to User model
    - Create database migration
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Backend: Implement payment calculation logic

  - [x] 3.1 Create calculate_job_payment method in PaymentService

    - Calculate subtotal as working_hours × hourly_rate
    - Calculate platform fee based on percentage
    - Calculate total and worker amount
    - Return PaymentBreakdown with all values
    - _Requirements: 1.1, 1.2, 10.3, 10.4, 10.5_

  - [x] 3.2 Add payment calculation API endpoint

    - Create POST /api/v1/payments/calculate endpoint
    - Accept working_hours and hourly_rate as input
    - Return breakdown with subtotal, fee, and total
    - _Requirements: 1.2_

- [x] 4. Backend: Implement Stripe Payment Intent creation with escrow

  - [x] 4.1 Update create_stripe_payment_intent method

    - Accept working_hours and hourly_rate parameters
    - Calculate payment amount using calculate_job_payment
    - Create Stripe PaymentIntent with capture_method='manual' for escrow
    - Include booking_id and payment breakdown i

n metadata - Return client_secret and payment_intent_id

    - _Requirements: 1.3, 1.4, 3.1_

- [x] 4.2 Implement confirm_stripe_payment method

  - Retrieve PaymentIntent from Stripe
  - Verify payment status is 'requires_capture'
  - Create Payment record with status 'held'
  - Store working_hours, hourly_rate, and calculated amounts

  - _Requirements: 1.5, 3.1_

- [x] 5. Backend: Implement payment method management

  - [x] 5.1 Create add_payment_method method

    - Accept Stripe payment_method_id from client
    - Attach payment method to Stripe customer
    - Store payment method details in database (masked)
    - Set as default if it's the first method
    - _Requirements: 2.1, 2.2_

  - [x] 5.2 Create get_payment_methods method

    - Query user's payment methods from database
    - Return list with masked card details (last 4 digits only)
    - _Requirements: 2.3_

  - [x] 5.3 Create set_default_payment_method method

    - Update is_default flag for selected method
    - Set all other methods to is_default=False
    - _Requirements: 2.4_

  - [x] 5.4 Create delete_payment_method method

    - Detach payment method from Stripe customer
    - Delete payment method record from database
    - If default method deleted, set another as default
    - _Requirements: 2.5_

  - [x] 5.5 Create API endpoints for payment method management

    - POST /api/v1/payments/methods - Add payment method
    - GET /api/v1/payments/methods - List payment methods
    - PUT /api/v1/payments/methods/{id}/default - Set default
    - DELETE /api/v1/payments/methods/{id} - Delete method
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Backend: Implement escrow hold and release logic

  - [x] 6.1 Create hold_payment method

    - Update payment status to 'held' after successful payment
    - Record timestamp of when payment was held
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Create release_payment method

    - Verify caller is the client who made the payment
    - Verify payment status is 'held'
    - Capture the Stripe PaymentIntent
    - Update payment status to 'released'
    - Record release timestamp
    - _Requirements: 3.4_

  - [x] 6.3 Create auto_release_expired_payments scheduled task

    - Query payments with status 'held' older than 14 days
    - Automatically release each payment
    - Send notifications to workers
    - _Requirements: 3.5_

  - [x] 6.4 Add release payment API endpoint

    - POST /api/v1/payments/{id}/release
    - Verify user is client
    - Call release_payment method
    - Return updated payment details
    - _Requirements: 3.3, 3.4_

- [x] 7. Backend: Implement worker earnings and payout system

  - [x] 7.1 Create get_worker_earnings method

    - Calculate total earned from released payments
    - Calculate available balance (earned - withdrawn)
    - Calculate pending balance from held payments
    - Calculate total platform fees paid
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Create request_payout method

    - Verify requested amount <= available balance

    - Create Stripe Transfer to worker's connected account
    - Create WorkerPayout record with status 'processing'
    - _Requirements: 5.1, 5.2_

  - [x] 7.3 Create process_payout method

    - Update payout status based on Stripe transfer result
    - Handle successful transfers (status='completed')
    - Handle failed transfers (status='failed', store reason)
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 7.4 Create worker earnings and payout API endpoints

    - GET /api/v1/payments/earnings - Get worker earnings summary
    - POST /api/v1/payments/payouts/request - Request payout
    - GET /api/v1/payments/payouts - List payout history
    - GET /api/v1/payments/transactions - Get transaction history
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Backend: Implement refund processing

  - [x] 8.1 Create process_refund method

    - Verify payment status is 'held' or 'released'
    - Validate refund reason (minimum 10 characters)
    - For 'held' payments: cancel PaymentIntent
    - For 'released' payments: create Stripe Refund
    - Update payment status to 'refunded'
    - Send notifications to both parties

    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.2 Create refund API endpoint

    - POST /api/v1/payments/refund
    - Verify user is client
    - Accept payment_id and reason
    - Call process_refund method
    - _Requirements: 6.1, 6.2_

- [x] 9. Backend: Implement payment dispute handling

  - [x] 9.1 Create create_dispute method

        - Create PaymentDispute record with status 'ope

    n' - Prevent payment release while dispute is open - Send notification to admin - _Requirements: 7.1, 7.2_

  - [x] 9.2 Create update_dispute method

    - Allow admin to update dispute status
    - Support statuses: 'under_review', 'resolved', 'closed'
    - Store resolution notes
    - If resolved in favor of client, trigger refund
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 9.3 Create dispute API endpoints

    - POST /api/v1/payments/disputes - Create dispute
    - GET /api/v1/payments/disputes - List user disputes
    - PUT /api/v1/payments/disputes/{id} - Update dispute (admin)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Backend: Implement Stripe webhook handler

  - [x] 10.1 Create webhook signature verification

    - Verify webhook signature using Stripe webhook secret
    - Reject invalid signatures with HTTP 400
    - _Requirements: 8.1, 8.5_

  - [x] 10.2 Handle payment_intent.succeeded event

    - Find payment by payment_intent_id
    - Update payment status to 'held'
    - Send confirmation notification
    - _Requirements: 8.2_

  - [x] 10.3 Handle payment_intent.payment_failed event

    - Find payment by payment_intent_id
    - Update payment status to 'failed'
    - Send failure notification
    - _Requirements: 8.3_

  - [x] 10.4 Handle transfer.paid and transfer.failed events

    - Find payout by transfer_id
    - Update payout status accordingly
    - Send notification to worker
    - _Requirements: 8.4_

  - [x] 10.5 Create webhook endpoint

    - POST /api/v1/payments/webhooks/stripe
    - Parse webhook payload
    - Route to appropriate handler based on event type
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Mobile: Install and configure Stripe SDK

  - Install @stripe/stripe-react-native package
  - Configure StripeProvider with publishable key
  - Wrap app with StripeProvider in App.tsx
  - _Requirements: 9.1_

- [x] 12. Mobile: Create payment service layer

  - [x] 12.1 Implement calculatePayment method

    - Calculate subtotal, platform fee, and total

    - Calculate subtotal, platform fee, and total

    - Return PaymentBreakdown object
    - _Requirements: 1.1, 1.2, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 12.2 Implement createPaymentIntent method

    - Call backend API with booking_id, working_hours, hourly_rate
    - Return payment intent client_secret
    - _Requirements: 1.3, 1.4_

  - [x] 12.3 Implement confirmPayment method

    - Use Stripe SDK to confirm payment with client_secret
    - Call backend to finalize payment record
    - _Requirements: 1.5, 9.4_

  - [x] 12.4 Implement payment method management methods

    - addPaymentMethod: tokenize card and save to backend
    - getPaymentMethods: fetch user's payment methods
    - setDefaultPaymentMethod: update default method
    - deletePaymentMethod: remove payment method
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 12.5 Implement worker earnings methods

    - getEarnings: fetch worker earnings summary
    - requestPayout: submit payout request
    - getPayouts: fetch payout history
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2_

- [x] 13. Mobile: Create Redux payment slice

  - [x] 13.1 Define payment state interface

    - currentPayment, paymentMethods, earnings, payouts
    - loading and error states
    - _Requirements: 9.1_

- - [x] 13.2 Create async thunks for payment operations

    - fetchPaymentMethods, addPaymentMethod, deletePaymentMethod
    - createPaymentIntent, confirmPayment, releasePayment
    - fetchEarnings, requestPayout
    - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 5.1_

  - [x] 13.3 Implement reducers for state updates

    - Handle pending, fulfilled, and rejected states
    - Update loading and error states appropriately
    - _Requirements: 9.3, 9.5_

- [x] 14. Mobile: Build PaymentScreen component

  - [x] 14.1 Create screen layout and job details display

    - Display job title, worker name
    - Show working hours and hourly rate
    - Calculate and display payment breakdown
    - _Requirements: 1.2, 9.1, 10.1, 10.2_

  - [x] 14.2 Implement payment method selection

    - List available payment methods
    - Highlight selected method
    - Show "Add new method" option
    - _Requirements: 9.2_

  - [x] 14.3 Implement payment confirmation flow

    - Show loading indicator during processing
    - Call createPaymentIntent and confirmPayment
    - Handle success: navigate to confirmation screen
    - Handle errors: display error message with retry
    - _Requirements: 9.3, 9.4, 9.5_

  - [x] 14.4 Add payment breakdown section

    - Display subtotal (hours × rate)
    - Display platform fee with percentage
    - Display total amount
    - Format currency properly
    - _Requirements: 10.3, 10.4, 10.5_

- [x] 15. Mobile: Build PaymentMethodsScreen component

  - [x] 15.1 Create payment methods list view

    - Display each payment method card
    - Show card brand, last 4 digits, expiry
    - Show "Default" badge for default method
    - _Requirements: 2.3_

  - [x] 15.2 Implement payment method actions

    - "Set Default" button for non-default methods
    - "Delete" button with confirmation dialog
    - Pull-to-refresh functionality
    - _Requirements: 2.4, 2.5_

  - [x] 15.3 Add "Add Payment Method" button

    - Navigate to AddPaymentMethodScreen
    - Show empty state if no methods
    - _Requirements: 2.1_

- [x] 16. Mobile: Build AddPaymentMethodScreen component

  - [x] 16.1 Integrate Stripe CardField component

    - Add CardField from @stripe/stripe-react-native
    - Style card input field
    - Handle card input validation
    - _Requirements: 2.1_

  - [x] 16.2 Implement card tokenization and save

    - Create payment method token using Stripe SDK
    - Call backend API to save payment method
    - Show success message and navigate back
    - Handle errors appropriately
    - _Requirements: 2.1, 2.2_

- [x] 17. Mobile: Build PaymentConfirmationScreen component

  - [x] 17.1 Create success confirmation UI

    - Show success icon and message
    - Display transaction details (amount, date, payment method)
    - Show payment status (held in escrow)
    - _Requirements: 9.4_

  - [x] 17.2 Add navigation options

    - "View Job Details" button
    - "Back to Dashboard" button
    - _Requirements: 9.4_

- [x] 18. Mobile: Build EarningsScreen component (Worker)

  - [x] 18.1 Create earnings summary cards

    - Total earned card
    - Available balance card (prominent)
    - Pending balance card
    - Total withdrawn card
    - Platform fees paid card
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 18.2 Add transaction history list

    - Display all payment transactions
    - Show date, job, amount, status
    - Order by date descending
    - Pull-to-refresh
    - _Requirements: 4.5_

  - [x] 18.3 Add "Request Payout" button
    - Navigate to PayoutRequestScreen
    - Disable if available balance is zero
    - _Requirements: 5.1_

- [x] 19. Mobile: Build PayoutRequestScreen component (Worker)

  - [x] 19.1 Create payout request form

    - Display available balance
    - Amount input field with validation
    - Show payout method (bank account)
    - _Requirements: 5.1_

  - [x] 19.2 Implement payout submission

    - Validate amount <= available balance
    - Call requestPayout API
    - Show success message
    - Navigate back to earnings screen
    - Handle errors (insufficient balance, etc.)
    - _Requirements: 5.1, 5.2_

- [x] 20. Integration: Connect payment flow to job completion

  - [x] 20.1 Add "Complete Job & Pay" button to job details screen

    - Show button when job status is 'completed'
    - Navigate to PaymentScreen with job details
    - Pass working_hours and hourly_rate
    - _Requirements: 1.1, 1.2_

  - [x] 20.2 Add "Release Payment" button for clients

    - Show on completed jobs with held payments
    - Call release payment API
    - Show confirmation dialog
    - Update UI after release
    - _Requirements: 3.3, 3.4_
