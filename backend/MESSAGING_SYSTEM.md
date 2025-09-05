# Messaging System Implementation

## Overview

The messaging system provides real-time communication capabilities for the Handwork Marketplace platform, enabling clients and workers to communicate securely about job opportunities, project details, and coordination.

## Features Implemented

### ✅ 1. Real-time Messaging with WebSocket Support
- **WebSocket endpoint**: `/api/v1/messages/ws/{user_id}`
- **Connection management**: Tracks active user connections
- **Message broadcasting**: Real-time message delivery between users
- **Connection health**: Ping/pong mechanism for connection monitoring

### ✅ 2. Message Storage and Retrieval
- **Database model**: SQLAlchemy Message model with relationships
- **Conversation threading**: Groups messages between participants
- **Message history**: Paginated message retrieval with filtering
- **Conversation list**: Shows recent conversations with last message and unread count

### ✅ 3. File and Image Attachment Support
- **File upload**: `/api/v1/messages/upload-attachment` endpoint
- **Supported formats**: Images (JPEG, PNG, GIF), Documents (PDF, TXT, DOC, DOCX)
- **File validation**: Type checking, size limits (10MB max)
- **Storage**: Organized by user ID in `uploads/message_attachments/`

### ✅ 4. Typing Indicators and Read Receipts
- **Typing indicators**: Real-time typing status via WebSocket
- **Read receipts**: Message read status tracking and notifications
- **Status updates**: Automatic status synchronization between participants

### ✅ 5. Content Moderation and Filtering
- **Profanity filter**: Detects and blocks inappropriate content
- **Pattern detection**: Identifies suspicious patterns (phone numbers, emails, URLs)
- **Content flagging**: Flags messages for manual review
- **Automatic filtering**: Replaces flagged content with placeholder text

### ✅  6. Push Notification Integration
- **Message notifications**: Alerts for new messages
- **Typing notifications**: Real-time typing indicators
- **In-app notifications**: Database-stored notification system
- **FCM ready**: Prepared for Firebase Cloud Messaging integration

## API Endpoints

### WebSocket Connection
```
WS /api/v1/messages/ws/{user_id}
```
Real-time messaging connection for live communication.

### Message Management
```
POST /api/v1/messages/                    # Create new message
GET  /api/v1/messages/                    # Get messages with filtering
GET  /api/v1/messages/conversations       # Get conversation list
PUT  /api/v1/messages/{id}/read          # Mark message as read
PUT  /api/v1/messages/read-bulk          # Mark multiple messages as read
DELETE /api/v1/messages/{id}             # Delete message (sender only)
```

### File Attachments
```
POST /api/v1/messages/upload-attachment  # Upload file attachment
```

### Utility Endpoints
```
GET /api/v1/messages/participants        # Get conversation participants
GET /api/v1/messages/online-users        # Get online users list
```

## Database Schema

### Message Model
```python
class Message(Base):
    id: int                    # Primary key
    sender_id: int            # Foreign key to User
    receiver_id: int          # Foreign key to User
    job_id: int (optional)    # Foreign key to Job
    content: str              # Message content
    attachments: JSON         # File attachment paths
    is_read: bool             # Read status
    created_at: datetime      # Timestamp
```

### Relationships
- `Message.sender` → `User`
- `Message.receiver` → `User`
- `Message.job` → `Job` (optional)

## Services Architecture

### MessagingService
Core business logic for message operations:
- Message creation with content moderation
- Conversation management and threading
- Message filtering and retrieval
- Read status management
- File attachment handling

### WebSocketManager
Real-time communication management:
- Connection lifecycle management
- Message broadcasting
- Typing indicator handling
- Read receipt processing
- Online status tracking

### ContentModerationService
Content filtering and safety:
- Profanity detection
- Suspicious pattern identification
- Content flagging and filtering
- Automated content review

### NotificationService
Push notification handling:
- Message notifications
- Typing indicators
- In-app notification creation
- FCM integration ready

### FileStorageService
File attachment management:
- File upload and validation
- Type and size checking
- Secure file storage
- Image processing and thumbnails

## Security Features

### Authentication
- JWT token-based authentication
- User role verification
- Message access control (sender/receiver only)

### Content Security
- Input validation and sanitization
- File type and size restrictions
- Content moderation and filtering
- XSS protection

### Privacy
- Message encryption ready
- User data protection
- Conversation privacy (participants only)
- Secure file storage

## Usage Examples

### Creating a Message
```python
from app.schemas.messages import MessageCreate

message_data = MessageCreate(
    receiver_id=2,
    job_id=1,  # Optional
    content="Hello! I'm interested in your plumbing job."
)

messaging_service = MessagingService(db)
message = messaging_service.create_message(message_data, sender_id=1)
```

### WebSocket Message Handling
```javascript
// Client-side WebSocket connection
const ws = new WebSocket('ws://localhost:8000/api/v1/messages/ws/1');

// Send typing indicator
ws.send(JSON.stringify({
    type: 'typing',
    data: {
        conversation_id: '1_2',
        is_typing: true,
        receiver_id: 2
    }
}));

// Send read receipt
ws.send(JSON.stringify({
    type: 'read_receipt',
    data: {
        message_id: 123,
        sender_id: 2
    }
}));
```

### File Upload
```python
# Upload message attachment
with open('document.pdf', 'rb') as file:
    response = client.post(
        '/api/v1/messages/upload-attachment',
        files={'file': file},
        headers=auth_headers
    )
    
attachment_url = response.json()['url']
```

## Testing

### Test Coverage
- ✅ Content moderation functionality
- ✅ Message creation and retrieval
- ✅ Conversation management
- ✅ Read status tracking
- ✅ API endpoint functionality
- ✅ Authentication and authorization

### Running Tests
```bash
cd backend
python -m pytest tests/test_messaging.py -v
```

## Performance Considerations

### Database Optimization
- Indexed fields for fast queries
- Efficient conversation grouping
- Pagination for message history
- Optimized unread count queries

### WebSocket Scaling
- Connection pooling
- Message queuing for offline users
- Horizontal scaling ready
- Memory-efficient connection management

### File Storage
- Organized directory structure
- File size limitations
- Image optimization and thumbnails
- CDN integration ready

## Future Enhancements

### Planned Features
- [ ] Message encryption (end-to-end)
- [ ] Voice message support
- [ ] Message reactions and emojis
- [ ] Message search functionality
- [ ] Conversation archiving
- [ ] Group messaging support
- [ ] Message scheduling
- [ ] Advanced content moderation with AI

### Integration Opportunities
- [ ] Firebase Cloud Messaging (FCM)
- [ ] AWS S3 for file storage
- [ ] Redis for WebSocket scaling
- [ ] Elasticsearch for message search
- [ ] AI-powered content moderation

## Configuration

### Environment Variables
```bash
# File storage
UPLOAD_DIR=./uploads

# WebSocket settings
WS_HEARTBEAT_INTERVAL=30

# Content moderation
ENABLE_CONTENT_MODERATION=true
PROFANITY_FILTER_STRICT=false

# Notifications
FCM_SERVER_KEY=your_fcm_server_key
ENABLE_PUSH_NOTIFICATIONS=true
```

### File Size Limits
- Message attachments: 10MB
- Image files: 5MB
- Profile images: 5MB
- KYC documents: 10MB

## Monitoring and Logging

### Metrics to Track
- Message delivery success rate
- WebSocket connection stability
- File upload success rate
- Content moderation accuracy
- Response times for API endpoints

### Logging
- Message creation and delivery
- WebSocket connection events
- File upload activities
- Content moderation actions
- Error tracking and debugging

## Deployment Notes

### Requirements
- Python 3.8+
- FastAPI with WebSocket support
- SQLAlchemy 2.0+
- File system access for uploads
- Redis (recommended for scaling)

### Production Considerations
- Load balancer with WebSocket support
- Shared file storage (NFS/S3)
- Database connection pooling
- WebSocket connection limits
- Content delivery network (CDN)

---

This messaging system provides a solid foundation for real-time communication in the Handwork Marketplace platform, with room for future enhancements and scaling as the platform grows.