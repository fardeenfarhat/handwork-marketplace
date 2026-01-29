# Requirements Document

## Introduction

This document outlines the requirements for implementing a comprehensive Stripe payment integration with escrow/holding functionality for the Handwork Marketplace platform. The system will enable clients to pay for jobs based on working hours × hourly rate, hold payments in escrow until job completion, and facilitate secure payouts to workers.

## Glossary

- **Payment System**: The complete payment processing infrastructure including Stripe integration, escrow management, and payout handling
- **Client**: A user who posts jobs and pays for services
- **Worker**: A user who performs jobs and receives payments
- **Escrow**: A holding mechanism where payment is secured but not released until job completion
- **Stripe**: The third-party payment processor used for handling transactions
- **Payment Intent**: A Stripe object representing the intention to collect payment
- **Payout**: The transfer of funds from the platform to a worker's account
- **Platform Fee**: The commission charged by the platform on each transaction
- **Working Hours**: The total hours a worker spends on a job
- **Hourly Rate**: The agreed-upon payment amount per hour of work

## Requirements

### Requirement 1

**User Story:** As a client, I want to securely pay for a job based on working hours and hourly rate, so that I can hire workers with confidence

#### Acceptance Criteria

1. WHEN a client initiates payment for a job, THE Payment System SHALL calculate the total amount as (working hours × hourly rate) + platform fee
2. WHEN the payment amount is calculated, THE Payment System SHALL display a breakdown showing working hours, hourly rate, subtotal, platform fee, and total amount
3. WHEN a client submits payment information, THE Payment System SHALL create a Stripe Payment Intent with the calculated amount
4. WHEN the Stripe Payment Intent is created successfully, THE Payment System SHALL return the client secret to the mobile application
5. WHEN payment is confirmed, THE Payment System SHALL store the payment record with status "held" in the database

### Requirement 2

**User Story:** As a client, I want to add and manage payment methods securely, so that I can easily pay for jobs

#### Acceptance Criteria

1. WHEN a client adds a payment method, THE Payment System SHALL securely tokenize the card details using Stripe
2. WHEN a payment method is tokenized, THE Payment System SHALL store the Stripe payment method ID without storing raw card details
3. WHEN a client views payment methods, THE Payment System SHALL display masked card numbers showing only the last 4 digits
4. WHEN a client sets a default payment method, THE Payment System SHALL update the default flag for that payment method
5. WHEN a client deletes a payment method, THE Payment System SHALL remove it from Stripe and the database

### Requirement 3

**User Story:** As a client, I want payments to be held in escrow until job completion, so that I am protected if the work is not satisfactory

#### Acceptance Criteria

1. WHEN a payment is successfully processed, THE Payment System SHALL set the payment status to "held"
2. WHILE a payment status is "held", THE Payment System SHALL prevent automatic release of funds to the worker
3. WHEN a job is marked as completed, THE Payment System SHALL notify the client to review and release payment
4. WHEN a client releases payment, THE Payment System SHALL change the payment status from "held" to "released"
5. IF a payment remains "held" for more than 14 days after job completion, THEN THE Payment System SHALL automatically release the payment to the worker

### Requirement 4

**User Story:** As a worker, I want to view my earnings and available balance, so that I can track my income

#### Acceptance Criteria

1. WHEN a worker views their earnings dashboard, THE Payment System SHALL display total earned amount from all released payments
2. WHEN calculating available balance, THE Payment System SHALL sum all released payments minus withdrawn amounts
3. WHEN displaying pending balance, THE Payment System SHALL sum all payments with status "held"
4. WHEN showing platform fees, THE Payment System SHALL calculate the total fees deducted from all released payments
5. WHEN a worker views transaction history, THE Payment System SHALL display all payments ordered by date descending

### Requirement 5

**User Story:** As a worker, I want to request payouts to my bank account, so that I can access my earned money

#### Acceptance Criteria

1. WHEN a worker requests a payout, THE Payment System SHALL verify the requested amount does not exceed available balance
2. WHEN a payout request is valid, THE Payment System SHALL create a Stripe transfer to the worker's connected account
3. WHEN a Stripe transfer is initiated, THE Payment System SHALL store the payout record with status "processing"
4. WHEN a Stripe transfer completes successfully, THE Payment System SHALL update the payout status to "completed"
5. IF a Stripe transfer fails, THEN THE Payment System SHALL update the payout status to "failed" and notify the worker

### Requirement 6

**User Story:** As a client, I want to request refunds for unsatisfactory work, so that I am not charged for poor service

#### Acceptance Criteria

1. WHEN a client requests a refund, THE Payment System SHALL verify the payment status is "held" or "released"
2. WHEN a refund request is submitted, THE Payment System SHALL require a reason with minimum 10 characters
3. WHEN processing a refund for a "held" payment, THE Payment System SHALL cancel the payment intent and update status to "refunded"
4. WHEN processing a refund for a "released" payment, THE Payment System SHALL create a Stripe refund and update status to "refunded"
5. WHEN a refund is completed, THE Payment System SHALL notify both the client and worker

### Requirement 7

**User Story:** As a platform administrator, I want to handle payment disputes, so that I can resolve conflicts between clients and workers

#### Acceptance Criteria

1. WHEN a user initiates a dispute, THE Payment System SHALL create a dispute record with status "open"
2. WHEN a dispute is created, THE Payment System SHALL prevent payment release until the dispute is resolved
3. WHEN an administrator reviews a dispute, THE Payment System SHALL allow updating the status to "under_review"
4. WHEN an administrator resolves a dispute, THE Payment System SHALL allow setting the resolution and updating status to "resolved"
5. WHEN a dispute is resolved in favor of the client, THE Payment System SHALL process a refund

### Requirement 8

**User Story:** As a developer, I want to handle Stripe webhooks, so that payment status updates are processed automatically

#### Acceptance Criteria

1. WHEN a Stripe webhook is received, THE Payment System SHALL verify the webhook signature using the webhook secret
2. WHEN a "payment_intent.succeeded" event is received, THE Payment System SHALL update the corresponding payment status to "held"
3. WHEN a "payment_intent.payment_failed" event is received, THE Payment System SHALL update the payment status to "failed"
4. WHEN a "transfer.paid" event is received, THE Payment System SHALL update the corresponding payout status to "completed"
5. IF webhook signature verification fails, THEN THE Payment System SHALL reject the webhook with HTTP 400 status

### Requirement 9

**User Story:** As a mobile app user, I want a seamless payment experience, so that I can complete transactions quickly

#### Acceptance Criteria

1. WHEN a user navigates to the payment screen, THE Payment System SHALL display the job details and calculated amount
2. WHEN a user selects a payment method, THE Payment System SHALL highlight the selected method
3. WHEN a user confirms payment, THE Payment System SHALL show a loading indicator during processing
4. WHEN payment processing completes successfully, THE Payment System SHALL display a success message and navigate to the confirmation screen
5. IF payment processing fails, THEN THE Payment System SHALL display an error message with retry option

### Requirement 10

**User Story:** As a client, I want to see a detailed payment breakdown before confirming, so that I understand all charges

#### Acceptance Criteria

1. WHEN viewing payment details, THE Payment System SHALL display the working hours as a decimal number
2. WHEN viewing payment details, THE Payment System SHALL display the hourly rate in the job currency
3. WHEN calculating subtotal, THE Payment System SHALL multiply working hours by hourly rate with 2 decimal precision
4. WHEN calculating platform fee, THE Payment System SHALL apply the configured percentage to the subtotal
5. WHEN displaying the total, THE Payment System SHALL sum the subtotal and platform fee with 2 decimal precision
