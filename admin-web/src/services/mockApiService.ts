// Mock API Service with hardcoded data for testing

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Data
const mockUsers = [
  { id: 1, email: 'john@example.com', full_name: 'John Doe', role: 'client', is_verified: true, is_active: true, created_at: '2024-01-15', phone: '+1234567890' },
  { id: 2, email: 'jane@example.com', full_name: 'Jane Smith', role: 'worker', is_verified: true, is_active: true, created_at: '2024-02-20', phone: '+1234567891' },
  { id: 3, email: 'bob@example.com', full_name: 'Bob Johnson', role: 'client', is_verified: false, is_active: true, created_at: '2024-03-10', phone: '+1234567892' },
  { id: 4, email: 'alice@example.com', full_name: 'Alice Williams', role: 'worker', is_verified: true, is_active: false, created_at: '2024-01-25', phone: '+1234567893' },
  { id: 5, email: 'charlie@example.com', full_name: 'Charlie Brown', role: 'client', is_verified: true, is_active: true, created_at: '2024-04-05', phone: '+1234567894' },
];

const mockJobs = [
  { id: 1, title: 'Website Development', description: 'Need a responsive website', category: 'Web Development', status: 'open', budget: 5000, min_budget: 4000, max_budget: 6000, client_id: 1, client_name: 'John Doe', created_at: '2024-05-01' },
  { id: 2, title: 'Logo Design', description: 'Creative logo needed', category: 'Design', status: 'in_progress', budget: 500, min_budget: 400, max_budget: 600, client_id: 3, client_name: 'Bob Johnson', created_at: '2024-05-05' },
  { id: 3, title: 'Mobile App', description: 'iOS and Android app', category: 'Mobile Development', status: 'completed', budget: 10000, min_budget: 8000, max_budget: 12000, client_id: 5, client_name: 'Charlie Brown', created_at: '2024-04-20' },
  { id: 4, title: 'Content Writing', description: 'Blog posts needed', category: 'Writing', status: 'open', budget: 300, min_budget: 250, max_budget: 400, client_id: 1, client_name: 'John Doe', created_at: '2024-05-10' },
  { id: 5, title: 'SEO Optimization', description: 'Improve website ranking', category: 'Marketing', status: 'in_progress', budget: 1500, min_budget: 1200, max_budget: 1800, client_id: 3, client_name: 'Bob Johnson', created_at: '2024-05-08' },
  { id: 6, title: 'E-commerce Platform', description: 'Full-featured online store', category: 'Web Development', status: 'open', budget: 15000, min_budget: 12000, max_budget: 18000, client_id: 5, client_name: 'Charlie Brown', created_at: '2024-05-12' },
  { id: 7, title: 'Brand Identity Package', description: 'Complete branding solution', category: 'Design', status: 'completed', budget: 2500, min_budget: 2000, max_budget: 3000, client_id: 1, client_name: 'John Doe', created_at: '2024-04-15' },
  { id: 8, title: 'Video Editing', description: 'YouTube content editing', category: 'Video Production', status: 'in_progress', budget: 800, min_budget: 600, max_budget: 1000, client_id: 3, client_name: 'Bob Johnson', created_at: '2024-05-14' },
];

const mockPayments = [
  { id: 1, amount: 5000, platform_fee: 500, worker_amount: 4500, status: 'completed', payment_method: 'stripe', created_at: '2024-05-15', job_id: 1, job_title: 'Website Development', client_name: 'John Doe', worker_name: 'Jane Smith', booking_id: 'BK001' },
  { id: 2, amount: 500, platform_fee: 50, worker_amount: 450, status: 'pending', payment_method: 'paypal', created_at: '2024-05-16', job_id: 2, job_title: 'Logo Design', client_name: 'Bob Johnson', worker_name: 'Jane Smith', booking_id: 'BK002' },
  { id: 3, amount: 10000, platform_fee: 1000, worker_amount: 9000, status: 'completed', payment_method: 'stripe', created_at: '2024-05-10', job_id: 3, job_title: 'Mobile App', client_name: 'Charlie Brown', worker_name: 'Alice Williams', booking_id: 'BK003' },
  { id: 4, amount: 300, platform_fee: 30, worker_amount: 270, status: 'failed', payment_method: 'stripe', created_at: '2024-05-17', job_id: 4, job_title: 'Content Writing', client_name: 'John Doe', worker_name: 'Jane Smith', booking_id: 'BK004' },
  { id: 5, amount: 1500, platform_fee: 150, worker_amount: 1350, status: 'completed', payment_method: 'stripe', created_at: '2024-05-18', job_id: 5, job_title: 'SEO Optimization', client_name: 'Bob Johnson', worker_name: 'Alice Williams', booking_id: 'BK005' },
  { id: 6, amount: 15000, platform_fee: 1500, worker_amount: 13500, status: 'pending', payment_method: 'stripe', created_at: '2024-05-19', job_id: 6, job_title: 'E-commerce Platform', client_name: 'Charlie Brown', worker_name: 'Jane Smith', booking_id: 'BK006' },
];

const mockDisputes = [
  { id: 1, job_id: 2, job_title: 'Logo Design', client_name: 'Bob Johnson', worker_name: 'Jane Smith', status: 'open', reason: 'Quality issues', created_at: '2024-05-14' },
  { id: 2, job_id: 3, job_title: 'Mobile App', client_name: 'Charlie Brown', worker_name: 'Alice Williams', status: 'resolved', reason: 'Delayed delivery', created_at: '2024-05-01', resolved_at: '2024-05-05' },
];

const mockReviews = [
  { id: 1, rating: 5, comment: 'Excellent work!', job_id: 1, job_title: 'Website Development', reviewer_name: 'John Doe', reviewee_name: 'Jane Smith', status: 'approved', created_at: '2024-05-16' },
  { id: 2, rating: 4, comment: 'Good but could be better', job_id: 2, job_title: 'Logo Design', reviewer_name: 'Bob Johnson', reviewee_name: 'Jane Smith', status: 'pending', created_at: '2024-05-17' },
  { id: 3, rating: 1, comment: 'Terrible experience', job_id: 3, job_title: 'Mobile App', reviewer_name: 'Charlie Brown', reviewee_name: 'Alice Williams', status: 'flagged', created_at: '2024-05-12' },
  { id: 4, rating: 5, comment: 'Perfect delivery!', job_id: 6, job_title: 'E-commerce Platform', reviewer_name: 'Charlie Brown', reviewee_name: 'Jane Smith', status: 'approved', created_at: '2024-05-18' },
  { id: 5, rating: 3, comment: 'Average work quality', job_id: 7, job_title: 'Brand Identity Package', reviewer_name: 'John Doe', reviewee_name: 'Alice Williams', status: 'pending', created_at: '2024-05-15' },
];

const mockKYCDocuments = [
  { 
    id: 1, 
    worker_id: 2, 
    worker_name: 'Jane Smith', 
    status: 'pending', 
    submitted_at: '2024-05-10',
    documents: [
      { document_type: 'passport', url: 'https://via.placeholder.com/600x400?text=Passport', uploaded_at: '2024-05-10' },
      { document_type: 'proof_of_address', url: 'https://via.placeholder.com/600x400?text=Address+Proof', uploaded_at: '2024-05-10' }
    ]
  },
  { 
    id: 2, 
    worker_id: 4, 
    worker_name: 'Alice Williams', 
    status: 'approved', 
    submitted_at: '2024-05-05',
    documents: [
      { document_type: 'drivers_license', url: 'https://via.placeholder.com/600x400?text=License', uploaded_at: '2024-05-05' },
      { document_type: 'proof_of_address', url: 'https://via.placeholder.com/600x400?text=Utility+Bill', uploaded_at: '2024-05-05' }
    ]
  },
  { 
    id: 3, 
    worker_id: 6, 
    worker_name: 'Mike Johnson', 
    status: 'pending', 
    submitted_at: '2024-05-15',
    documents: [
      { document_type: 'national_id', url: 'https://via.placeholder.com/600x400?text=National+ID', uploaded_at: '2024-05-15' },
      { document_type: 'proof_of_address', url: 'https://via.placeholder.com/600x400?text=Bank+Statement', uploaded_at: '2024-05-15' }
    ]
  },
  { 
    id: 4, 
    worker_id: 7, 
    worker_name: 'Sarah Connor', 
    status: 'rejected', 
    submitted_at: '2024-05-08',
    documents: [
      { document_type: 'passport', url: 'https://via.placeholder.com/600x400?text=Passport+Expired', uploaded_at: '2024-05-08' }
    ]
  },
  { 
    id: 5, 
    worker_id: 8, 
    worker_name: 'David Lee', 
    status: 'pending', 
    submitted_at: '2024-05-18',
    documents: [
      { document_type: 'drivers_license', url: 'https://via.placeholder.com/600x400?text=License', uploaded_at: '2024-05-18' },
      { document_type: 'proof_of_address', url: 'https://via.placeholder.com/600x400?text=Address+Proof', uploaded_at: '2024-05-18' },
      { document_type: 'selfie', url: 'https://via.placeholder.com/600x400?text=Selfie+with+ID', uploaded_at: '2024-05-18' }
    ]
  },
];

const mockMetrics = {
  total_users: 5234,
  total_workers: 2847,
  total_clients: 2387,
  active_jobs: 342,
  completed_jobs: 1114,
  active_users_30d: 3456,
  total_jobs: 1456,
  total_revenue: 125000,
  total_payments: 87650,
  platform_revenue: 12500,
  active_disputes: 8,
  pending_kyc: 12,
  user_growth: 12.5,
  job_growth: 8.3,
  revenue_growth: 15.7,
  dispute_growth: -5.2,
  worker_growth: 14.2,
  client_growth: 10.8,
};

const mockCategoryStats = [
  { category: 'Web Development', count: 45, job_count: 45, total_budget: 125000, avg_budget: 2778, completed_jobs: 28, completed_count: 28 },
  { category: 'Design', count: 32, job_count: 32, total_budget: 45000, avg_budget: 1406, completed_jobs: 20, completed_count: 20 },
  { category: 'Mobile Development', count: 28, job_count: 28, total_budget: 210000, avg_budget: 7500, completed_jobs: 15, completed_count: 15 },
  { category: 'Writing', count: 56, job_count: 56, total_budget: 18000, avg_budget: 321, completed_jobs: 42, completed_count: 42 },
  { category: 'Marketing', count: 38, job_count: 38, total_budget: 67000, avg_budget: 1763, completed_jobs: 25, completed_count: 25 },
];

class MockApiService {
  setAuthToken(_token: string | null) {
    // Mock - do nothing
  }

