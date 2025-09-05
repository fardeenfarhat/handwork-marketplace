import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ReviewCard } from '../../components/reviews';
import { Review, ReviewStackParamList } from '../../types';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useReviews } from '../../hooks/useReviews';
import { useAuth } from '../../hooks/useAuth';

type ReviewModerationScreenRouteProp = RouteProp<ReviewStackParamList, 'ReviewModeration'>;

export const ReviewModerationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReviewModerationScreenRouteProp>();
  const { reviewId } = route.params;
  const { handleError } = useErrorHandler();
  const { getReviewById, moderateReview } = useReviews();
  const { currentUserId, isLoggedIn } = useAuth();

  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [moderationNote, setModerationNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadReview();
  }, [reviewId]);

  const loadReview = async () => {
    try {
      setIsLoading(true);
      
      if (!isLoggedIn || !currentUserId) {
        Alert.alert('Authentication Required', 'Please log in to access moderation features.');
        navigation.goBack();
        return;
      }
      
      const reviewData = await getReviewById(reviewId);
      setReview(reviewData);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveReview = async () => {
    Alert.alert(
      'Approve Review',
      'Are you sure you want to approve this review? It will be visible to all users.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setIsProcessing(true);
              
              await moderateReview(reviewId, 'approve', moderationNote);
              
              if (review) {
                setReview({
                  ...review,
                  status: 'approved',
                });
              }
              
              Alert.alert(
                'Review Approved',
                'The review has been approved and is now visible to users.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              handleError(error);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectReview = async () => {
    if (!moderationNote.trim()) {
      Alert.alert('Moderation Note Required', 'Please provide a reason for rejecting this review.');
      return;
    }

    Alert.alert(
      'Reject Review',
      'Are you sure you want to reject this review? The reviewer will be notified.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              
              await moderateReview(reviewId, 'reject', moderationNote);
              
              if (review) {
                setReview({
                  ...review,
                  status: 'rejected',
                });
              }
              
              Alert.alert(
                'Review Rejected',
                'The review has been rejected and the reviewer has been notified.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              handleError(error);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleContactReviewer = () => {
    if (!review) return;
    
    Alert.alert(
      'Contact Reviewer',
      'This will open a chat with the reviewer to ask for clarification or additional information.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Chat',
          onPress: () => {
            // Navigate to chat with the reviewer
            navigation.navigate('Messages', {
              screen: 'Chat',
              params: { 
                jobId: review.jobId,
                userId: review.reviewerId,
                userName: review.reviewerName,
                context: 'review_moderation'
              },
            });
          },
        },
      ]
    );
  };

  const handleContactReviewee = () => {
    if (!review) return;
    
    Alert.alert(
      'Contact Reviewee',
      'This will open a chat with the person being reviewed to get their perspective.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Chat',
          onPress: () => {
            // Navigate to chat with the reviewee
            navigation.navigate('Messages', {
              screen: 'Chat',
              params: { 
                jobId: review.jobId,
                userId: review.revieweeId,
                userName: review.revieweeName || 'User',
                context: 'review_moderation'
              },
            });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading review...</Text>
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Review Not Found</Text>
        <Text style={styles.errorText}>
          The review you're trying to moderate could not be found.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Review Moderation</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Review Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={review.isReported ? "flag" : "time-outline"} 
              size={20} 
              color={review.isReported ? "#FF3B30" : "#FF9500"} 
            />
            <Text style={styles.statusTitle}>
              {review.isReported ? 'Reported Review' : 'Pending Review'}
            </Text>
          </View>
          {review.isReported && review.reportReason && (
            <View style={styles.reportReason}>
              <Text style={styles.reportReasonLabel}>Report Reason:</Text>
              <Text style={styles.reportReasonText}>{review.reportReason}</Text>
            </View>
          )}
        </View>

        {/* Review Content */}
        <View style={styles.reviewContainer}>
          <ReviewCard
            review={review}
            showActions={false}
          />
        </View>

        {/* Moderation Guidelines */}
        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>Moderation Guidelines</Text>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.guidelineText}>
              Reviews should be honest and based on actual experience
            </Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.guidelineText}>
              No personal attacks, harassment, or inappropriate language
            </Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.guidelineText}>
              Reviews should focus on work quality and professionalism
            </Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.guidelineText}>
              Reject reviews that appear fake or malicious
            </Text>
          </View>
        </View>

        {/* Contact Options */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Investigation Tools</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactReviewer}
          >
            <Ionicons name="mail-outline" size={20} color="#007AFF" />
            <Text style={styles.contactButtonText}>Contact Reviewer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactReviewee}
          >
            <Ionicons name="mail-outline" size={20} color="#007AFF" />
            <Text style={styles.contactButtonText}>Contact Reviewee</Text>
          </TouchableOpacity>
        </View>

        {/* Moderation Note */}
        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>Moderation Note</Text>
          <Text style={styles.noteSubtitle}>
            Add a note explaining your decision (required for rejection):
          </Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Enter your moderation note..."
            value={moderationNote}
            onChangeText={setModerationNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {moderationNote.length}/500 characters
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={handleRejectReview}
          disabled={isProcessing}
        >
          <Ionicons name="close-circle" size={20} color="#fff" />
          <Text style={styles.rejectButtonText}>
            {isProcessing ? 'Processing...' : 'Reject'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={handleApproveReview}
          disabled={isProcessing}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.approveButtonText}>
            {isProcessing ? 'Processing...' : 'Approve'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerBackButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  reportReason: {
    marginTop: 8,
  },
  reportReasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  reportReasonText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  reviewContainer: {
    margin: 16,
  },
  guidelines: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  contactButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
  noteSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  noteSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});