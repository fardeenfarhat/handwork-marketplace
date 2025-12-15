import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string | null) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    // Backend expects { email, password }
    const response = await this.api.post('/auth/login', {
      email,
      password,
    });
    const data = response.data;
    // Normalize shape for AuthContext (expects access_token at top level)
    return {
      access_token: data?.token?.access_token,
      refresh_token: data?.token?.refresh_token,
      expires_in: data?.token?.expires_in,
      token_type: data?.token?.token_type || 'bearer',
      user: data?.user,
      raw: data,
    };
  }

  async getCurrentAdmin() {
    const response = await this.api.get('/admin/me');
    return response.data;
  }

  // User management
  async getUsers(params: {
    page?: number;
    size?: number;
    role?: string;
    is_verified?: boolean;
    is_active?: boolean;
    search?: string;
  }) {
    const response = await this.api.get('/admin/users', { params });
    return response.data;
  }

  async getUserDetail(userId: number) {
    const response = await this.api.get(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUserStatus(userId: number, action: string, reason?: string) {
    const response = await this.api.post(`/admin/users/${userId}/actions`, {
      action,
      reason,
    });
    return response.data;
  }

  // Job management
  async getJobs(params: {
    page?: number;
    size?: number;
    status?: string;
    category?: string;
    search?: string;
    min_budget?: number;
    max_budget?: number;
  }) {
    const response = await this.api.get('/admin/jobs', { params });
    return response.data;
  }

  async getJobDetail(jobId: number) {
    const response = await this.api.get(`/admin/jobs/${jobId}`);
    return response.data;
  }

  // Payment management
  async getPayments(params: {
    page?: number;
    size?: number;
    status?: string;
    payment_method?: string;
    min_amount?: number;
    max_amount?: number;
  }) {
    const response = await this.api.get('/admin/payments', { params });
    return response.data;
  }

  async processPayout(payoutId: number) {
    const response = await this.api.post(`/admin/payouts/${payoutId}/process`);
    return response.data;
  }

  async triggerAutomaticPayouts() {
    const response = await this.api.post('/admin/payouts/auto-process');
    return response.data;
  }

  // Dispute management
  async getDisputes(params: {
    page?: number;
    size?: number;
    status?: string;
  }) {
    const response = await this.api.get('/admin/disputes', { params });
    return response.data;
  }

  // Analytics
  async getPlatformMetrics() {
    const response = await this.api.get('/admin/analytics/metrics');
    return response.data;
  }

  async getJobCategoriesStats() {
    const response = await this.api.get('/admin/analytics/job-categories');
    return response.data;
  }

  // Content moderation
  async getReviewsForModeration(params: {
    page?: number;
    size?: number;
    status?: string;
    min_rating?: number;
    max_rating?: number;
  }) {
    const response = await this.api.get('/admin/moderation/reviews', { params });
    return response.data;
  }

  async getReviewDetail(reviewId: number) {
    const response = await this.api.get(`/admin/moderation/reviews/${reviewId}`);
    return response.data;
  }

  async moderateReview(reviewId: number, action: string, reason?: string) {
    const response = await this.api.post(`/admin/moderation/reviews/${reviewId}/actions`, {
      action,
      reason,
    });
    return response.data;
  }

  async getKYCDocuments(params: { page?: number; size?: number }) {
    const response = await this.api.get('/admin/moderation/kyc', { params });
    return response.data;
  }

  async processKYC(workerProfileId: number, action: string, reason?: string) {
    const response = await this.api.post(`/admin/moderation/kyc/${workerProfileId}/actions`, {
      action,
      reason,
    });
    return response.data;
  }
}

export const apiService = new ApiService();