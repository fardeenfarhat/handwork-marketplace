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
        // For retry errors, preserve the original error details if available
        if (error.lastError?.status || error.lastError?.statusCode) {
          throw error.lastError;
        }
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

    // Check if body is FormData - if so, don't set Content-Type (let browser handle it)
    const isFormData = options.body instanceof FormData;
    
    const config: RequestInit = {
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
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
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP ${response.status}` }));
        console.log('💥 Error details:', errorData);
        
        // Create an error that preserves the response status and data
        const apiError: any = new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        apiError.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        };
        apiError.status = response.status;
        apiError.statusCode = response.status;
        
        throw apiError;
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

      // Handle network errors - but only if error doesn't have status code (real network issues)
      if (
        (!navigator.onLine && !error?.status && !error?.statusCode) ||
        (error?.message?.toLowerCase().includes('network') && !error?.status && !error?.statusCode)
      ) {
        throw new Error(API_CONFIG.ERROR_MESSAGES.NETWORK);
      }

      // If error has status code, preserve it (it's a proper HTTP error)
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
      emailVerified: backendUser.email_verified,
      phoneVerified: backendUser.phone_verified,
      isActive: backendUser.is_active,
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
    // Extract documents from FormData and upload them individually
    const documents: Array<{ file: any; type: string }> = [];
    
    // Parse the FormData to extract document info
    const parts = (formData as any)._parts || [];
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i][0].startsWith('document_') && !parts[i][0].includes('_type')) {
        const fileData = parts[i][1];
        const typeData = parts[i + 1] && parts[i + 1][1];
        
        if (fileData && typeData) {
          documents.push({
            file: fileData,
            type: typeData
          });
        }
      }
    }

    // Upload each document individually
    const results = [];
    for (const doc of documents) {
      const singleFormData = new FormData();
      singleFormData.append('file', {
        uri: doc.file.uri,
        type: doc.file.type,
        name: doc.file.name,
      } as any);
      singleFormData.append('document_type', doc.type);

      const result = await this.request('/profiles/upload/kyc-document', {
        method: 'POST',
        headers: {
          // Don't set Content-Type for FormData - let the browser set it with boundary
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
        body: singleFormData,
      });
      
      results.push(result);
    }

    return { results, status: 'pending' };
  }

  async updatePortfolio(formData: FormData) {
    // Extract images from FormData and upload them individually
    const images: Array<any> = [];
    
    // Parse the FormData to extract image info
    const parts = (formData as any)._parts || [];
    for (const [key, value] of parts) {
      if (key.startsWith('image_')) {
        images.push(value);
      }
    }

    // Upload each image individually
    const results = [];
    for (const imageData of images) {
      const singleFormData = new FormData();
      singleFormData.append('file', {
        uri: imageData.uri,
        type: imageData.type,
        name: imageData.name,
      } as any);

      const result = await this.request('/profiles/upload/portfolio-image', {
        method: 'POST',
        headers: {
          // Don't set Content-Type for FormData - let the browser set it with boundary
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
        body: singleFormData,
      });
      
      results.push(result);
    }

    return { results };
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

  // Profile View endpoints (for viewing other users' profiles)
  async getWorkerProfileById(userId: number) {
    try {
      return await this.request<WorkerProfile>(`/users/${userId}/worker-profile`);
    } catch (error) {
      console.log('⚠️ Worker profile by ID endpoint not available');
      throw new Error('Worker profile not found');
    }
  }

  async getClientProfileById(userId: number) {
    try {
      return await this.request<ClientProfile>(`/users/${userId}/client-profile`);
    } catch (error) {
      console.log('⚠️ Client profile by ID endpoint not available');
      throw new Error('Client profile not found');
    }
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

    const endpoint = `/jobs/${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await this.request<{
      jobs: any[];
      total: number;
      page: number;
      limit: number;
      has_next: boolean;
    }>(endpoint);

    console.log('🔍 RAW API RESPONSE:', JSON.stringify(response, null, 2));

    // Transform snake_case API response to camelCase for frontend
    const transformedJobs: Job[] = response.jobs.map((job: any) => ({
      id: job.id,
      clientId: job.client_id,
      title: job.title,
      description: job.description,
      category: job.category,
      budgetMin: parseFloat(job.budget_min),
      budgetMax: parseFloat(job.budget_max),
      location: job.location,
      latitude: job.latitude,
      longitude: job.longitude,
      preferredDate: job.preferred_date,
      status: job.status,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      requirements: job.requirements ? Object.values(job.requirements) : undefined,
      clientName: job.client_name,
      clientRating: job.client_rating,
      applicationsCount: job.application_count,
      distance: job.distance_km,
    }));

    console.log('🔍 TRANSFORMED JOBS (getJobs):', JSON.stringify(transformedJobs, null, 2));
    console.log('🔍 JOBS COUNT (getJobs):', transformedJobs.length);

    return transformedJobs;
  }

  async getJob(jobId: number) {
    const job = await this.request<any>(`/jobs/${jobId}`);
    
    // Transform snake_case API response to camelCase for frontend
    return {
      id: job.id,
      clientId: job.client_id,
      title: job.title,
      description: job.description,
      category: job.category,
      budgetMin: parseFloat(job.budget_min),
      budgetMax: parseFloat(job.budget_max),
      location: job.location,
      latitude: job.latitude,
      longitude: job.longitude,
      preferredDate: job.preferred_date,
      status: job.status,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      requirements: job.requirements ? Object.values(job.requirements) : undefined,
      clientName: job.client_name,
      clientRating: job.client_rating,
      applicationsCount: job.application_count,
      distance: job.distance_km,
    } as Job;
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

    return this.request<Job>('/jobs/', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }

  async updateJob(jobId: number, jobData: any) {
    // Convert camelCase to snake_case and transform requirements
    const backendData: any = {};
    
    if (jobData.title !== undefined) backendData.title = jobData.title;
    if (jobData.description !== undefined) backendData.description = jobData.description;
    if (jobData.category !== undefined) backendData.category = jobData.category;
    if (jobData.budgetMin !== undefined) backendData.budget_min = jobData.budgetMin;
    if (jobData.budgetMax !== undefined) backendData.budget_max = jobData.budgetMax;
    if (jobData.location !== undefined) backendData.location = jobData.location;
    if (jobData.preferredDate !== undefined) backendData.preferred_date = jobData.preferredDate;
    
    // Transform requirements array to dict if present
    if (jobData.requirements !== undefined) {
      if (Array.isArray(jobData.requirements)) {
        backendData.requirements = jobData.requirements.reduce((acc: any, req: string, index: number) => {
          acc[index.toString()] = req;
          return acc;
        }, {});
      } else {
        backendData.requirements = jobData.requirements;
      }
    }

    return this.request<Job>(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(backendData),
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
    // Convert camelCase to snake_case for backend compatibility
    const backendData = {
      message: applicationData.message,
      proposed_rate: applicationData.proposedRate,
      proposed_start_date: applicationData.proposedStartDate,
    };

    return this.request(`/jobs/${jobId}/applications`, {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }

  async deleteJob(jobId: number) {
    return this.request(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  // Application management endpoints
  async acceptApplication(applicationId: number) {
    return this.request(`/jobs/applications/${applicationId}/accept`, {
      method: 'PATCH',
    });
  }

  async rejectApplication(applicationId: number) {
    return this.request(`/jobs/applications/${applicationId}/reject`, {
      method: 'PATCH',
    });
  }

  // Client-specific job endpoints
  async getClientJobs() {
    const response = await this.request<{
      jobs: any[];
      total: number;
      page: number;
      limit: number;
      has_next: boolean;
    }>('/jobs/client/posted');

    // Transform snake_case API response to camelCase for frontend
    const transformedJobs: Job[] = response.jobs.map((job: any) => ({
      id: job.id,
      clientId: job.client_id,
      title: job.title,
      description: job.description,
      category: job.category,
      budgetMin: parseFloat(job.budget_min),
      budgetMax: parseFloat(job.budget_max),
      location: job.location,
      latitude: job.latitude,
      longitude: job.longitude,
      preferredDate: job.preferred_date,
      status: job.status,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      requirements: job.requirements ? Object.values(job.requirements) : undefined,
      clientName: job.client_name,
      clientRating: job.client_rating,
      applicationsCount: job.application_count,
      distance: job.distance_km,
    }));

    return transformedJobs;
  }

  async getClientApplications() {
    const response = await this.request<{
      applications: any[];
      total: number;
    }>('/jobs/client/applications');

    // Transform snake_case API response to camelCase for frontend
    const transformedApplications = response.applications.map((app: any) => ({
      id: app.id,
      jobId: app.job_id,
      workerId: app.worker_id,
      message: app.message,
      proposedRate: parseFloat(app.proposed_rate) || 0,
      proposedStartDate: app.proposed_start_date,
      status: app.status,
      createdAt: app.created_at,
      workerName: app.worker_name,
      workerRating: app.worker_rating || 0,
      workerSkills: app.worker_skills || [],
    }));

    return transformedApplications;
  }

  // Worker-specific job endpoints
  async getWorkerAppliedJobs() {
    // Since there's no direct endpoint for jobs a worker applied to,
    // we'll get the worker's applications and extract unique job info
    try {
      const applications = await this.getWorkerApplications();
      
      // Get unique job IDs from applications
      const jobIds = [...new Set(applications.map(app => app.jobId))];
      
      // Fetch job details for each applied job
      const jobPromises = jobIds.map(jobId => this.getJob(jobId));
      const jobs = await Promise.all(jobPromises);
      
      return jobs;
    } catch (error) {
      console.log('Failed to get worker applied jobs:', error);
      return [];
    }
  }

  async getWorkerApplications() {
    const response = await this.request<{
      applications: any[];
      total: number;
    }>('/jobs/applications/my');

    // Transform snake_case API response to camelCase for frontend
    const transformedApplications = response.applications.map((app: any) => ({
      id: app.id,
      jobId: app.job_id,
      workerId: app.worker_id,
      message: app.message,
      proposedRate: parseFloat(app.proposed_rate) || 0,
      proposedStartDate: app.proposed_start_date,
      status: app.status,
      createdAt: app.created_at,
      workerName: app.worker_name,
      workerRating: app.worker_rating || 0,
      workerSkills: app.worker_skills || [],
    }));

    return transformedApplications;
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
    return this.request(`/jobs/applications/${applicationId}/withdraw`, {
      method: 'PATCH',
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
        // Don't set Content-Type for FormData - let the browser set it with boundary
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
    const booking = await this.request<any>(`/bookings/${bookingId}`);
    
    // Transform snake_case to camelCase
    return {
      id: booking.id,
      jobId: booking.job_id,
      workerId: booking.worker_id,
      clientId: booking.client_id,
      workerName: booking.worker_name,
      clientName: booking.client_name,
      jobTitle: booking.job_title,
      jobDescription: booking.job_description,
      jobCategory: booking.job_category,
      startDate: booking.start_date,
      endDate: booking.end_date,
      agreedRate: booking.agreed_rate,
      status: booking.status,
      completionNotes: booking.completion_notes,
      completionPhotos: booking.completion_photos || [],
      createdAt: booking.created_at,
      workerRating: booking.worker_rating,
      payment: booking.payment,
      hasUserReview: booking.has_user_review,
      clientUserId: booking.client_user_id,
      workerUserId: booking.worker_user_id
    };
  }

  async getBookings(status?: string) {
    const params = status ? `?status=${status}` : '';
    const response = await this.request<{bookings: any[], total: number, page: number, per_page: number}>(`/bookings${params}`);
    
    // Transform snake_case to camelCase for bookings
    const transformedBookings = (response?.bookings || []).map((booking: any) => ({
      id: booking.id,
      jobId: booking.job_id,
      workerId: booking.worker_id,
      clientId: booking.client_id,
      workerName: booking.worker_name,
      clientName: booking.client_name,
      jobTitle: booking.job_title,
      jobDescription: booking.job_description,
      jobCategory: booking.job_category,
      startDate: booking.start_date,
      endDate: booking.end_date,
      agreedRate: booking.agreed_rate,
      status: booking.status,
      completionNotes: booking.completion_notes,
      completionPhotos: booking.completion_photos || [],
      createdAt: booking.created_at,
      workerRating: booking.worker_rating,
      payment: booking.payment,
      hasUserReview: booking.has_user_review,
      clientUserId: booking.client_user_id,
      workerUserId: booking.worker_user_id
    }));

    return transformedBookings;
  }

  async updateBookingStatus(bookingId: number, status: string, notes?: string) {
    return this.request(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
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
    return this.request(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'COMPLETED',
        completion_notes: completionData.notes,
        completion_photos: completionData.photos
      }),
    });
  }

  async getBookingTimeline(bookingId: number) {
    return this.request<any[]>(`/bookings/${bookingId}/timeline`);
  }

  async uploadCompletionPhoto(bookingId: number, formData: FormData) {
    return this.request<{ url: string }>(`/bookings/${bookingId}/completion-photos`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData - let the browser set it with boundary
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
  }

  async reportBookingIssue(bookingId: number, reportData: {
    issueType: string;
    description: string;
    reportedBy: number;
  }) {
    return this.request(`/bookings/${bookingId}/report`, {
      method: 'POST',
      body: JSON.stringify(reportData),
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
        // Don't set Content-Type for FormData - let the browser set it with boundary
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
  }

  // Review endpoints
  async getReviews(filters?: {
    reviewee_id?: number;
    reviewer_id?: number;
    booking_id?: number;
    rating?: number;
    status?: string;
    page?: number;
    per_page?: number;
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
    const response = await this.request<{
      reviews: any[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>(endpoint);

    // Transform snake_case API response to camelCase for frontend
    const transformedReviews = response.reviews.map((review: any) => ({
      id: review.id,
      bookingId: review.booking_id,
      reviewerId: review.reviewer_id,
      revieweeId: review.reviewee_id,
      reviewerName: review.reviewer_name,
      revieweeName: review.reviewee_name || 'Unknown User', // Fallback if not provided
      jobTitle: review.job_title,
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      response: review.response,
      isReported: review.is_reported || false,
      reportReason: review.report_reason,
    }));

    return {
      ...response,
      reviews: transformedReviews
    };
  }

  async getReview(reviewId: number) {
    const review = await this.request(`/reviews/${reviewId}`);
    
    // Transform snake_case API response to camelCase for frontend
    return {
      id: review.id,
      bookingId: review.booking_id,
      reviewerId: review.reviewer_id,
      revieweeId: review.reviewee_id,
      reviewerName: review.reviewer_name || 'Unknown User',
      revieweeName: review.reviewee_name || 'Unknown User',
      jobTitle: review.job_title,
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      response: review.response,
      isReported: review.is_reported || false,
      reportReason: review.report_reason,
    };
  }

  async submitReview(reviewData: {
    bookingId: number;
    revieweeId?: number;  // Optional since backend auto-determines
    rating: number;
    comment: string;
  }) {
    // Convert camelCase to snake_case for backend compatibility
    const backendData = {
      booking_id: reviewData.bookingId,
      rating: reviewData.rating,
      comment: reviewData.comment,
      // Only include reviewee_id if provided (for backwards compatibility)
      ...(reviewData.revieweeId && { reviewee_id: reviewData.revieweeId })
    };
    
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }

  async reportReview(reviewId: number, reason: string) {
    return this.request(`/reviews/${reviewId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
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

  async getDashboardData(): Promise<any> {
    return this.request('/dashboard', { method: 'GET' });
  }

  async getUserReviewCount(userId: number): Promise<number> {
    try {
      // Use the same pattern as ReviewsListScreen: get all reviews for user as reviewee
      const reviewsData = await this.getReviews({ 
        reviewee_id: userId,
        status: 'approved' 
      });
      // Return the count of reviews
      return reviewsData.reviews?.length || 0;
    } catch (error) {
      console.error('Error getting user review count:', error);
      return 0;
    }
  }

  async getUserPublicInfo(userId: number) {
    try {
      // Try to get basic user information - this endpoint may not exist yet
      // but we'll try it in case it gets implemented later
      return await this.request(`/users/${userId}/public`);
    } catch (error) {
      console.log('⚠️ User public info endpoint not available');
      // Fallback: try to get user info from other endpoints
      throw new Error('User public information not available');
    }
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
    // Convert camelCase to snake_case for backend compatibility if needed
    const backendData = {
      booking_id: reviewData.bookingId || reviewData.booking_id,
      reviewee_id: reviewData.revieweeId || reviewData.reviewee_id,
      rating: reviewData.rating,
      comment: reviewData.comment,
    };
    
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }

  async updateBooking(bookingId: number, bookingData: any) {
    return this.request(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    });
  }

  // Notification methods
  async getNotificationCounts() {
    return this.request('/notifications/badge-count');
  }

  async getUnreadNotifications(limit: number = 50) {
    return this.request(`/notifications/unread?limit=${limit}`);
  }

  async getNotificationHistory(limit: number = 100, offset: number = 0) {
    return this.request(`/notifications/history?limit=${limit}&offset=${offset}`);
  }

  async markNotificationsAsRead(notificationIds: number[]) {
    return this.request('/notifications/mark-read', {
      method: 'PUT',
      body: JSON.stringify(notificationIds),
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  async getNotificationPreferences() {
    return this.request('/notifications/preferences');
  }

  async updateNotificationPreferences(preferences: any) {
    return this.request('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async clearNotificationHistory() {
    return this.request('/notifications/clear-history', {
      method: 'DELETE',
    });
  }

  async registerFCMToken(token: string, platform: string = 'mobile') {
    return this.request('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  }

  async unregisterFCMToken(token: string) {
    return this.request('/notifications/unregister-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
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
    const profile = await this.request<any>('/users/worker-profile');
    return {
      portfolioImages: (profile as any)?.portfolioImages || []
    };
  }

  // KYC methods
  async getKYCStatus() {
    return this.request('/users/kyc/status');
  }

  // Bank Account methods for workers
  async getWorkerBankAccount() {
    return this.request('/profiles/worker/bank-account');
  }

  async addWorkerBankAccount(bankData: {
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    routing_number: string;
    bank_country: string;
    bank_currency: string;
  }) {
    // Backend expects form data, not JSON
    const formData = new FormData();
    formData.append('account_holder_name', bankData.account_holder_name);
    formData.append('bank_name', bankData.bank_name);
    formData.append('account_number', bankData.account_number);
    formData.append('routing_number', bankData.routing_number);
    formData.append('bank_country', bankData.bank_country);
    formData.append('bank_currency', bankData.bank_currency);

    return this.request('/profiles/worker/bank-account', {
      method: 'POST',
      body: formData as any,
    });
  }

  async deleteWorkerBankAccount() {
    return this.request('/profiles/worker/bank-account', {
      method: 'DELETE',
    });
  }

  // Stripe Connect methods for workers
  async getWorkerStripeAccount() {
    return this.request('/payments/stripe-connect/account');
  }

  async createStripeOnboardingLink() {
    return this.request('/payments/stripe-connect/onboard', {
      method: 'POST',
    });
  }

  async refreshStripeAccountLink() {
    return this.request('/payments/stripe-connect/refresh-link', {
      method: 'POST',
    });
  }

  async disconnectStripeAccount() {
    return this.request('/payments/stripe-connect/account', {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
export default apiService;
