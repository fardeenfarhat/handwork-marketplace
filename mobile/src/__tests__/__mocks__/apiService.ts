/**
 * Mock API service for testing
 */

export const mockApiService = {
  // Authentication
  login: jest.fn().mockResolvedValue({
    user: {
      id: 1,
      email: 'test@example.com',
      role: 'client',
      firstName: 'Test',
      lastName: 'User'
    },
    token: {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token'
    }
  }),

  register: jest.fn().mockResolvedValue({
    user: {
      id: 1,
      email: 'test@example.com',
      role: 'client',
      firstName: 'Test',
      lastName: 'User'
    },
    token: {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token'
    }
  }),

  logout: jest.fn().mockResolvedValue({ success: true }),

  refreshToken: jest.fn().mockResolvedValue({
    access_token: 'new_mock_access_token',
    refresh_token: 'new_mock_refresh_token'
  }),

  // Profile
  getProfile: jest.fn().mockResolvedValue({
    id: 1,
    email: 'test@example.com',
    role: 'client',
    firstName: 'Test',
    lastName: 'User',
    profile: {
      bio: 'Test bio',
      location: 'New York, NY',
      rating: 4.5
    }
  }),

  updateProfile: jest.fn().mockResolvedValue({
    id: 1,
    email: 'test@example.com',
    profile: {
      bio: 'Updated bio',
      location: 'New York, NY',
      rating: 4.5
    }
  }),

  uploadProfileImage: jest.fn().mockResolvedValue({
    imageUrl: 'https://example.com/profile.jpg'
  }),

  // Jobs
  getJobs: jest.fn().mockResolvedValue({
    jobs: [
      {
        id: 1,
        title: 'Fix Kitchen Sink',
        description: 'Kitchen sink is leaking',
        category: 'plumbing',
        budgetMin: 100,
        budgetMax: 200,
        location: 'New York, NY',
        status: 'open',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        title: 'Electrical Repair',
        description: 'Fix electrical outlet',
        category: 'electrical',
        budgetMin: 150,
        budgetMax: 300,
        location: 'Brooklyn, NY',
        status: 'open',
        createdAt: '2024-01-02T00:00:00Z'
      }
    ],
    total: 2,
    page: 1,
    limit: 10
  }),

  getJob: jest.fn().mockResolvedValue({
    id: 1,
    title: 'Fix Kitchen Sink',
    description: 'Kitchen sink is leaking',
    category: 'plumbing',
    budgetMin: 100,
    budgetMax: 200,
    location: 'New York, NY',
    status: 'open',
    client: {
      id: 1,
      name: 'John Doe',
      rating: 4.2
    }
  }),

  createJob: jest.fn().mockResolvedValue({
    id: 3,
    title: 'New Job',
    description: 'New job description',
    category: 'plumbing',
    budgetMin: 100,
    budgetMax: 200,
    location: 'New York, NY',
    status: 'open'
  }),

  updateJob: jest.fn().mockResolvedValue({
    id: 1,
    title: 'Updated Job Title',
    description: 'Updated description',
    status: 'open'
  }),

  deleteJob: jest.fn().mockResolvedValue({ success: true }),

  searchJobs: jest.fn().mockResolvedValue({
    jobs: [
      {
        id: 1,
        title: 'Plumbing Repair',
        description: 'Fix plumbing issues',
        category: 'plumbing',
        budgetMin: 100,
        budgetMax: 200,
        location: 'New York, NY'
      }
    ],
    total: 1
  }),

  // Job Applications
  applyToJob: jest.fn().mockResolvedValue({
    id: 1,
    jobId: 1,
    workerId: 1,
    message: 'I am interested in this job',
    proposedRate: 150,
    status: 'pending'
  }),

  getJobApplications: jest.fn().mockResolvedValue({
    applications: [
      {
        id: 1,
        jobId: 1,
        worker: {
          id: 1,
          name: 'Jane Smith',
          rating: 4.8,
          skills: ['plumbing']
        },
        message: 'I can help with this job',
        proposedRate: 150,
        status: 'pending'
      }
    ]
  }),

  acceptApplication: jest.fn().mockResolvedValue({
    id: 1,
    status: 'accepted',
    booking: {
      id: 1,
      jobId: 1,
      workerId: 1,
      status: 'confirmed'
    }
  }),

  rejectApplication: jest.fn().mockResolvedValue({
    id: 1,
    status: 'rejected'
  }),

  // Bookings
  getBookings: jest.fn().mockResolvedValue({
    bookings: [
      {
        id: 1,
        job: {
          id: 1,
          title: 'Fix Kitchen Sink',
          category: 'plumbing'
        },
        worker: {
          id: 1,
          name: 'Jane Smith',
          rating: 4.8
        },
        status: 'confirmed',
        agreedRate: 150,
        startDate: '2024-01-15T09:00:00Z'
      }
    ]
  }),

  updateBookingStatus: jest.fn().mockResolvedValue({
    id: 1,
    status: 'completed'
  }),

  // Messages
  getMessages: jest.fn().mockResolvedValue({
    conversations: [
      {
        id: 1,
        participant: {
          id: 2,
          name: 'Jane Smith',
          avatar: 'https://example.com/avatar.jpg'
        },
        lastMessage: {
          content: 'Hello, I can help with your job',
          timestamp: '2024-01-01T12:00:00Z'
        },
        unreadCount: 2
      }
    ]
  }),

  getConversation: jest.fn().mockResolvedValue({
    messages: [
      {
        id: 1,
        senderId: 1,
        content: 'Hello, are you available?',
        timestamp: '2024-01-01T12:00:00Z',
        isRead: true
      },
      {
        id: 2,
        senderId: 2,
        content: 'Yes, I can help!',
        timestamp: '2024-01-01T12:05:00Z',
        isRead: false
      }
    ]
  }),

  sendMessage: jest.fn().mockResolvedValue({
    id: 3,
    senderId: 1,
    content: 'Great, when can you start?',
    timestamp: '2024-01-01T12:10:00Z'
  }),

  markMessageAsRead: jest.fn().mockResolvedValue({ success: true }),

  // Payments
  createPaymentIntent: jest.fn().mockResolvedValue({
    clientSecret: 'pi_test_client_secret',
    paymentIntentId: 'pi_test_123'
  }),

  confirmPayment: jest.fn().mockResolvedValue({
    status: 'succeeded',
    paymentId: 'pi_test_123'
  }),

  getPaymentHistory: jest.fn().mockResolvedValue({
    payments: [
      {
        id: 1,
        amount: 150,
        status: 'completed',
        booking: {
          id: 1,
          job: {
            title: 'Fix Kitchen Sink'
          }
        },
        createdAt: '2024-01-01T00:00:00Z'
      }
    ]
  }),

  // Reviews
  getReviews: jest.fn().mockResolvedValue({
    reviews: [
      {
        id: 1,
        rating: 5,
        comment: 'Excellent work!',
        reviewer: {
          name: 'John Doe'
        },
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    averageRating: 4.8,
    totalReviews: 25
  }),

  submitReview: jest.fn().mockResolvedValue({
    id: 2,
    rating: 5,
    comment: 'Great service!',
    createdAt: '2024-01-02T00:00:00Z'
  }),

  // Notifications
  getNotifications: jest.fn().mockResolvedValue({
    notifications: [
      {
        id: 1,
        title: 'New Job Application',
        message: 'You have a new application for your job',
        type: 'job_application',
        isRead: false,
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    unreadCount: 1
  }),

  markNotificationAsRead: jest.fn().mockResolvedValue({ success: true }),

  updateNotificationSettings: jest.fn().mockResolvedValue({
    pushNotifications: true,
    emailNotifications: false,
    smsNotifications: true
  }),

  // Location
  geocodeAddress: jest.fn().mockResolvedValue({
    latitude: 40.7128,
    longitude: -74.0060,
    formattedAddress: 'New York, NY, USA'
  }),

  getNearbyJobs: jest.fn().mockResolvedValue({
    jobs: [
      {
        id: 1,
        title: 'Nearby Plumbing Job',
        distance: 2.5,
        location: 'New York, NY'
      }
    ]
  }),

  // File Upload
  uploadFile: jest.fn().mockResolvedValue({
    url: 'https://example.com/uploaded-file.jpg',
    filename: 'uploaded-file.jpg'
  }),

  // Admin (for testing admin features)
  getAdminStats: jest.fn().mockResolvedValue({
    totalUsers: 1000,
    totalJobs: 500,
    totalBookings: 300,
    revenue: 50000
  }),

  getUsers: jest.fn().mockResolvedValue({
    users: [
      {
        id: 1,
        email: 'user1@example.com',
        role: 'client',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    total: 1
  }),

  // Error simulation methods for testing error handling
  simulateNetworkError: jest.fn().mockRejectedValue(new Error('Network error')),
  simulateServerError: jest.fn().mockRejectedValue(new Error('Server error')),
  simulateAuthError: jest.fn().mockRejectedValue(new Error('Unauthorized')),

  // Reset all mocks
  resetMocks: () => {
    Object.values(mockApiService).forEach(mock => {
      if (typeof mock === 'function' && mock.mockReset) {
        mock.mockReset();
      }
    });
  }
};