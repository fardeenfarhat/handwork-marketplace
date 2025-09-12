import { User, Job, WorkerProfile, ClientProfile, Message } from '@/types';
import { API_CONFIG } from '@/config/api';
import { withRetry, RetryError } from '@/utils/retry';

class ApiService {
  private baseURL = API_CONFIG.BASE_URL;
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    enableRetry: boolean = true
  ): Promise<T> {
    if (!enableRetry) {
      return this.request<T>(endpoint, options);
    }

    try {
      return await withRetry(() => this.request<T>(endpoint, options));
    } catch (error) {
      if (error instanceof RetryError) {
        console.log(`💥 Request failed after ${error.attempts} attempts`);
        throw new Error(error.message);
      }
      throw error;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('🌐 BASE (RAW):', API_CONFIG.RAW_BASE);
    console.log('🌐 BASE (WITH VERSION):', this.baseURL);
    console.log('⏱️ TIMEOUT:', API_CONFIG.REQUEST_TIMEOUT + 'ms');
    console.log('🔄 RETRY ATTEMPTS:', API_CONFIG.RETRY_ATTEMPTS);

    console.log('🚀 API REQUEST STARTING');
    console.log('📍 URL:', url);
    console.log('⚙️ Method:', options.method || 'GET');
    console.log('📦 Body:', options.body);
    console.log('🔑 Token:', this.token ? 'Present' : 'None');

    // Development mode: Check if we can reach the server quickly
    if (__DEV__) {
      try {
        // Quick connectivity check with a very short timeout
        const testController = new AbortController();
        const testTimeoutId = setTimeout(() => testController.abort(), 2000); // 2 second test
        
        await fetch(API_CONFIG.RAW_BASE + '/health', {
          method: 'GET',
          signal: testController.signal,
        });
        clearTimeout(testTimeoutId);
        console.log('✅ Server is reachable');
      } catch (error) {
        console.log('⚠️ Server unreachable, API calls will likely fail');
        console.log('💡 Make sure your backend server is running on:', API_CONFIG.RAW_BASE);
        // Continue with the request anyway - let it fail normally for proper error handling
      }
    }

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    console.log('🔧 Final Config:', JSON.stringify(config, null, 2));

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ REQUEST TIMEOUT - Aborting after 15 seconds');
      controller.abort();
    }, API_CONFIG.REQUEST_TIMEOUT);

    try {
      console.log('📡 Sending fetch request...');
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log('✅ Response received!');
      console.log('📊 Status:', response.status);
      console.log('📋 Status Text:', response.statusText);
      console.log(
        '🔍 Headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        console.log('❌ Response not OK, parsing error...');
        const error = await response
          .json()
          .catch(() => ({ message: 'Network error' }));
        console.log('💥 Error details:', error);
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      console.log('📥 Parsing response JSON...');
      const data = await response.json();
      console.log('✨ Response data:', JSON.stringify(data, null, 2));

      // Transform snake_case to camelCase for user objects
      if (data.user) {
        console.log('🔄 Transforming user data from backend format...');
        data.user = this.transformUserFromBackend(data.user);
        console.log(
          '✅ User data transformed:',
          JSON.stringify(data.user, null, 2)
        );
      }

      // Normalize auth responses that come wrapped as { user: {...}, token: { access_token, refresh_token, expires_in } }
      if (
        (endpoint === '/auth/login' || endpoint === '/auth/register') &&
        (data as any).token
      ) {
        const tokenObj = (data as any).token;
        if (tokenObj.access_token) {
          (data as any).access_token = tokenObj.access_token;
        }
        if (tokenObj.refresh_token) {
          (data as any).refresh_token = tokenObj.refresh_token;
        }
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.log('💥 REQUEST FAILED');
      console.log('🔥 Error type:', error?.name);
      console.log('📝 Error message:', error?.message);
      console.log('🔍 Full error:', error);

      if (error?.name === 'AbortError') {
        console.log('⏰ Request was aborted due to timeout');
        throw new Error(API_CONFIG.ERROR_MESSAGES.TIMEOUT);
      }

      // Handle network errors
      if (
        !navigator.onLine ||
        error?.message?.toLowerCase().includes('network')
      ) {
        throw new Error(API_CONFIG.ERROR_MESSAGES.NETWORK);
      }

      throw error;
    }
  }

  private transformUserFromBackend(backendUser: any): User {
    return {
      id: backendUser.id,
      email: backendUser.email,
      phone: backendUser.phone,
      role: backendUser.role,
      firstName: backendUser.first_name,
      lastName: backendUser.last_name,
      isVerified: backendUser.is_verified,
    };
  }

  // Auth endpoints
  async login(credentials: { email: string; password: string }) {
    return this.requestWithRetry<{
      access_token: string;
      refresh_token?: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'client' | 'worker';
    phone?: string;
  }) {
    console.log('🔐 REGISTER METHOD CALLED');
    console.log('👤 User Data:', JSON.stringify(userData, null, 2));

    // Convert camelCase to snake_case for backend compatibility
    const backendData = {
      email: userData.email,
      password: userData.password,
      first_name: userData.firstName,
      last_name: userData.lastName,
      role: userData.role,
      phone: userData.phone,
    };

    console.log(
      '🔄 Converted Backend Data:',
      JSON.stringify(backendData, null, 2)
    );
    console.log('📞 About to call this.request...');

    try {
      const result = await this.requestWithRetry<{
        access_token: string;
        refresh_token?: string;
        user: User;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(backendData),
      });
      // Ensure token is captured for subsequent authenticated requests
      if (result && (result as any).access_token) {
        this.setToken((result as any).access_token);
      }
      console.log('🎉 REGISTER SUCCESS!');
      console.log('✅ Registration result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.log('💥 REGISTER FAILED!');
      console.log('❌ Registration error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    return this.requestWithRetry<{ access_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async verifyEmail(token: string) {
    return this.request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async verifyPhone(code: string) {
    return this.request<{ message: string }>('/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async resendVerification(
    type: 'email' | 'phone',
    email?: string,
    phone?: string
  ) {
    if (type === 'email') {
      if (!email) {
        throw new Error('Email is required for email verification');
      }
      return this.request<{ message: string }>(
        '/auth/send-email-verification',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
    } else {
      if (!phone) {
        throw new Error('Phone is required for phone verification');
      }
      return this.request<{ message: string }>(
        '/auth/send-phone-verification',
        {
          method: 'POST',
          body: JSON.stringify({ phone }),
        }
      );
    }
  }

  async socialLogin(provider: string, token: string) {
    return this.request<{
      access_token: string;
      refresh_token?: string;
      user: User;
    }>(`/auth/oauth/${provider}`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // User endpoints
  async getProfile() {
    const response = await this.request<any>('/auth/me');
    return this.transformUserFromBackend(response);
  }

  async updateProfile(profileData: Partial<User>) {
    console.log(
      '🔧 API SERVICE: updateProfile called with:',
      JSON.stringify(profileData, null, 2)
    );

    // Transform camelCase to snake_case for backend compatibility
    const backendData: any = {};

    if (profileData.firstName !== undefined)
      backendData.first_name = profileData.firstName;
    if (profileData.lastName !== undefined)
      backendData.last_name = profileData.lastName;
    if (profileData.email !== undefined) backendData.email = profileData.email;
    if (profileData.phone !== undefined) backendData.phone = profileData.phone;
    if (profileData.role !== undefined) backendData.role = profileData.role;
    if (profileData.isVerified !== undefined)
      backendData.is_verified = profileData.isVerified;

    console.log(
      '🔧 API SERVICE: Transformed backend data:',
      JSON.stringify(backendData, null, 2)
    );

    const response = await this.request<any>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(backendData),
    });

    // Transform response back to camelCase
    return this.transformUserFromBackend(response);
  }

  // Worker Profile endpoints
  async getWorkerProfile() {
    try {
      return await this.request<WorkerProfile>('/users/worker-profile');
    } catch (error) {
      console.log('⚠️ Worker profile endpoint not available, using fallback');
      // Return a default profile structure if the endpoint doesn't exist
      throw new Error('Profile not found');
    }
  }

  async updateWorkerProfile(profileData: Partial<WorkerProfile>) {
    console.log(
      '🔧 API SERVICE: updateWorkerProfile called with:',
      JSON.stringify(profileData, null, 2)
    );

    // Transform camelCase to snake_case for backend compatibility
    const backendData: any = {};

    if (profileData.userId !== undefined)
      backendData.user_id = profileData.userId;
    if (profileData.bio !== undefined) backendData.bio = profileData.bio;
    if (profileData.skills !== undefined)
      backendData.skills = profileData.skills;
    if (profileData.serviceCategories !== undefined)
      backendData.service_categories = profileData.serviceCategories;
    if (profileData.hourlyRate !== undefined)
      backendData.hourly_rate = profileData.hourlyRate;
    if (profileData.location !== undefined)
      backendData.location = profileData.location;
    if (profileData.portfolioImages !== undefined)
      backendData.portfolio_images = profileData.portfolioImages;
    if (profileData.kycStatus !== undefined)
      backendData.kyc_status = profileData.kycStatus;
    if (profileData.rating !== undefined)
      backendData.rating = profileData.rating;
    if (profileData.totalJobs !== undefined)
      backendData.total_jobs = profileData.totalJobs;

    console.log(
      '🔧 API SERVICE: Transformed backend data:',
      JSON.stringify(backendData, null, 2)
    );

    return this.request<WorkerProfile>('/users/worker-profile', {
      method: 'PUT',
      body: JSON.stringify(backendData),
    });
  }

  async uploadKYCDocuments(formData: FormData) {
    return this.request('/users/kyc/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
  }

  async updatePortfolio(formData: FormData) {
    return this.request('/users/portfolio', {
      method: 'PUT',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
  }

  // Client Profile endpoints
  async getClientProfile() {
    try {
      return await this.request<ClientProfile>('/users/client-profile');
    } catch (error) {
      console.log('⚠️ Client profile endpoint not available, using fallback');
      // Return a default profile structure if the endpoint doesn't exist
      throw new Error('Profile not found');
    }
  }

  async updateClientProfile(profileData: Partial<ClientProfile>) {
    console.log(
      '🔧 API SERVICE: updateClientProfile called with:',
      JSON.stringify(profileData, null, 2)
    );

    // Transform camelCase to snake_case for backend compatibility
    const backendData: any = {};

    if (profileData.userId !== undefined)
      backendData.user_id = profileData.userId;
    if (profileData.companyName !== undefined)
      backendData.company_name = profileData.companyName;
    if (profileData.description !== undefined)
      backendData.description = profileData.description;
    if (profileData.location !== undefined)
      backendData.location = profileData.location;
    if (profileData.rating !== undefined)
      backendData.rating = profileData.rating;
    if (profileData.totalJobsPosted !== undefined)
      backendData.total_jobs_posted = profileData.totalJobsPosted;

    console.log(
      '🔧 API SERVICE: Transformed backend data:',
      JSON.stringify(backendData, null, 2)
    );

    return this.request<ClientProfile>('/users/client-profile', {
      method: 'PUT',
      body: JSON.stringify(backendData),
    });
  }

  // Job endpoints
  async getJobs(filters?: {
    category?: string;
    location?: string;
    budgetMin?: number;
    budgetMax?: number;
    radius?: number;
    userLatitude?: number;
    userLongitude?: number;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/jobs${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<Job[]>(endpoint);
  }

  async getJob(jobId: number) {
    return this.request<Job>(`/jobs/${jobId}`);
  }

  async createJob(
    jobData: Omit<Job, 'id' | 'clientId' | 'createdAt' | 'status'>
  ) {
    console.log(
      '🔧 API SERVICE: createJob called with:',
      JSON.stringify(jobData, null, 2)
    );

    // Transform camelCase to snake_case for backend compatibility
    const backendData = {
      title: jobData.title,
      description: jobData.description,
      category: jobData.category,
      budget_min: jobData.budgetMin,
      budget_max: jobData.budgetMax,
      location: jobData.location,
      latitude: jobData.latitude,
      longitude: jobData.longitude,
      preferred_date: jobData.preferredDate.replace('Z', ''), // Remove timezone info for backend compatibility
      requirements:
        jobData.requirements && jobData.requirements.length > 0
          ? jobData.requirements.reduce(
              (acc, req, index) => ({ ...acc, [index]: req }),
              {}
            )
          : {},
    };

    console.log(
      '🔧 API SERVICE: Transformed backend data:',
      JSON.stringify(backendData, null, 2)
    );

    return this.request<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }

  async updateJob(jobId: number, jobData: Partial<Job>) {
    return this.request<Job>(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
  }

  async applyToJob(
    jobId: number,
    applicationData: {
      message: string;
      proposedRate: number;
      proposedStartDate: string;
    }
  ) {
    return this.request(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  async deleteJob(jobId: number) {
    return this.request(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  // Client-specific job endpoints
  async getClientJobs() {
    return this.request<Job[]>('/jobs/client/posted');
  }

  async getClientApplications() {
    return this.request('/jobs/client/applications');
  }

  // Worker-specific job endpoints
  async getWorkerAppliedJobs() {
    return this.request<Job[]>('/jobs/worker/applied');
  }

  async getWorkerApplications() {
    return this.request('/jobs/worker/applications');
  }

  async getJobApplications(jobId: number) {
    return this.request(`/jobs/${jobId}/applications`);
  }

  async acceptJobApplication(applicationId: number) {
    return this.request(`/applications/${applicationId}/accept`, {
      method: 'POST',
    });
  }

  async rejectJobApplication(applicationId: number) {
    return this.request(`/applications/${applicationId}/reject`, {
      method: 'POST',
    });
  }

  async withdrawApplication(applicationId: number) {
    return this.request(`/applications/${applicationId}/withdraw`, {
      method: 'POST',
    });
  }

  // Message endpoints
  async getMessages(jobId: number) {
    return this.request<Message[]>(`/messages/job/${jobId}`);
  }

  async getConversations() {
    return this.request<any[]>('/messages/conversations');
  }

  async sendMessage(messageData: {
    receiverId: number;
    jobId: number;
    content: string;
    attachments?: string[];
  }) {
    return this.request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async markMessageAsRead(messageId: number) {
    return this.request(`/messages/${messageId}/read`, {
      method: 'PUT',
    });
  }

  async uploadMessageAttachment(formData: FormData) {
    return this.request<{ url: string }>('/messages/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
  }

  async searchMessages(query: string, jobId?: number) {
    const params = new URLSearchParams({ query });
    if (jobId) {
      params.append('jobId', jobId.toString());
    }
    return this.request<Message[]>(`/messages/search?${params}`);
  }

  // Payment endpoints
  async getPaymentMethods() {
    return this.request<any[]>('/payments/methods');
  }

  async addPaymentMethod(paymentMethodData: {
    type: 'card' | 'paypal' | 'bank_account';
    token: string;
    isDefault?: boolean;
  }) {
    return this.request('/payments/methods', {
      method: 'POST',
      body: JSON.stringify(paymentMethodData),
    });
  }

  async deletePaymentMethod(paymentMethodId: string) {
    return this.request(`/payments/methods/${paymentMethodId}`, {
      method: 'DELETE',
    });
  }

  async setDefaultPaymentMethod(paymentMethodId: string) {
    return this.request(`/payments/methods/${paymentMethodId}/default`, {
      method: 'PUT',
    });
  }

  async getPaymentHistory() {
    return this.request<any[]>('/payments/history');
  }

  async processPayment(paymentData: {
    bookingId: number;
    paymentMethodId: string;
    amount: number;
  }) {
    return this.request('/payments/process', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Booking endpoints
  async createBooking(bookingData: {
    jobId: number;
    workerId: number;
    startDate: string;
    agreedRate: number;
  }) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getBooking(bookingId: number) {
    return this.request(`/bookings/${bookingId}`);
  }

  async getBookings(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<any[]>(`/bookings${params}`);
  }

  async updateBookingStatus(bookingId: number, status: string, notes?: string) {
    return this.request(`/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  async completeBooking(
    bookingId: number,
    completionData: {
      notes: string;
      photos: string[];
    }
  ) {
    return this.request(`/bookings/${bookingId}/complete`, {
      method: 'POST',
      body: JSON.stringify(completionData),
    });
  }

  async getBookingTimeline(bookingId: number) {
    return this.request<any[]>(`/bookings/${bookingId}/timeline`);
  }

  async uploadCompletionPhoto(formData: FormData) {
    return this.request<{ url: string }>('/bookings/upload-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
  }

  // Dispute endpoints
  async createDispute(disputeData: {
    bookingId: number;
    type: string;
    description: string;
    evidence: string[];
  }) {
    return this.request('/disputes', {
      method: 'POST',
      body: JSON.stringify(disputeData),
    });
  }

  async getDispute(disputeId: number) {
    return this.request(`/disputes/${disputeId}`);
  }

  async getDisputes() {
    return this.request<any[]>('/disputes');
  }

  async uploadDisputeEvidence(formData: FormData) {
    return this.request<{ url: string }>('/disputes/upload-evidence', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
  }

  // Review endpoints
  async getReviews(filters?: {
    userId?: number;
    rating?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/reviews${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async getReview(reviewId: number) {
    return this.request(`/reviews/${reviewId}`);
  }

  async submitReview(reviewData: {
    bookingId: number;
    revieweeId: number;
    rating: number;
    comment: string;
  }) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  async reportReview(reviewId: number, reason: string) {
    return this.request(`/reviews/${reviewId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async respondToReview(reviewId: number, response: string) {
    return this.request(`/reviews/${reviewId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
  }

  async moderateReview(
    reviewId: number,
    action: 'approve' | 'reject',
    note?: string
  ) {
    return this.request(`/reviews/${reviewId}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });
  }

  async getRatingSummary(userId: number) {
    return this.request(`/reviews/rating-summary/${userId}`);
  }

  // Additional methods needed by offline sync
  async getUnreadMessageCount() {
    return this.request<number>('/messages/unread-count');
  }

  async updateReview(reviewId: number, reviewData: any) {
    return this.request(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  }

  async createReview(reviewData: any) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  async updateBooking(bookingId: number, bookingData: any) {
    return this.request(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    });
  }

  // Notification badge methods
  async getNotificationCounts() {
    return this.request('/notifications/counts');
  }

  // Edit review method
  async editReview(
    reviewId: number,
    reviewData: { rating: number; comment: string }
  ) {
    return this.request(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  }

  // Delete review method
  async deleteReview(reviewId: number) {
    return this.request(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }

  // Portfolio methods
  async getPortfolio() {
    return this.request('/users/portfolio');
  }

  // KYC methods
  async getKYCStatus() {
    return this.request('/users/kyc/status');
  }
}

export const apiService = new ApiService();
export default apiService;
