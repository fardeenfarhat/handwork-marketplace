import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';

interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  platform_fee: number;
  worker_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  payout_status?: string;
  payout_id?: number;
}

const PaymentMonitoring: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    status: '',
    min_amount: '',
    max_amount: '',
  });

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        size: pagination.size,
        ...filters,
        min_amount: filters.min_amount ? parseFloat(filters.min_amount) : undefined,
        max_amount: filters.max_amount ? parseFloat(filters.max_amount) : undefined,
      };

      const response = await apiService.getPayments(params);
      setPayments(response.items);
      setPagination(prev => ({ ...prev, total: response.total, pages: response.pages }));
    } catch (err: any) {
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (payoutId: number) => {
    if (!window.confirm('Are you sure you want to process this payout? Money will be sent to the worker\'s bank account.')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.processPayout(payoutId);
      alert('Payout processed successfully!');
      loadPayments(); // Reload to update status
    } catch (err: any) {
      alert(`Failed to process payout: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      pending: 'status-pending',
      held: 'status-active',
      released: 'status-completed',
      refunded: 'status-inactive',
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
        <h1 className="section-title">Payment Monitoring</h1>
        <p className="section-subtitle">Monitor and track all platform payments</p>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="held">Held</option>
              <option value="released">Released</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Min Amount</label>
            <input
              type="number"
              placeholder="Min Amount"
              value={filters.min_amount}
              onChange={(e) => setFilters(prev => ({ ...prev, min_amount: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Max Amount</label>
            <input
              type="number"
              placeholder="Max Amount"
              value={filters.max_amount}
              onChange={(e) => setFilters(prev => ({ ...prev, max_amount: e.target.value }))}
            />
          </div>
        </div>
        <div className="filters-actions">
          <button onClick={loadPayments} className="btn">
            <i className="fas fa-search"></i>
            Apply Filters
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">
          <i className="fas fa-spinner"></i>
          Loading payments...
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Booking</th>
                <th>Amount</th>
                <th>Platform Fee</th>
                <th>Worker Amount</th>
                <th>Status</th>
                <th>Method</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.id}</td>
                  <td>#{payment.booking_id}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{formatCurrency(payment.platform_fee)}</td>
                  <td>{formatCurrency(payment.worker_amount || 0)}</td>
                  <td>{getStatusBadge(payment.status)}</td>
                  <td>{payment.payment_method}</td>
                  <td>{formatDate(payment.created_at)}</td>
                  <td>
                    {payment.status === 'released' && payment.payout_status === 'pending' && payment.payout_id && (
                      <button 
                        className="btn btn-sm" 
                        onClick={() => handleProcessPayout(payment.payout_id!)}
                        title="Process payout to worker's bank account"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                        }}
                      >
                        <i className="fas fa-money-bill-transfer"></i>
                        Process Payout
                      </button>
                    )}
                    {payment.status === 'released' && payment.payout_status === 'failed' && payment.payout_id && (
                      <button 
                        className="btn btn-sm" 
                        onClick={() => handleProcessPayout(payment.payout_id!)}
                        title="Retry failed payout"
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                        }}
                      >
                        <i className="fas fa-redo"></i>
                        Retry Payout
                      </button>
                    )}
                    {payment.payout_status === 'completed' && (
                      <span style={{ color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fas fa-check-circle"></i> Paid Out
                      </span>
                    )}
                    {payment.payout_status === 'processing' && (
                      <span style={{ color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fas fa-spinner fa-spin"></i> Processing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '20px', alignItems: 'center' }}>
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="btn btn-sm"
                style={{ opacity: pagination.page === 1 ? 0.5 : 1 }}
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <span style={{ color: '#64748b', fontSize: '14px' }}>
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                disabled={pagination.page === pagination.pages}
                className="btn btn-sm"
                style={{ opacity: pagination.page === pagination.pages ? 0.5 : 1 }}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentMonitoring;