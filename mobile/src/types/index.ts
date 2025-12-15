import { NavigatorScreenParams } from '@react-navigation/native';

// User types
export interface User {
  id: number;
  email: string;
  phone: string;
  role: 'client' | 'worker';
  firstName: string;
  lastName: string;
  isVerified: boolean; // KYC verification status
  emailVerified: boolean; // Email verification status
  phoneVerified: boolean; // Phone verification status
  isActive: boolean;
}

export interface AuthError {
  message: string;
  type: 'timeout' | 'network' | 'validation' | 'server' | 'auth' | 'unknown';
  isRetryable: boolean;
  statusCode?: number;
  timestamp: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  onboardingCompleted: boolean;
  isRetrying: boolean;
  retryCount: number;
  lastOperation: 'login' | 'register' | 'loadStored' | 'socialLogin' | null;
  timeoutWarningShown: boolean;
}

// Auth form types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'client' | 'worker';
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerificationData {
  code: string;
  type: 'email' | 'phone';
}

// Job types
export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: number;
  clientId: number;
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  location: string;
  latitude?: number;
  longitude?: number;
  preferredDate: string;
  status: JobStatus;
  createdAt: string;
  updatedAt?: string;
  distance?: number;
  requirements?: string[];
  clientName?: string;
  clientRating?: number;
  applicationsCount?: number;
  clientUserId?: number;
}

export interface JobApplication {
  id: number;
  jobId: number;
  workerId: number;
  workerName: string;
  workerRating: number;
  message: string;
  proposedRate: number;
  proposedStartDate: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  jobTitle?: string;
}

export interface JobFilters {
  category?: string;
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  radius?: number;
  sortBy?: 'date' | 'budget' | 'distance' | 'rating';
  sortOrder?: 'asc' | 'desc';
  status?: string;
  userLatitude?: number;
  userLongitude?: number;
  search?: string;
}

export interface JobFormData {
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  location: string;
  latitude?: number;
  longitude?: number;
  preferredDate: string;
  requirements: string[];
}

// Profile types
export interface WorkerProfile {
  userId: number;
  bio: string;
  skills: string[];
  serviceCategories: string[];
  hourlyRate: number;
  location: string;
  portfolioImages: string[];
  kycStatus: 'pending' | 'approved' | 'rejected';
  rating: number;
  totalJobs: number;
}

export interface ClientProfile {
  id: number;
  userId: number;
  companyName?: string;
  description: string;
  location: string;
  rating: number;
  totalJobsPosted: number;
}

// Message types
export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  jobId: number;
  content: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
}

// Payment types
export type PaymentStatus = 'pending' | 'held' | 'released' | 'refunded' | 'failed';
export type PaymentMethodType = 'card' | 'paypal' | 'bank_account';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  email?: string; // for PayPal
  bankName?: string; // for bank account
  isDefault: boolean;
  createdAt: string;
}

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  platformFee: number;
  workerAmount: number;
  workingHours?: number;
  hourlyRate?: number;
  stripePaymentId?: string;
  paypalPaymentId?: string;
  status: PaymentStatus;
  createdAt: string;
  releasedAt?: string;
  refundedAt?: string;
  failureReason?: string;
}

export interface PaymentBreakdown {
  workingHours: number;
  hourlyRate: number;
  subtotal: number;
  platformFee: number;
  platformFeePercentage: number;
  total: number;
  workerAmount: number;
  currency: string;
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export interface WorkerEarnings {
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  platformFeesPaid: number;
}

export interface Payout {
  id: number;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  failureReason?: string;
}

export interface PaymentHistory {
  id: number;
  type: 'payment' | 'payout' | 'refund' | 'fee';
  amount: number;
  description: string;
  status: PaymentStatus;
  jobTitle?: string;
  createdAt: string;
}

// Booking types
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Booking {
  id: number;
  jobId: number;
  workerId: number;
  clientId: number;
  workerName: string;
  clientName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  agreedRate: number;
  status: BookingStatus;
  completionNotes?: string;
  completionPhotos: string[];
  createdAt: string;
  updatedAt?: string;
  payment?: Payment;
  clientUserId: number;
  workerUserId: number;
  hasUserReview?: boolean;
}

export interface BookingTimeline {
  id: number;
  bookingId: number;
  status: BookingStatus;
  description: string;
  createdAt: string;
  createdBy: number;
  createdByName: string;
}

// Dispute types
export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'closed';
export type DisputeType = 'payment' | 'quality' | 'no_show' | 'other';

export interface Dispute {
  id: number;
  bookingId: number;
  reporterId: number;
  reporterName: string;
  type: DisputeType;
  description: string;
  evidence: string[];
  status: DisputeStatus;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

// Review and Rating types
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: number;
  bookingId: number;
  reviewerId: number;
  revieweeId: number;
  reviewerName: string;
  revieweeName: string;
  jobTitle: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt?: string;
  response?: ReviewResponse;
  isReported?: boolean;
  reportReason?: string;
}

export interface ReviewResponse {
  id: number;
  reviewId: number;
  responderId: number;
  responderName: string;
  response: string;
  createdAt: string;
}

export interface ReviewSubmission {
  bookingId: number;
  revieweeId?: number;  // Optional since backend auto-determines
  rating: number;
  comment: string;
}

export interface ReviewFilters {
  rating?: number;
  sortBy?: 'date' | 'rating';
  sortOrder?: 'asc' | 'desc';
  status?: ReviewStatus;
  userId?: number;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// Notification types
export type NotificationType = 'job_update' | 'message' | 'payment' | 'review' | 'booking' | 'system';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
  userId: number;
  isRead: boolean;
  createdAt: string;
  scheduledFor?: string;
}

export interface NotificationPreferences {
  jobUpdates: boolean;
  messages: boolean;
  payments: boolean;
  reviews: boolean;
  bookings: boolean;
  marketing: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string; // HH:mm format
}

export interface WebSocketMessage {
  type: 'message' | 'job_update' | 'booking_update' | 'notification' | 'typing' | 'read_receipt';
  data: any;
  timestamp: string;
  userId?: number;
  jobId?: number;
  conversationId?: string;
}

export interface TypingIndicator {
  userId: number;
  userName: string;
  jobId: number;
  isTyping: boolean;
}

export interface ReadReceipt {
  messageId: number;
  userId: number;
  readAt: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Reviews: NavigatorScreenParams<ReviewStackParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  EmailVerification: { email?: string };
  PhoneVerification: { phone: string };
  RoleSelection: undefined;
  Onboarding: { role?: 'client' | 'worker' };
};

export type MainTabParamList = {
  Jobs: NavigatorScreenParams<JobsStackParamList> | undefined;
  Messages: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  Dashboard: undefined;
  Payments: NavigatorScreenParams<PaymentStackParamList> | undefined;
  Notifications: undefined;
};

export type NotificationStackParamList = {
  NotificationsList: undefined;
  NotificationSettings: undefined;
};

export type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: {
    jobId: number;
    jobTitle?: string;
    otherUserName?: string;
    otherUserId?: number;
  };
};

export type JobsStackParamList = {
  JobsList: undefined;
  JobMap: undefined;
  JobDetail: { jobId: number };
  JobPost: { jobId?: number; isEdit?: boolean } | undefined;
  JobApplication: { jobId: number };
  JobManagement: { 
    refresh?: boolean; 
    initialTab?: 'posted' | 'applications' | 'applied'; 
  } | undefined;
  UserProfileView: { userId: number; userType: 'worker' | 'client' };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  WorkerProfileEdit: undefined;
  ClientProfileEdit: undefined;
  KYCUpload: undefined;
  Portfolio: undefined;
  UserProfileView: { userId: number; userType: 'worker' | 'client' };
};

export type PaymentStackParamList = {
  PaymentMethods: undefined;
  BankAccount: undefined;
  AddPaymentMethod: undefined;
  Payment: {
    bookingId: number;
    jobTitle: string;
    workerName: string;
    workingHours: number;
    hourlyRate: number;
  };
  PaymentConfirmation: {
    paymentId: number;
    amount: number;
    jobTitle: string;
    workerName: string;
  };
  BookingConfirmation: { jobId: number; workerId: number; agreedRate: number };
  JobTracking: { bookingId: number; showReviewPrompt?: boolean };
  CompletionVerification: { bookingId: number };
  PaymentHistory: undefined;
  DisputeReport: { bookingId: number };
  DisputeDetail: { disputeId: number };
  Earnings: undefined;
  PayoutRequest: undefined;
};

export type ReviewStackParamList = {
  ReviewSubmission: { bookingId: number; revieweeId?: number; revieweeName: string; jobTitle: string };
  ReviewsList: { userId?: number };
  ReviewDetail: { reviewId: number };
  ReviewModeration: { reviewId: number };
};

// Navigation prop types
import { NavigationProp, NavigatorScreenParams } from '@react-navigation/native';

export type MainTabNavigationProp = NavigationProp<MainTabParamList>;
export type JobsStackNavigationProp = NavigationProp<JobsStackParamList>;
export type ProfileStackNavigationProp = NavigationProp<ProfileStackParamList>;
export type PaymentStackNavigationProp = NavigationProp<PaymentStackParamList>;