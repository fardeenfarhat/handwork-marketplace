# Handwork Marketplace API Documentation

## Overview

The Handwork Marketplace API is a RESTful API built with FastAPI that provides endpoints for managing users, jobs, payments, messaging, and other platform features. This documentation covers all available endpoints with examples and schemas.

**Base URL**: `https://api.handworkmarketplace.com`
**API Version**: v1
**Authentication**: JWT Bearer Token

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Job Management](#job-management)
4. [Booking System](#booking-system)
5. [Payment Processing](#payment-processing)
6. [Messaging System](#messaging-system)
7. [Review System](#review-system)
8. [Admin Endpoints](#admin-endpoints)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

## Authentication

### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "role": "worker"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "worker",
    "is_verified": false
  }
}
```

### Login

**POST** `/api/auth/login`

Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### OAuth Login

**POST** `/api/auth/oauth/{provider}`

Login using OAuth provider (google, facebook, apple).

**Path Parameters:**
- `provider`: OAuth provider (google, facebook, apple)

**Request Body:**
```json
{
  "token": "oauth_provider_token",
  "role": "worker"
}
```

### Refresh Token

**POST** `/api/auth/refresh`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## User Management

### Get User Profile

**GET** `/api/users/profile`

Get current user's profile information.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "role": "worker",
  "is_verified": true,
  "profile": {
    "bio": "Experienced plumber with 10+ years",
    "skills": ["plumbing", "pipe_repair", "installation"],
    "service_categories": ["plumbing", "maintenance"],
    "hourly_rate": 75.00,
    "location": "New York, NY",
    "portfolio_images": ["image1.jpg", "image2.jpg"],
    "kyc_status": "approved",
    "rating": 4.8,
    "total_jobs": 156
  }
}
```

### Update User Profile

**PUT** `/api/users/profile`

Update user profile information.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "profile": {
    "bio": "Experienced plumber with 10+ years",
    "skills": ["plumbing", "pipe_repair", "installation"],
    "service_categories": ["plumbing", "maintenance"],
    "hourly_rate": 80.00,
    "location": "New York, NY"
  }
}
```

### Upload KYC Documents

**POST** `/api/users/kyc/upload`

Upload KYC verification documents.

**Request Body (multipart/form-data):**
```
id_document: file
proof_of_address: file
additional_documents: file (optional)
```

**Response:**
```json
{
  "message": "KYC documents uploaded successfully",
  "status": "pending_review",
  "documents": [
    {
      "type": "id_document",
      "filename": "id_document.pdf",
      "uploaded_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Job Management

### Create Job

**POST** `/api/jobs`

Create a new job posting (Client only).

**Request Body:**
```json
{
  "title": "Kitchen Sink Repair",
  "description": "Need to fix a leaking kitchen sink. The faucet is dripping and the drain is slow.",
  "category": "plumbing",
  "budget_min": 100.00,
  "budget_max": 200.00,
  "location": "123 Main St, New York, NY 10001",
  "preferred_date": "2024-01-20T09:00:00Z",
  "requirements": {
    "experience_level": "intermediate",
    "tools_required": ["wrench", "plunger"],
    "estimated_duration": "2-3 hours"
  }
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Kitchen Sink Repair",
  "description": "Need to fix a leaking kitchen sink...",
  "category": "plumbing",
  "budget_min": 100.00,
  "budget_max": 200.00,
  "location": "123 Main St, New York, NY 10001",
  "preferred_date": "2024-01-20T09:00:00Z",
  "status": "open",
  "client_id": 1,
  "created_at": "2024-01-15T10:30:00Z",
  "applications_count": 0
}
```

### Get Jobs

**GET** `/api/jobs`

Get list of jobs with optional filtering.

**Query Parameters:**
- `category`: Filter by job category
- `location`: Filter by location
- `budget_min`: Minimum budget filter
- `budget_max`: Maximum budget filter
- `status`: Filter by job status
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Example Request:**
```
GET /api/jobs?category=plumbing&location=New York&page=1&limit=10
```

**Response:**
```json
{
  "jobs": [
    {
      "id": 1,
      "title": "Kitchen Sink Repair",
      "description": "Need to fix a leaking kitchen sink...",
      "category": "plumbing",
      "budget_min": 100.00,
      "budget_max": 200.00,
      "location": "123 Main St, New York, NY 10001",
      "preferred_date": "2024-01-20T09:00:00Z",
      "status": "open",
      "client": {
        "id": 1,
        "first_name": "Jane",
        "last_name": "Smith",
        "rating": 4.5
      },
      "distance": 2.5,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "pages": 1
}
```

### Get Job Details

**GET** `/api/jobs/{job_id}`

Get detailed information about a specific job.

**Response:**
```json
{
  "id": 1,
  "title": "Kitchen Sink Repair",
  "description": "Need to fix a leaking kitchen sink...",
  "category": "plumbing",
  "budget_min": 100.00,
  "budget_max": 200.00,
  "location": "123 Main St, New York, NY 10001",
  "preferred_date": "2024-01-20T09:00:00Z",
  "status": "open",
  "requirements": {
    "experience_level": "intermediate",
    "tools_required": ["wrench", "plunger"],
    "estimated_duration": "2-3 hours"
  },
  "client": {
    "id": 1,
    "first_name": "Jane",
    "last_name": "Smith",
    "rating": 4.5,
    "total_jobs_posted": 25
  },
  "applications": [
    {
      "id": 1,
      "worker": {
        "id": 2,
        "first_name": "John",
        "last_name": "Doe",
        "rating": 4.8
      },
      "message": "I have 10+ years of plumbing experience...",
      "proposed_rate": 75.00,
      "proposed_start_date": "2024-01-20T09:00:00Z",
      "status": "pending"
    }
  ],
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Apply to Job

**POST** `/api/jobs/{job_id}/apply`

Apply to a job (Worker only).

**Request Body:**
```json
{
  "message": "I have 10+ years of plumbing experience and can fix your sink quickly and efficiently.",
  "proposed_rate": 75.00,
  "proposed_start_date": "2024-01-20T09:00:00Z"
}
```

**Response:**
```json
{
  "id": 1,
  "job_id": 1,
  "worker_id": 2,
  "message": "I have 10+ years of plumbing experience...",
  "proposed_rate": 75.00,
  "proposed_start_date": "2024-01-20T09:00:00Z",
  "status": "pending",
  "created_at": "2024-01-15T11:00:00Z"
}
```

### Hire Worker

**POST** `/api/jobs/{job_id}/hire`

Hire a worker for a job (Client only).

**Request Body:**
```json
{
  "worker_id": 2,
  "agreed_rate": 75.00,
  "start_date": "2024-01-20T09:00:00Z",
  "notes": "Please call when you arrive"
}
```

## Booking System

### Get Bookings

**GET** `/api/bookings`

Get user's bookings (both as client and worker).

**Query Parameters:**
- `status`: Filter by booking status
- `role`: Filter by user role in booking (client/worker)

**Response:**
```json
{
  "bookings": [
    {
      "id": 1,
      "job": {
        "id": 1,
        "title": "Kitchen Sink Repair",
        "category": "plumbing"
      },
      "client": {
        "id": 1,
        "first_name": "Jane",
        "last_name": "Smith"
      },
      "worker": {
        "id": 2,
        "first_name": "John",
        "last_name": "Doe"
      },
      "start_date": "2024-01-20T09:00:00Z",
      "agreed_rate": 75.00,
      "status": "confirmed",
      "created_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### Update Booking Status

**PUT** `/api/bookings/{booking_id}/status`

Update booking status.

**Request Body:**
```json
{
  "status": "in_progress",
  "notes": "Work has started"
}
```

### Complete Booking

**POST** `/api/bookings/{booking_id}/complete`

Mark booking as completed with photos.

**Request Body (multipart/form-data):**
```
completion_notes: "Job completed successfully. Fixed the leak and replaced the faucet."
completion_photos: file[]
```

## Payment Processing

### Create Payment Intent

**POST** `/api/payments/intent`

Create payment intent for a booking.

**Request Body:**
```json
{
  "booking_id": 1,
  "amount": 75.00,
  "payment_method": "stripe"
}
```

**Response:**
```json
{
  "client_secret": "pi_1234567890_secret_abcdef",
  "payment_intent_id": "pi_1234567890",
  "amount": 75.00,
  "currency": "usd",
  "status": "requires_payment_method"
}
```

### Confirm Payment

**POST** `/api/payments/{payment_id}/confirm`

Confirm payment after job completion.

**Request Body:**
```json
{
  "rating": 5,
  "review": "Excellent work, very professional"
}
```

### Get Payment History

**GET** `/api/payments/history`

Get user's payment history.

**Response:**
```json
{
  "payments": [
    {
      "id": 1,
      "booking_id": 1,
      "amount": 75.00,
      "platform_fee": 7.50,
      "net_amount": 67.50,
      "status": "completed",
      "payment_method": "stripe",
      "created_at": "2024-01-20T10:00:00Z",
      "completed_at": "2024-01-20T15:00:00Z"
    }
  ]
}
```

## Messaging System

### Get Conversations

**GET** `/api/messages/conversations`

Get user's message conversations.

**Response:**
```json
{
  "conversations": [
    {
      "id": 1,
      "job_id": 1,
      "participant": {
        "id": 2,
        "first_name": "John",
        "last_name": "Doe",
        "avatar": "avatar.jpg"
      },
      "last_message": {
        "content": "I'll be there at 9 AM",
        "created_at": "2024-01-19T20:00:00Z",
        "is_read": true
      },
      "unread_count": 0
    }
  ]
}
```

### Get Messages

**GET** `/api/messages/conversations/{conversation_id}`

Get messages in a conversation.

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "sender_id": 1,
      "content": "When can you start the work?",
      "attachments": [],
      "is_read": true,
      "created_at": "2024-01-19T18:00:00Z"
    },
    {
      "id": 2,
      "sender_id": 2,
      "content": "I'll be there at 9 AM",
      "attachments": [],
      "is_read": true,
      "created_at": "2024-01-19T20:00:00Z"
    }
  ]
}
```

### Send Message

**POST** `/api/messages`

Send a message in a conversation.

**Request Body (multipart/form-data):**
```
receiver_id: 2
job_id: 1
content: "I'll be there at 9 AM"
attachments: file[] (optional)
```

**Response:**
```json
{
  "id": 3,
  "sender_id": 1,
  "receiver_id": 2,
  "job_id": 1,
  "content": "I'll be there at 9 AM",
  "attachments": [],
  "is_read": false,
  "created_at": "2024-01-19T20:00:00Z"
}
```

## Review System

### Submit Review

**POST** `/api/reviews`

Submit a review after job completion.

**Request Body:**
```json
{
  "booking_id": 1,
  "rating": 5,
  "comment": "Excellent work! Very professional and completed the job quickly.",
  "reviewee_id": 2
}
```

**Response:**
```json
{
  "id": 1,
  "booking_id": 1,
  "reviewer_id": 1,
  "reviewee_id": 2,
  "rating": 5,
  "comment": "Excellent work! Very professional...",
  "status": "approved",
  "created_at": "2024-01-20T16:00:00Z"
}
```

### Get Reviews

**GET** `/api/reviews`

Get reviews for a user.

**Query Parameters:**
- `user_id`: Get reviews for specific user
- `type`: Filter by review type (received/given)

**Response:**
```json
{
  "reviews": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Excellent work! Very professional...",
      "reviewer": {
        "id": 1,
        "first_name": "Jane",
        "last_name": "Smith"
      },
      "job": {
        "id": 1,
        "title": "Kitchen Sink Repair"
      },
      "created_at": "2024-01-20T16:00:00Z"
    }
  ],
  "average_rating": 4.8,
  "total_reviews": 156
}
```

## Admin Endpoints

### Get Users

**GET** `/api/admin/users`

Get list of users (Admin only).

**Query Parameters:**
- `role`: Filter by user role
- `status`: Filter by user status
- `search`: Search by name or email

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "worker",
      "is_verified": true,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "last_login": "2024-01-19T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### Update User Status

**PUT** `/api/admin/users/{user_id}/status`

Update user account status (Admin only).

**Request Body:**
```json
{
  "is_active": false,
  "reason": "Violation of terms of service"
}
```

### Get Platform Analytics

**GET** `/api/admin/analytics`

Get platform analytics and metrics (Admin only).

**Response:**
```json
{
  "users": {
    "total": 1250,
    "active": 1100,
    "new_this_month": 85
  },
  "jobs": {
    "total": 3500,
    "completed": 3200,
    "active": 150,
    "posted_this_month": 280
  },
  "revenue": {
    "total": 125000.00,
    "this_month": 15000.00,
    "platform_fees": 12500.00
  },
  "top_categories": [
    {"category": "plumbing", "count": 450},
    {"category": "electrical", "count": 380},
    {"category": "cleaning", "count": 320}
  ]
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": true,
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "status_code": 400,
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | AUTHENTICATION_REQUIRED | Authentication token required |
| 401 | INVALID_TOKEN | Invalid or expired token |
| 403 | INSUFFICIENT_PERMISSIONS | User lacks required permissions |
| 404 | RESOURCE_NOT_FOUND | Requested resource not found |
| 409 | RESOURCE_CONFLICT | Resource already exists |
| 422 | UNPROCESSABLE_ENTITY | Request data is invalid |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_SERVER_ERROR | Server error |

### Example Error Responses

**Validation Error:**
```json
{
  "error": true,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "status_code": 422,
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

**Authentication Error:**
```json
{
  "error": true,
  "message": "Authentication token required",
  "code": "AUTHENTICATION_REQUIRED",
  "status_code": 401
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 60 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **File upload endpoints**: 20 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642694400
```

## WebSocket Events

### Real-time Messaging

Connect to WebSocket endpoint: `wss://api.handworkmarketplace.com/ws`

**Authentication:**
Send authentication message after connection:
```json
{
  "type": "auth",
  "token": "your_jwt_token"
}
```

**Message Events:**
```json
{
  "type": "new_message",
  "data": {
    "id": 1,
    "sender_id": 2,
    "content": "Hello!",
    "job_id": 1,
    "created_at": "2024-01-19T20:00:00Z"
  }
}
```

**Typing Indicators:**
```json
{
  "type": "typing",
  "data": {
    "user_id": 2,
    "job_id": 1,
    "is_typing": true
  }
}
```

## SDK and Code Examples

### JavaScript/TypeScript

```javascript
// Initialize API client
const apiClient = new HandworkAPI({
  baseURL: 'https://api.handworkmarketplace.com',
  apiKey: 'your_api_key'
});

// Login
const authResponse = await apiClient.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Get jobs
const jobs = await apiClient.jobs.list({
  category: 'plumbing',
  location: 'New York'
});

// Apply to job
const application = await apiClient.jobs.apply(jobId, {
  message: 'I can help with this job',
  proposed_rate: 75.00
});
```

### Python

```python
from handwork_api import HandworkAPI

# Initialize client
client = HandworkAPI(
    base_url='https://api.handworkmarketplace.com',
    api_key='your_api_key'
)

# Login
auth_response = client.auth.login(
    email='user@example.com',
    password='password123'
)

# Get jobs
jobs = client.jobs.list(
    category='plumbing',
    location='New York'
)

# Apply to job
application = client.jobs.apply(
    job_id=1,
    message='I can help with this job',
    proposed_rate=75.00
)
```

This API documentation provides comprehensive coverage of all endpoints with examples and schemas. For additional support, contact our developer support team at dev-support@handworkmarketplace.com.