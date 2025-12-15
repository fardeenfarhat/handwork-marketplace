import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';

interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  budget_min: number;
  budget_max: number;
  status: string;
  client_name: string;
  worker_name?: string;
  created_at: string;
  location: string;
}

interface PaginatedResponse {
  items: Job[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

const JobOversight: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    pages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
    min_budget: '',
    max_budget: '',
  });

  // Modal state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadJobs();
  }, [pagination.page, pagination.size]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        size: pagination.size,
        ...filters,
        min_budget: filters.min_budget ? parseFloat(filters.min_budget) : undefined,
        max_budget: filters.max_budget ? parseFloat(filters.max_budget) : undefined,
      };

      const response: PaginatedResponse = await apiService.getJobs(params);
      setJobs(response.items);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        pages: response.pages,
      }));
    } catch (err: any) {
      setError('Failed to load jobs');
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadJobs();
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const viewJobDetails = async (job: Job) => {
    try {
      const jobDetail = await apiService.getJobDetail(job.id);
      setSelectedJob(jobDetail);
      setShowModal(true);
    } catch (err: any) {
      setError('Failed to load job details');
      console.error('Error loading job details:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      open: 'open',
      assigned: 'pending',
      in_progress: 'in_progress',
      completed: 'completed',
      cancelled: 'inactive',
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'pending'}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    );
  };



  return (
    <div className="content-section active">
      <div className="section-header">
        <h1 className="section-title">Job Oversight</h1>
        <p className="section-subtitle">Monitor and manage all platform jobs</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="cleaning">Cleaning</option>
              <option value="construction">Construction</option>
              <option value="ac_repair">A/C Repair</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Min Budget</label>
            <input
              type="number"
              placeholder="Min Budget"
              value={filters.min_budget}
              onChange={(e) => handleFilterChange('min_budget', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Max Budget</label>
            <input
              type="number"
              placeholder="Max Budget"
              value={filters.max_budget}
              onChange={(e) => handleFilterChange('max_budget', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search jobs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>
        <div className="filters-actions">
          <button onClick={applyFilters} className="btn">
            <i className="fas fa-search"></i>
            Apply Filters
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">
          <i className="fas fa-spinner"></i>
          Loading jobs...
        </div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Client</th>
                  <th>Budget Range</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>#{job.id}</td>
                    <td className="job-title">{job.title}</td>
                    <td>
                      <span className="status-badge">
                        {job.category.replace('_', ' ').charAt(0).toUpperCase() + job.category.replace('_', ' ').slice(1)}
                      </span>
                    </td>
                    <td>{job.client_name}</td>
                    <td>
                      {formatCurrency(job.budget_min)} - {formatCurrency(job.budget_max)}
                    </td>
                    <td>{getStatusBadge(job.status)}</td>
                    <td>{formatDate(job.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => viewJobDetails(job)}
                          className="action-btn view"
                        >
                          <i className="fas fa-eye"></i>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <div className="pagination-info">
              Showing {(pagination.page - 1) * pagination.size + 1} to {Math.min(pagination.page * pagination.size, pagination.total)} of {pagination.total} jobs
            </div>
            <div className="pagination-controls">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="pagination-btn"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const page = i + Math.max(1, pagination.page - 2);
                if (page <= pagination.pages) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`pagination-btn ${pagination.page === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  );
                }
                return null;
              })}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="pagination-btn"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Job Details Modal */}
      {showModal && selectedJob && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Job Details: {selectedJob.title}</h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-card">
                <div className="detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">{selectedJob.description}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Category:</span>
                  <span className="detail-value">{selectedJob.category.replace('_', ' ').charAt(0).toUpperCase() + selectedJob.category.replace('_', ' ').slice(1)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Budget Range:</span>
                  <span className="detail-value">{formatCurrency(selectedJob.budget_min)} - {formatCurrency(selectedJob.budget_max)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">{getStatusBadge(selectedJob.status)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Client:</span>
                  <span className="detail-value">{selectedJob.client_name}</span>
                </div>
                {selectedJob.worker_name && (
                  <div className="detail-row">
                    <span className="detail-label">Worker:</span>
                    <span className="detail-value">{selectedJob.worker_name}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{selectedJob.location}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(selectedJob.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOversight;