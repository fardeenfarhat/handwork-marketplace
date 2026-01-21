import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';

interface Dispute {
  id: number;
  booking_id: number;
  client_name: string;
  worker_name: string;
  reason: string;
  status: string;
  created_at: string;
  description: string;
}

const DisputeResolution: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ status: '' });
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadDisputes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const params = { page: pagination.page, size: pagination.size, ...filters };
      const response = await apiService.getDisputes(params);
      setDisputes(response.items);
      setPagination(prev => ({ ...prev, total: response.total, pages: response.pages }));
    } catch (err: any) {
      setError('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      open: 'status-pending',
      investigating: 'status-active',
      resolved: 'status-completed',
      closed: 'status-inactive',
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="content-section active">
      <div className="section-header">
        <h1 className="section-title">Dispute Resolution</h1>
        <p className="section-subtitle">Manage and resolve platform disputes</p>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div className="filters-actions">
          <button onClick={loadDisputes} className="btn">
            <i className="fas fa-search"></i>
            Apply Filters
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">
          <i className="fas fa-spinner"></i>
          Loading disputes...
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Booking</th>
                <th>Client</th>
                <th>Worker</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute.id}>
                  <td>{dispute.id}</td>
                  <td>#{dispute.booking_id}</td>
                  <td>{dispute.client_name}</td>
                  <td>{dispute.worker_name}</td>
                  <td>{dispute.reason}</td>
                  <td>{getStatusBadge(dispute.status)}</td>
                  <td>{formatDate(dispute.created_at)}</td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedDispute(dispute);
                        setShowModal(true);
                      }}
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
      )}

      {/* Dispute Details Modal */}
      {showModal && selectedDispute && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Dispute Details</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-content">
              <p><strong>Booking ID:</strong> #{selectedDispute.booking_id}</p>
              <p><strong>Client:</strong> {selectedDispute.client_name}</p>
              <p><strong>Worker:</strong> {selectedDispute.worker_name}</p>
              <p><strong>Reason:</strong> {selectedDispute.reason}</p>
              <p><strong>Status:</strong> {getStatusBadge(selectedDispute.status)}</p>
              <p><strong>Description:</strong> {selectedDispute.description}</p>
              <p><strong>Created:</strong> {formatDate(selectedDispute.created_at)}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary">
                <i className="fas fa-gavel"></i>
                Investigate
              </button>
              <button className="btn btn-success">
                <i className="fas fa-check"></i>
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeResolution;