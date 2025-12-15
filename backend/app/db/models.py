from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, Enum, ForeignKey, JSON, Index, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    CLIENT = "client"
    WORKER = "worker"
    ADMIN = "admin"

class JobStatus(str, enum.Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class KYCStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    HELD = "held"
    RELEASED = "released"
    REFUNDED = "refunded"
    FAILED = "failed"
    DISPUTED = "disputed"

class PaymentMethod(str, enum.Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"

class DisputeStatus(str, enum.Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    CLOSED = "closed"

class WithdrawalStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ReviewStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class NotificationType(str, enum.Enum):
    JOB_UPDATE = "job_update"
    MESSAGE = "message"
    PAYMENT = "payment"
    REVIEW = "review"

class TokenType(str, enum.Enum):
    EMAIL_VERIFICATION = "email_verification"
    PHONE_VERIFICATION = "phone_verification"
    PASSWORD_RESET = "password_reset"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)  # Nullable for OAuth users
    role = Column(Enum(UserRole, values_callable=lambda obj: [e.value for e in obj]), nullable=False, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    email_verified = Column(Boolean, default=False, index=True)
    phone_verified = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    worker_profile = relationship("WorkerProfile", back_populates="user", uselist=False)
    client_profile = relationship("ClientProfile", back_populates="user", uselist=False)
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")
    notifications = relationship("Notification", back_populates="user")
    given_reviews = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer")
    received_reviews = relationship("Review", foreign_keys="Review.reviewee_id", back_populates="reviewee")
    verification_tokens = relationship("VerificationToken", back_populates="user")
    oauth_accounts = relationship("OAuthAccount", back_populates="user")

class VerificationToken(Base):
    __tablename__ = "verification_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    token_type = Column(Enum(TokenType), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_used = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="verification_tokens")

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)  # google, facebook, apple
    provider_user_id = Column(String, nullable=False, index=True)
    provider_email = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="oauth_accounts")
    
    # Unique constraint for provider + provider_user_id
    __table_args__ = (
        Index('idx_oauth_provider_user', 'provider', 'provider_user_id', unique=True),
    )
class WorkerProfile(Base):
    __tablename__ = "worker_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    bio = Column(Text)
    skills = Column(JSON)
    service_categories = Column(JSON, index=True)
    hourly_rate = Column(Numeric(10, 2))
    location = Column(String, index=True)
    portfolio_images = Column(JSON)
    kyc_status = Column(Enum(KYCStatus), default=KYCStatus.PENDING, index=True)
    kyc_documents = Column(JSON)
    rating = Column(Float, default=0.0, index=True)
    total_jobs = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Bank account details for payouts
    bank_account_holder_name = Column(String)
    bank_name = Column(String)
    bank_account_number = Column(String)  # Encrypted in production
    bank_routing_number = Column(String)  # US banks
    bank_country = Column(String, default="US")
    bank_currency = Column(String, default="USD")
    bank_account_verified = Column(Boolean, default=False)
    
    # Stripe Connect account ID for payouts
    stripe_account_id = Column(String, index=True)
    
    # Relationships
    user = relationship("User", back_populates="worker_profile")
    job_applications = relationship("JobApplication", back_populates="worker")
    bookings = relationship("Booking", back_populates="worker")
    payouts = relationship("WorkerPayout", back_populates="worker")

class ClientProfile(Base):
    __tablename__ = "client_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    company_name = Column(String)
    description = Column(Text)
    location = Column(String, index=True)
    rating = Column(Float, default=0.0, index=True)
    total_jobs_posted = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="client_profile")
    jobs = relationship("Job", back_populates="client")
    bookings = relationship("Booking", back_populates="client")
class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("client_profiles.id"), nullable=False, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False, index=True)
    budget_min = Column(Numeric(10, 2), nullable=False)
    budget_max = Column(Numeric(10, 2), nullable=False)
    location = Column(String, nullable=False, index=True)
    preferred_date = Column(DateTime(timezone=True), index=True)
    status = Column(Enum(JobStatus), default=JobStatus.OPEN, index=True)
    requirements = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    client = relationship("ClientProfile", back_populates="jobs")
    applications = relationship("JobApplication", back_populates="job")
    bookings = relationship("Booking", back_populates="job")
    messages = relationship("Message", back_populates="job")

