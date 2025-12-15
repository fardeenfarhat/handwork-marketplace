import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ReviewCard } from '../../components/reviews';
import { Review, ReviewStackParamList, RootState } from '../../types';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { apiService } from '../../services/api';

type ReviewDetailScreenRouteProp = RouteProp<ReviewStackParamList, 'ReviewDetail'>;

export const ReviewDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReviewDetailScreenRouteProp>();
  const { reviewId } = route.params;
  const { handleError } = useErrorHandler();
  const { user } = useSelector((state: RootState) => state.auth);

  const [review, setReview] = useState<Review | null>(null);
  const [reviewerProfile, setReviewerProfile] = useState<any>(null);
  const [revieweeProfile, setRevieweeProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);



  useEffect(() => {
    loadReview();
  }, [reviewId]);

  const loadReview = async () => {
    try {
      setIsLoading(true);
      
      console.log('Loading review:', reviewId);
      
      const reviewData = await apiService.getReview(reviewId);
      setReview(reviewData);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportReview = async (reviewId: number, reason: string) => {
    try {
      console.log('Reporting review:', reviewId, reason);
      
      await apiService.reportReview(reviewId, reason);
      
      if (review) {
        setReview({
          ...review,
          isReported: true,
          reportReason: reason,
        });
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleRespondToReview = async (reviewId: number, response: string) => {
    try {
      console.log('Responding to review:', reviewId, response);
      
      const newResponse = await apiService.respondToReview(reviewId, response);
      
      if (review) {
        setReview({
          ...review,
          response: newResponse,
        });
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleDeleteReview = () => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting review:', reviewId);
              
              await apiService.deleteReview(reviewId);
              
              Alert.alert(
                'Review Deleted',
                'The review has been successfully deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              handleError(error);
            }
          },
        },
      ]
    );
  };

  const handleEditReview = () => {
    navigation.navigate('EditReview', { reviewId });
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
          The review you're looking for could not be found.
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

  const isReviewOwner = review.reviewerId === user?.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Review Details</Text>
        {isReviewOwner && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {
              Alert.alert(
                'Review Options',
                'What would you like to do?',
                [
                  {
                    text: 'Edit Review',
                    onPress: handleEditReview,
                  },
                  {
                    text: 'Delete Review',
                    style: 'destructive',
                    onPress: handleDeleteReview,
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                ]
              );
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.reviewContainer}>
          <ReviewCard
            review={review}
            onReport={handleReportReview}
            onRespond={handleRespondToReview}
            currentUserId={user?.id}
          />
        </View>

        <View style={styles.metadata}>
          <Text style={styles.metadataTitle}>Review Information</Text>
          
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Job:</Text>
            <Text style={styles.metadataValue}>{review.jobTitle}</Text>
          </View>
          
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Reviewer:</Text>
            <Text style={styles.metadataValue}>{review.reviewerName}</Text>
          </View>
          
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Reviewed:</Text>
            <Text style={styles.metadataValue}>{review.revieweeName}</Text>
          </View>
          
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Status:</Text>
            <View style={[
              styles.statusBadge,
              review.status === 'approved' && styles.approvedBadge,
              review.status === 'pending' && styles.pendingBadge,
              review.status === 'rejected' && styles.rejectedBadge,
            ]}>
              <Text style={[
                styles.statusText,
                review.status === 'approved' && styles.approvedText,
                review.status === 'pending' && styles.pendingText,
                review.status === 'rejected' && styles.rejectedText,
              ]}>
                {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
              </Text>
            </View>
          </View>
          
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Created:</Text>
            <Text style={styles.metadataValue}>
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          
          {review.updatedAt && review.updatedAt !== review.createdAt && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Updated:</Text>
              <Text style={styles.metadataValue}>
                {new Date(review.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
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
    flex: 1,
  },
  moreButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  reviewContainer: {
    margin: 16,
  },
  metadata: {
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
  metadataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  metadataValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  approvedBadge: {
    backgroundColor: '#E8F5E8',
  },
  pendingBadge: {
    backgroundColor: '#FFF3CD',
  },
  rejectedBadge: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  approvedText: {
    color: '#155724',
  },
  pendingText: {
    color: '#856404',
  },
  rejectedText: {
    color: '#721C24',
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

export default ReviewDetailScreen;