  async login(email: string, password: string) {
    await delay(500);
    const validEmails = ['admin@handwork.com', 'admin@handworkmarketplace.com'];
    const validPassword = 'admin123';
    
    if (validEmails.includes(email) && password === validPassword) {
      return {
        access_token: 'mock-token-12345',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 1, email, full_name: 'Admin User', role: 'admin' },
        raw: {},
      };
    }
    throw new Error('Invalid credentials');
  }

  async getCurrentAdmin() {
    await delay(300);
    return { id: 1, email: 'admin@handwork.com', full_name: 'Admin User', role: 'admin' };
  }

  async getUsers(params: any) {
    await delay(500);
    let filtered = [...mockUsers];
    
    if (params.role) filtered = filtered.filter(u => u.role === params.role);
    if (params.is_verified !== undefined) filtered = filtered.filter(u => u.is_verified === params.is_verified);
    if (params.is_active !== undefined) filtered = filtered.filter(u => u.is_active === params.is_active);
    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(search) || 
        u.full_name.toLowerCase().includes(search)
      );
    }

    const page = params.page || 1;
    const size = params.size || 20;
    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);

    return {
      items,
      total: filtered.length,
      page,
      size,
      pages: Math.ceil(filtered.length / size),
    };
  }

  async getUserDetail(userId: number) {
    await delay(300);
    return mockUsers.find(u => u.id === userId) || null;
  }

  async updateUserStatus(userId: number, action: string, reason?: string) {
    await delay(500);
    return { success: true, message: `User ${action} successfully`, userId, action, reason };
  }

  async getJobs(params: any) {
    await delay(500);
    let filtered = [...mockJobs];
    
    if (params.status) filtered = filtered.filter(j => j.status === params.status);
    if (params.category) filtered = filtered.filter(j => j.category === params.category);
    if (params.min_budget) filtered = filtered.filter(j => j.budget >= params.min_budget);
    if (params.max_budget) filtered = filtered.filter(j => j.budget <= params.max_budget);
    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(j => 
        j.title.toLowerCase().includes(search) || 
        j.description.toLowerCase().includes(search)
      );
    }

    const page = params.page || 1;
    const size = params.size || 20;
    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);

    return {
      items,
      total: filtered.length,
      page,
      size,
      pages: Math.ceil(filtered.length / size),
    };
  }

  async getJobDetail(jobId: number) {
    await delay(300);
    return mockJobs.find(j => j.id === jobId) || null;
  }

  async getPayments(params: any) {
    await delay(500);
    let filtered = [...mockPayments];
    
    if (params.status) filtered = filtered.filter(p => p.status === params.status);
    if (params.payment_method) filtered = filtered.filter(p => p.payment_method === params.payment_method);
    if (params.min_amount) filtered = filtered.filter(p => p.amount >= params.min_amount);
    if (params.max_amount) filtered = filtered.filter(p => p.amount <= params.max_amount);

    const page = params.page || 1;
    const size = params.size || 20;
    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);

    return {
      items,
      total: filtered.length,
      page,
      size,
      pages: Math.ceil(filtered.length / size),
    };
  }

  async processPayout(payoutId: number) {
    await delay(800);
    return { success: true, message: 'Payout processed successfully', payoutId };
  }

  async triggerAutomaticPayouts() {
    await delay(1000);
    return { success: true, message: 'Automatic payouts triggered', processed: 3 };
  }

  async getDisputes(params: any) {
    await delay(500);
    let filtered = [...mockDisputes];
    
    if (params.status) filtered = filtered.filter(d => d.status === params.status);

    const page = params.page || 1;
    const size = params.size || 20;
    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);

    return {
      items,
      total: filtered.length,
      page,
      size,
      pages: Math.ceil(filtered.length / size),
    };
  }

  async getPlatformMetrics() {
    await delay(600);
    return mockMetrics;
  }

  async getJobCategoriesStats() {
    await delay(500);
    return mockCategoryStats;
  }

  async getReviewsForModeration(params: any) {
    await delay(500);
    let filtered = [...mockReviews];
    
    if (params.status) filtered = filtered.filter(r => r.status === params.status);
    if (params.min_rating) filtered = filtered.filter(r => r.rating >= params.min_rating);
    if (params.max_rating) filtered = filtered.filter(r => r.rating <= params.max_rating);

    const page = params.page || 1;
    const size = params.size || 20;
    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);

    return {
      items,
      total: filtered.length,
      page,
      size,
      pages: Math.ceil(filtered.length / size),
    };
  }

  async getReviewDetail(reviewId: number) {
    await delay(300);
    return mockReviews.find(r => r.id === reviewId) || null;
  }

  async moderateReview(reviewId: number, action: string, reason?: string) {
    await delay(500);
    return { success: true, message: `Review ${action} successfully`, reviewId, action, reason };
  }

  async getKYCDocuments(params: any) {
    await delay(500);
    let filtered = [...mockKYCDocuments];
    
    if (params.status) filtered = filtered.filter(k => k.status === params.status);

    const page = params.page || 1;
    const size = params.size || 20;
    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);

    return {
      items,
      total: filtered.length,
      page,
      size,
      pages: Math.ceil(filtered.length / size),
    };
  }

  async processKYC(workerProfileId: number, action: string, reason?: string) {
    await delay(500);
    return { success: true, message: `KYC ${action} successfully`, workerProfileId, action, reason };
  }
}

export const mockApiService = new MockApiService();