class JobApplication(Base):
    __tablename__ = "job_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("worker_profiles.id"), nullable=False, index=True)
    message = Column(Text)
    proposed_rate = Column(Numeric(10, 2))
    proposed_start_date = Column(DateTime(timezone=True))
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PENDING, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    job = relationship("Job", back_populates="applications")
    worker = relationship("WorkerProfile", back_populates="job_applications")

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("worker_profiles.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("client_profiles.id"), nullable=False, index=True)
    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True))
    agreed_rate = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING, index=True)
    completion_notes = Column(Text)
    completion_photos = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    job = relationship("Job", back_populates="bookings")
    worker = relationship("WorkerProfile", back_populates="bookings")
    client = relationship("ClientProfile", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking")
    reviews = relationship("Review", back_populates="booking")
    status_history = relationship("BookingStatusHistory", back_populates="booking")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    platform_fee = Column(Numeric(10, 2), nullable=False)
    worker_amount = Column(Numeric(10, 2), nullable=False)  # Amount after platform fee
    payment_method = Column(Enum(PaymentMethod), nullable=False, index=True)
    stripe_payment_id = Column(String, index=True)
    paypal_payment_id = Column(String, index=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, index=True)
    working_hours = Column(Numeric(10, 2))  # Hours worked on the job
    hourly_rate = Column(Numeric(10, 2))  # Agreed hourly rate
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    held_at = Column(DateTime(timezone=True))
    released_at = Column(DateTime(timezone=True))
    refunded_at = Column(DateTime(timezone=True))
    refund_reason = Column(Text)
    payment_metadata = Column(JSON)  # Store additional payment metadata
    
    # Relationships
    booking = relationship("Booking", back_populates="payments")
    disputes = relationship("PaymentDispute", back_populates="payment")

class PaymentMethodModel(Base):
    __tablename__ = "payment_methods"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    stripe_payment_method_id = Column(String, unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False)  # card, bank_account
    brand = Column(String(50))  # visa, mastercard, amex, etc.
    last4 = Column(String(4))  # Made nullable to support payment methods without last4
    expiry_month = Column(Integer)
    expiry_year = Column(Integer)
    is_default = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True)
    content = Column(Text, nullable=False)
    attachments = Column(JSON)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
    job = relationship("Job", back_populates="messages")

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False, index=True)
    comment = Column(Text)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    booking = relationship("Booking", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="given_reviews")
    reviewee = relationship("User", foreign_keys=[reviewee_id], back_populates="received_reviews")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), nullable=False, index=True)
    data = Column(JSON)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    scheduled_for = Column(DateTime(timezone=True), nullable=True, index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")

class PaymentDispute(Base):
    __tablename__ = "payment_disputes"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False, index=True)
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    description = Column(Text)
    status = Column(Enum(DisputeStatus), default=DisputeStatus.OPEN, index=True)
    resolution_notes = Column(Text)
    resolved_by = Column(Integer, ForeignKey("users.id"), index=True)
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    payment = relationship("Payment", back_populates="disputes")
    initiator = relationship("User", foreign_keys=[initiated_by])
    resolver = relationship("User", foreign_keys=[resolved_by])

class WorkerPayout(Base):
    __tablename__ = "worker_payouts"
    
    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("worker_profiles.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False, index=True)
    stripe_transfer_id = Column(String, index=True)
    paypal_payout_id = Column(String, index=True)
    status = Column(Enum(WithdrawalStatus), default=WithdrawalStatus.PENDING, index=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    processed_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    auto_process_at = Column(DateTime(timezone=True), index=True)  # Auto-process after 14 days
    failure_reason = Column(Text)
    payout_metadata = Column(JSON)
    
    # Relationships
    worker = relationship("WorkerProfile")

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), index=True)
    payout_id = Column(Integer, ForeignKey("worker_payouts.id"), index=True)
    transaction_type = Column(String, nullable=False, index=True)  # payment, payout, refund, fee
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(String, nullable=False)
    reference_id = Column(String, index=True)  # External payment system reference
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User")
    payment = relationship("Payment")
    payout = relationship("WorkerPayout")

class BookingStatusHistory(Base):
    __tablename__ = "booking_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    old_status = Column(Enum(BookingStatus), index=True)
    new_status = Column(Enum(BookingStatus), nullable=False, index=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    notes = Column(Text)
    photos = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    booking = relationship("Booking")
    user = relationship("User")

# Database indexes for performance optimization
Index('idx_users_email_active', User.email, User.is_active)
Index('idx_users_role_verified', User.role, User.is_verified)
Index('idx_worker_profiles_location_kyc', WorkerProfile.location, WorkerProfile.kyc_status)
Index('idx_worker_profiles_rating_categories', WorkerProfile.rating, WorkerProfile.service_categories)
Index('idx_client_profiles_location_rating', ClientProfile.location, ClientProfile.rating)
Index('idx_jobs_category_status_location', Job.category, Job.status, Job.location)
Index('idx_jobs_status_created', Job.status, Job.created_at)
Index('idx_job_applications_job_worker', JobApplication.job_id, JobApplication.worker_id)
Index('idx_job_applications_status_created', JobApplication.status, JobApplication.created_at)
Index('idx_bookings_status_start_date', Booking.status, Booking.start_date)
Index('idx_bookings_worker_client', Booking.worker_id, Booking.client_id)
Index('idx_payments_status_created', Payment.status, Payment.created_at)
Index('idx_payments_method_status', Payment.payment_method, Payment.status)
Index('idx_payment_methods_user_default', PaymentMethodModel.user_id, PaymentMethodModel.is_default)
Index('idx_payment_disputes_status_created', PaymentDispute.status, PaymentDispute.created_at)
Index('idx_worker_payouts_status_requested', WorkerPayout.status, WorkerPayout.requested_at)
Index('idx_payment_transactions_user_type', PaymentTransaction.user_id, PaymentTransaction.transaction_type)
Index('idx_messages_sender_receiver', Message.sender_id, Message.receiver_id)
Index('idx_messages_job_created', Message.job_id, Message.created_at)
Index('idx_messages_is_read_created', Message.is_read, Message.created_at)
Index('idx_reviews_rating_status', Review.rating, Review.status)
Index('idx_reviews_reviewee_created', Review.reviewee_id, Review.created_at)
Index('idx_notifications_user_read', Notification.user_id, Notification.is_read)
Index('idx_notifications_type_created', Notification.type, Notification.created_at)
Index('idx_verification_tokens_token_type', VerificationToken.token, VerificationToken.token_type)
Index('idx_verification_tokens_user_type', VerificationToken.user_id, VerificationToken.token_type)
Index('idx_oauth_accounts_provider_email', OAuthAccount.provider, OAuthAccount.provider_email)
Index('idx_booking_status_history_booking_created', BookingStatusHistory.booking_id, BookingStatusHistory.created_at)
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    details = Column(Text)
    ip_address = Column(String(45), nullable=False, index=True)  # IPv6 support
    user_agent = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    severity = Column(String(20), index=True)
    endpoint = Column(String(255), index=True)
    method = Column(String(10), index=True)
    session_id = Column(String(255), index=True)
    
    # Relationships
    user = relationship("User")

# Additional indexes for audit logs
Index('idx_audit_logs_user_action', AuditLog.user_id, AuditLog.action)
Index('idx_audit_logs_timestamp_severity', AuditLog.timestamp, AuditLog.severity)
Index('idx_audit_logs_ip_timestamp', AuditLog.ip_address, AuditLog.timestamp)
Index('idx_audit_logs_action_timestamp', AuditLog.action, AuditLog.timestamp)