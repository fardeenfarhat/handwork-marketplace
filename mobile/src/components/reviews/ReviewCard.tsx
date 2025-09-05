import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review, ReviewResponse } from '../../types';
import { StarRating } from './StarRating';
import { useAuth } from '../../hooks/useAuth';
import { HapticService } from '../../utils/haptics';

interface ReviewCardProps {
  review: Review;
  onReport?: (reviewId: number, reason: string) => void;
  onRespond?: (reviewId: number, response: string) => void;
  onEdit?: (reviewId: number, rating: number, comment: string) => void;
  showActions?: boolean;
  currentUserId?: number;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onReport,
  onRespond,
  onEdit,
  showActions = true,
  currentUserId: propCurrentUserId,
}) => {
  const { currentUserId: authCurrentUserId } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [responseText, setResponseText] = useState('');
  const [editRating, setEditRating] = useState(review.rating);
  const [editComment, setEditComment] = useState(review.comment);

  // Use prop currentUserId if provided, otherwise use auth context
  const currentUserId = propCurrentUserId || authCurrentUserId;

  const canRespond = currentUserId === review.revieweeId && !review.response;
  const canReport = currentUserId !== review.reviewerId && !review.isReported;
  const canEdit = currentUserId === review.reviewerId && review.status === 'approved';
  
  // Check if review is within edit window (e.g., 24 hours)
  const reviewDate = new Date(review.createdAt);
  const now = new Date();
  const hoursSinceReview = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);
  const isWithinEditWindow = hoursSinceReview <= 24;

  const handleReport = async () => {
    if (reportReason.trim() && onReport) {
      await HapticService.warning();
      onReport(review.id, reportReason.trim());
      setShowReportModal(false);
      setReportReason('');
      Alert.alert('Report Submitted', 'Thank you for reporting this review. Our team will investigate.');
    }
  };

  const handleRespond = async () => {
    if (responseText.trim() && onRespond) {
      await HapticService.success();
      onRespond(review.id, responseText.trim());
      setShowResponseModal(false);
      setResponseText('');
    }
  };

  const handleEdit = async () => {
    if (editComment.trim() && editRating > 0 && onEdit) {
      await HapticService.success();
      onEdit(review.id, editRating, editComment.trim());
      setShowEditModal(false);
    }
  };

  const resetEditForm = () => {
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.reviewerName}</Text>
          <Text style={styles.jobTitle}>{review.jobTitle}</Text>
        </View>
        <View style={styles.ratingContainer}>
          <StarRating rating={review.rating} size={16} />
          <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.comment}>{review.comment}</Text>

      {review.response && (
        <View style={styles.responseContainer}>
          <View style={styles.responseHeader}>
            <Ionicons name="arrow-undo" size={16} color="#666" />
            <Text style={styles.responseLabel}>Response from {review.response.responderName}</Text>
          </View>
          <Text style={styles.responseText}>{review.response.response}</Text>
          <Text style={styles.responseDate}>{formatDate(review.response.createdAt)}</Text>
        </View>
      )}

      {showActions && (
        <View style={styles.actions}>
          {canEdit && isWithinEditWindow && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                await HapticService.light();
                resetEditForm();
                setShowEditModal(true);
              }}
            >
              <Ionicons name="create-outline" size={16} color="#007AFF" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          )}
          {canRespond && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                await HapticService.light();
                setShowResponseModal(true);
              }}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#007AFF" />
              <Text style={styles.actionText}>Respond</Text>
            </TouchableOpacity>
          )}
          {canReport && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                await HapticService.light();
                setShowReportModal(true);
              }}
            >
              <Ionicons name="flag-outline" size={16} color="#FF3B30" />
              <Text style={[styles.actionText, { color: '#FF3B30' }]}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Review</Text>
            <Text style={styles.modalSubtitle}>
              Please tell us why you're reporting this review:
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Reason for reporting..."
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleReport}
              >
                <Text style={styles.submitButtonText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResponseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Respond to Review</Text>
            <Text style={styles.modalSubtitle}>
              Share your perspective on this review:
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your response..."
              value={responseText}
              onChangeText={setResponseText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowResponseModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleRespond}
              >
                <Text style={styles.submitButtonText}>Respond</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Review Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Review</Text>
            <Text style={styles.modalSubtitle}>
              You can edit your review within 24 hours of posting:
            </Text>
            
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rating:</Text>
              <StarRating 
                rating={editRating} 
                size={24} 
                interactive={true}
                onRatingChange={setEditRating}
              />
            </View>
            
            <TextInput
              style={styles.textInput}
              placeholder="Update your review..."
              value={editComment}
              onChangeText={setEditComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {editComment.length}/500 characters
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  resetEditForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.submitButton,
                  (!editComment.trim() || editRating === 0) && styles.disabledButton
                ]}
                onPress={handleEdit}
                disabled={!editComment.trim() || editRating === 0}
              >
                <Text style={styles.submitButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  comment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  responseContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  responseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    marginBottom: 6,
  },
  responseDate: {
    fontSize: 11,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  actionText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  ratingSection: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
});