import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { API_CONFIG } from '../../config/api';

interface Review {
  id: number;
  rating: number;
  comment: string;
  reviewer_name: string;
  reviewee_name: string;
  status: string;
  created_at: string;
}

interface KYCDocumentItem {
  document_type: string;
  url: string;
  uploaded_at?: string;
}

interface KYCDocument {
  id: number;
  worker_name: string;
  status: string;
  documents: KYCDocumentItem[];
  submitted_at: string;
}

const ContentModeration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reviews' | 'kyc'>('reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });
  const [selectedWorker, setSelectedWorker] = useState<KYCDocument | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{url: string, type: string} | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    } else {
      loadKYCDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pagination.page]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await apiService.getReviewsForModeration({
        page: pagination.page,
        size: pagination.size,
      });
      console.log('📋 DEBUG: Loaded reviews:', response.items.map((r: { id: any; rating: any; }) => ({ id: r.id, rating: r.rating })));
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
      setShowModal(false);
      setSelectedWorker(null);
    } catch (err: any) {
      setError(`Failed to ${action} KYC document`);
    }
  };

  const openDocumentsModal = (worker: KYCDocument) => {
    setSelectedWorker(worker);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedWorker(null);
  };

  const openDocumentViewer = (url: string, type: string) => {
    setSelectedDocument({ url, type });
    setShowDocumentViewer(true);
  };

  const closeDocumentViewer = () => {
    setShowDocumentViewer(false);
    setSelectedDocument(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    console.log('🌟 DEBUG: Rating =', rating, typeof rating);
    return Array.from({ length: 5 }, (_, i) => (
      <i
        key={i}
        className={`fas fa-star`}
        style={{ color: i < rating ? '#ffc107' : '#dee2e6' }}
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
      <div className="section-header">
        <h1 className="section-title">Content Moderation</h1>
        <p className="section-subtitle">Review and moderate platform content</p>
      </div>

      {/* Tab Navigation */}
      <div className="filters-section">
        <div className="filters-actions">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`btn ${activeTab === 'reviews' ? 'active' : ''}`}
          >
            <i className="fas fa-star"></i>
            Reviews Moderation
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`btn ${activeTab === 'kyc' ? 'active' : ''}`}
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
            <div className="data-table-container">
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
                        <div className="action-buttons">
                          <button
                            onClick={() => moderateReview(review.id, 'approve')}
                            className="action-btn view"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            onClick={() => moderateReview(review.id, 'reject')}
                            className="action-btn delete"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Worker</th>
                    <th>Documents</th>
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
                      <td>
                        <button
                          onClick={() => openDocumentsModal(doc)}
                          className="btn btn-info btn-sm"
                        >
                          <i className="fas fa-eye"></i> View Documents ({doc.documents.length})
                        </button>
                      </td>
                      <td>{getStatusBadge(doc.status)}</td>
                      <td>{formatDate(doc.submitted_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => processKYC(doc.id, 'approve')}
                            className="action-btn view"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            onClick={() => processKYC(doc.id, 'reject')}
                            className="action-btn delete"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Document Review Modal */}
      {showModal && selectedWorker && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>KYC Documents - {selectedWorker.worker_name}</h3>
              <button className="close-btn" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="document-grid">
                {['id_front', 'id_back', 'selfie', 'address_proof'].map((docType) => {
                  const doc = selectedWorker.documents.find(d => d.document_type === docType);
                  const labels = {
                    id_front: 'ID Front',
                    id_back: 'ID Back', 
                    selfie: 'Selfie',
                    address_proof: 'Address Proof'
                  };
                  
                  return (
                    <div key={docType} className="document-item">
                      <h4>{labels[docType as keyof typeof labels]}</h4>
                      {doc ? (
                        <div className="document-preview">
                          <img 
                            src={`${API_CONFIG.BASE_URL.replace('/api/v1', '')}${doc.url}`}
                            alt={labels[docType as keyof typeof labels]}
                            className="document-image"
                            onClick={() => openDocumentViewer(doc.url, docType)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const fallback = target.nextElementSibling as HTMLElement;
                              target.style.display = 'none';
                              if (fallback) {
                                fallback.style.display = 'block';
                              }
                            }}
                          />
                          <div className="document-fallback" style={{display: 'none'}}>
                            <i className="fas fa-file-alt"></i>
                            <p>Document available</p>
                            <button 
                              onClick={() => openDocumentViewer(doc.url, docType)}
                              className="btn btn-primary btn-sm"
                            >
                              Open Document
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="no-document-placeholder">
                          <i className="fas fa-file-slash"></i>
                          <p>Not uploaded</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <div className="worker-info">
                <p><strong>Status:</strong> {getStatusBadge(selectedWorker.status)}</p>
                <p><strong>Submitted:</strong> {formatDate(selectedWorker.submitted_at)}</p>
              </div>
              <div className="action-buttons">
                <button
                  onClick={() => processKYC(selectedWorker.id, 'approve')}
                  className="btn btn-success"
                  style={{ marginRight: '8px' }}
                >
                  <i className="fas fa-check"></i> Approve
                </button>
                <button
                  onClick={() => processKYC(selectedWorker.id, 'reject')}
                  className="btn btn-danger"
                  style={{ marginRight: '8px' }}
                >
                  <i className="fas fa-times"></i> Reject
                </button>
                <button
                  onClick={closeModal}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Overlay */}
      {showDocumentViewer && selectedDocument && (
        <div className="document-viewer-overlay" onClick={closeDocumentViewer}>
          <div className="document-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="document-viewer-header">
              <h3>
                {selectedDocument.type.replace('_', ' ').toUpperCase()} - {selectedWorker?.worker_name}
              </h3>
              <div className="document-viewer-controls">
                <a 
                  href={`${API_CONFIG.BASE_URL.replace('/api/v1', '')}${selectedDocument.url}`}
                  download
                  className="btn btn-outline-primary btn-sm"
                  title="Download"
                >
                  <i className="fas fa-download"></i>
                </a>
                <a 
                  href={`${API_CONFIG.BASE_URL.replace('/api/v1', '')}${selectedDocument.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm"
                  title="Open in new tab"
                >
                  <i className="fas fa-external-link-alt"></i>
                </a>
                <button className="close-btn" onClick={closeDocumentViewer} title="Close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="document-viewer-body">
              <img 
                src={`${API_CONFIG.BASE_URL.replace('/api/v1', '')}${selectedDocument.url}`}
                alt={selectedDocument.type}
                className="document-full-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const fallback = target.nextElementSibling as HTMLElement;
                  target.style.display = 'none';
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
              <div className="document-full-fallback" style={{display: 'none'}}>
                <i className="fas fa-file-alt"></i>
                <p>Unable to preview this document type</p>
                <a 
                  href={`http://192.168.18.19:8000${selectedDocument.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentModeration;
