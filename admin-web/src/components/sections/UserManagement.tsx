import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface PaginatedResponse {
  items: User[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
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
    role: '',
    is_verified: '',
    is_active: '',
    search: '',
  });

  // Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.size]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        size: pagination.size,
        ...filters,
        is_verified: filters.is_verified ? filters.is_verified === 'true' : undefined,
        is_active: filters.is_active ? filters.is_active === 'true' : undefined,
      };

      const response: PaginatedResponse = await apiService.getUsers(params);
      setUsers(response.items);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        pages: response.pages,
      }));
    } catch (err: any) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadUsers();
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleUserAction = async (action: string, reason?: string) => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await apiService.updateUserStatus(selectedUser.id, action, reason);
      setShowModal(false);
      setSelectedUser(null);
      loadUsers(); // Reload users to reflect changes
    } catch (err: any) {
      setError(`Failed to ${action} user`);
      console.error(`Error ${action} user:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (user: User) => {
    if (!user.is_active) {
      return <span className="status-badge inactive">Inactive</span>;
    }
    if (!user.is_verified) {
      return <span className="status-badge unverified">Unverified</span>;
    }
    return <span className="status-badge active">Active</span>;
  };



  return (
    <div className="content-section active">
      <div className="section-header">
        <h1 className="section-title">User Management</h1>
        <p className="section-subtitle">Manage platform users, roles, and permissions</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Role</label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="client">Clients</option>
              <option value="worker">Workers</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Verification Status</label>
            <select
              value={filters.is_verified}
              onChange={(e) => handleFilterChange('is_verified', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Activity Status</label>
            <select
              value={filters.is_active}
              onChange={(e) => handleFilterChange('is_active', e.target.value)}
            >
              <option value="">All Activity</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search users..."
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
          Loading users...
        </div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td>{user.first_name} {user.last_name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="status-badge">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td>{getStatusBadge(user)}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowModal(true);
                          }}
                          className="action-btn view"
                        >
                          <i className="fas fa-cog"></i>
                          Manage
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
              Showing {(pagination.page - 1) * pagination.size + 1} to {Math.min(pagination.page * pagination.size, pagination.total)} of {pagination.total} users
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

      {/* User Action Modal */}
      {showModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Manage User: {selectedUser.first_name} {selectedUser.last_name}</h3>
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
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedUser.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Role:</span>
                  <span className="detail-value">{selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">{getStatusBadge(selectedUser)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(selectedUser.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedUser.is_active ? (
                <button
                  onClick={() => handleUserAction('deactivate')}
                  className="action-btn suspend"
                  disabled={actionLoading}
                >
                  <i className="fas fa-ban"></i>
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => handleUserAction('activate')}
                  className="action-btn view"
                  disabled={actionLoading}
                >
                  <i className="fas fa-check"></i>
                  Activate
                </button>
              )}
              {!selectedUser.is_verified && (
                <button
                  onClick={() => handleUserAction('verify')}
                  className="action-btn edit"
                  disabled={actionLoading}
                >
                  <i className="fas fa-check-circle"></i>
                  Verify
                </button>
              )}
              <button
                onClick={() => handleUserAction('suspend')}
                className="action-btn delete"
                disabled={actionLoading}
              >
                <i className="fas fa-user-slash"></i>
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;