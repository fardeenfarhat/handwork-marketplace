import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';

interface Review {
  id: number;
  rating: number;
  comment: string;
  reviewer_name: string;
  reviewee_name: string;
  status: string;
  created_at: string;
}

interface KYCDocument {
  id: number;
  worker_name: string;
  document_type: string;
  status: string;
  submitted_at: string;
}

const ContentModeration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reviews' | 'kyc'>('reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    } else {
      loadKYCDocuments();
    }
  }, [activeTab, pagination.page]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await apiService.getReviewsForModeration({
        page: pagination.page,
        size: pagination.size,
      });
      setReviews(response.items);
      setPagination(prev => ({ ...prev, total: response.total, pages: response.pages }));
    } catch (err: any) {
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const loadKYCDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getKYCDocuments({
        page: pagination.page,
        size: pagination.size,
      });
      setKycDocuments(response.items);
      setPagination(prev => ({ ...prev, total: response.total, pages: response.pages }));
    } catch (err: any) {
      setError('Failed to load KYC documents');
    } finally {
      setLoading(false);
    }
  };

  const moderateReview = async (reviewId: number, action: string) => {
    try {
      await apiService.moderateReview(reviewId, action);
      loadReviews();
    } catch (err: any) {
      setError(`Failed to ${action} review`);
    }
  };

  const processKYC = async (workerProfileId: number, action: string) => {
    try {
      await apiService.processKYC(workerProfileId, action);
      loadKYCDocuments();
    } catch (err: any) {
      setError(`Failed to ${action} KYC document`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i
        key={i}
        className={`fas fa-star ${i < rating ? 'text-warning' : 'text-muted'}`}
      ></i>
    ));
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      pending: 'status-pending',
      approved: 'status-completed',
      rejected: 'status-inactive',
      flagged: 'status-active',
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="content-section active">
      {/* Tab Navigation */}
      <div className="section-header">
        <div className="filters">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`btn ${activeTab === 'reviews' ? 'btn-primary' : 'btn-outline'}`}
          >
            <i className="fas fa-star"></i>
            Reviews
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`btn ${activeTab === 'kyc' ? 'btn-primary' : 'btn-outline'}`}
          >
            <i className="fas fa-id-card"></i>
            KYC Documents
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">
          <i className="fas fa-spinner"></i>
          Loading {activeTab}...
        </div>
      ) : (
        <>
          {activeTab === 'reviews' ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Rating</th>
                    <th>Reviewer</th>
                    <th>Reviewee</th>
                    <th>Comment</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review) => (
                    <tr key={review.id}>
                      <td>{review.id}</td>
                      <td>{renderStars(review.rating)}</td>
                      <td>{review.reviewer_name}</td>
                      <td>{review.reviewee_name}</td>
                      <td>{review.comment.substring(0, 50)}...</td>
                      <td>{getStatusBadge(review.status)}</td>
                      <td>{formatDate(review.created_at)}</td>
                      <td>
                        <button
                          onClick={() => moderateReview(review.id, 'approve')}
                          className="btn btn-success"
                          style={{ marginRight: '8px' }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          onClick={() => moderateReview(review.id, 'reject')}
                          className="btn btn-danger"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Worker</th>
                    <th>Document Type</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {kycDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.id}</td>
                      <td>{doc.worker_name}</td>
                      <td>{doc.document_type}</td>
                      <td>{getStatusBadge(doc.status)}</td>
                      <td>{formatDate(doc.submitted_at)}</td>
                      <td>
                        <button
                          onClick={() => processKYC(doc.id, 'approve')}
                          className="btn btn-success"
                          style={{ marginRight: '8px' }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          onClick={() => processKYC(doc.id, 'reject')}
                          className="btn btn-danger"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentModeration;