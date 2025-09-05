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
      open: 'status-pending',
      assigned: 'status-active',
      in_progress: 'status-active',
      completed: 'status-completed',
      cancelled: 'status-inactive',
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.pages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={pagination.page === i ? 'active' : ''}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="pagination">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.pages}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    );
  };

  return (
    <div className="content-section active">
      {/* Filters */}
      <div className="section-header">
        <div className="filters">
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
          <input
            type="number"
            placeholder="Min Budget"
            value={filters.min_budget}
            onChange={(e) => handleFilterChange('min_budget', e.target.value)}
          />
          <input
            type="number"
            placeholder="Max Budget"
            value={filters.max_budget}
            onChange={(e) => handleFilterChange('max_budget', e.target.value)}
          />
          <input
            type="text"
            placeholder="Search jobs..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <button onClick={applyFilters} className="btn btn-primary">
            Apply
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
          <div className="table-container">
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
                    <td>{job.id}</td>
                    <td>{job.title}</td>
                    <td>
                      <span className="status-badge">
                        {job.category.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>{job.client_name}</td>
                    <td>
                      {formatCurrency(job.budget_min)} - {formatCurrency(job.budget_max)}
                    </td>
                    <td>{getStatusBadge(job.status)}</td>
                    <td>{formatDate(job.created_at)}</td>
                    <td>
                      <button
                        onClick={() => viewJobDetails(job)}
                        className="btn btn-outline"
                      >
                        <i className="fas fa-eye"></i>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {renderPagination()}
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
            <div className="modal-content">
              <div className="form-group">
                <label>Description:</label>
                <p>{selectedJob.description}</p>
              </div>
              <div className="form-group">
                <label>Category:</label>
                <p>{selectedJob.category.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div className="form-group">
                <label>Budget Range:</label>
                <p>{formatCurrency(selectedJob.budget_min)} - {formatCurrency(selectedJob.budget_max)}</p>
              </div>
              <div className="form-group">
                <label>Status:</label>
                <p>{getStatusBadge(selectedJob.status)}</p>
              </div>
              <div className="form-group">
                <label>Client:</label>
                <p>{selectedJob.client_name}</p>
              </div>
              {selectedJob.worker_name && (
                <div className="form-group">
                  <label>Worker:</label>
                  <p>{selectedJob.worker_name}</p>
                </div>
              )}
              <div className="form-group">
                <label>Location:</label>
                <p>{selectedJob.location}</p>
              </div>
              <div className="form-group">
                <label>Created:</label>
                <p>{formatDate(selectedJob.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOversight;