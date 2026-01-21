import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';
import { mockApiService } from './mockApiService';

// Toggle this to switch between mock and real API
const USE_MOCK_API = true;

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
    if (USE_MOCK_API) {
      return mockApiService.setAuthToken(token);
    }
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    if (USE_MOCK_API) {
      return mockApiService.login(email, password);
    }
    const response = await this.api.post('/auth/login', { email, password });
    const data = response.data;
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
    if (USE_MOCK_API) {
      return mockApiService.getCurrentAdmin();
    }
    const response = await this.api.get('/admin/me');
    return response.data;
  }

  // User management
  async getUsers(params: any) {
    if (USE_MOCK_API) {
      return mockApiService.getUsers(params);
    }
    const response = await this.api.get('/admin/users', { params });
    return response.data;
  }

  async getUserDetail(userId: number) {
    if (USE_MOCK_API) {
      return mockApiService.getUserDetail(userId);
    }
    const response = await this.api.get(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUserStatus(userId: number, action: string, reason?: string) {
    if (USE_MOCK_API) {
      return mockApiService.updateUserStatus(userId, action, reason);
    }
    const response = await this.api.post(`/admin/users/${userId}/actions`, { action, reason });
    return response.data;
  }

  // Job management
  async getJobs(params: any) {
    if (USE_MOCK_API) {
      return mockApiService.getJobs(params);
    }
    const response = await this.api.get('/admin/jobs', { params });
    return response.data;
  }

  async getJobDetail(jobId: number) {
    if (USE_MOCK_API) {
      return mockApiService.getJobDetail(jobId);
    }
    const response = await this.api.get(`/admin/jobs/${jobId}`);
    return response.data;
  }

  // Payment management
  async getPayments(params: any) {
    if (USE_MOCK_API) {
      return mockApiService.getPayments(params);
    }
    const response = await this.api.get('/admin/payments', { params });
    return response.data;
  }

  async processPayout(payoutId: number) {
    if (USE_MOCK_API) {
      return mockApiService.processPayout(payoutId);
    }
    const response = await this.api.post(`/admin/payouts/${payoutId}/process`);
    return response.data;
  }

  async triggerAutomaticPayouts() {
    if (USE_MOCK_API) {
      return mockApiService.triggerAutomaticPayouts();
    }
    const response = await this.api.post('/admin/payouts/auto-process');
    return response.data;
  }

  // Dispute management
  async getDisputes(params: any) {
    if (USE_MOCK_API) {
      return mockApiService.getDisputes(params);
    }
    const response = await this.api.get('/admin/disputes', { params });
    return response.data;
  }

  // Analytics
  async getPlatformMetrics() {
    if (USE_MOCK_API) {
      return mockApiService.getPlatformMetrics();
    }
    const response = await this.api.get('/admin/analytics/metrics');
    return response.data;
  }

  async getJobCategoriesStats() {
    if (USE_MOCK_API) {
      return mockApiService.getJobCategoriesStats();
    }
    const response = await this.api.get('/admin/analytics/job-categories');
    return response.data;
  }

  // Content moderation
  async getReviewsForModeration(params: any) {
    if (USE_MOCK_API) {
      return mockApiService.getReviewsForModeration(params);
    }
    const response = await this.api.get('/admin/moderation/reviews', { params });
    return response.data;
  }

  async getReviewDetail(reviewId: number) {
    if (USE_MOCK_API) {
      return mockApiService.getReviewDetail(reviewId);
    }
    const response = await this.api.get(`/admin/moderation/reviews/${reviewId}`);
    return response.data;
  }

  async moderateReview(reviewId: number, action: string, reason?: string) {
    if (USE_MOCK_API) {
      return mockApiService.moderateReview(reviewId, action, reason);
    }
    const response = await this.api.post(`/admin/moderation/reviews/${reviewId}/actions`, { action, reason });
    return response.data;
  }

  async getKYCDocuments(params: any) {
    if (USE_MOCK_API) {
      return mockApiService.getKYCDocuments(params);
    }
    const response = await this.api.get('/admin/moderation/kyc', { params });
    return response.data;
  }

  async processKYC(workerProfileId: number, action: string, reason?: string) {
    if (USE_MOCK_API) {
      return mockApiService.processKYC(workerProfileId, action, reason);
    }
    const response = await this.api.post(`/admin/moderation/kyc/${workerProfileId}/actions`, { action, reason });
    return response.data;
  }
}

export const apiService = new ApiService();
