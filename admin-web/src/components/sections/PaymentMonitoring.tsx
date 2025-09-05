import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';

interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  platform_fee: number;
  status: string;
  payment_method: string;
  created_at: string;
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
        <div className="filters">
          <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="held">Held</option>
            <option value="released">Released</option>
            <option value="refunded">Refunded</option>
          </select>
          <input
            type="number"
            placeholder="Min Amount"
            value={filters.min_amount}
            onChange={(e) => setFilters(prev => ({ ...prev, min_amount: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Max Amount"
            value={filters.max_amount}
            onChange={(e) => setFilters(prev => ({ ...prev, max_amount: e.target.value }))}
          />
          <button onClick={loadPayments} className="btn btn-primary">Apply</button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">
          <i className="fas fa-spinner"></i>
          Loading payments...
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Booking</th>
                <th>Amount</th>
                <th>Platform Fee</th>
                <th>Status</th>
                <th>Method</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.id}</td>
                  <td>#{payment.booking_id}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{formatCurrency(payment.platform_fee)}</td>
                  <td>{getStatusBadge(payment.status)}</td>
                  <td>{payment.payment_method}</td>
                  <td>{formatDate(payment.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentMonitoring;