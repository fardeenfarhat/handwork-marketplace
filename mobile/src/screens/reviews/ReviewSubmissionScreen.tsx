import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from '../../components/reviews';
import { ReviewStackParamList, ReviewSubmission } from '../../types';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useReviews } from '../../hooks/useReviews';
import { useAuth } from '../../hooks/useAuth';

type ReviewSubmissionScreenRouteProp = RouteProp<ReviewStackParamList, 'ReviewSubmission'>;

export const ReviewSubmissionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReviewSubmissionScreenRouteProp>();
  const { bookingId, revieweeId, revieweeName, jobTitle } = route.params;
  const { handleError } = useErrorHandler();
  const { submitReview } = useReviews();
  const { currentUserId, isLoggedIn } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isLoggedIn || !currentUserId) {
      Alert.alert('Authentication Required', 'Please log in to submit a review.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting your review.');
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert('Comment Required', 'Please provide a comment with at least 10 characters.');
      return;
    }

    try {
      setIsSubmitting(true);

      const reviewData: ReviewSubmission = {
        bookingId,
        revieweeId,
        rating,
        comment: comment.trim(),
      };

      await submitReview(reviewData);

      Alert.alert(
        'Review Submitted',
        'Thank you for your feedback! Your review has been submitted successfully.',
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
      setIsSubmitting(false);
    }
  };

  const getRatingDescription = (rating: number) => {
    switch (rating) {
      case 1:
        return 'Poor - Very unsatisfied';
      case 2:
        return 'Fair - Somewhat unsatisfied';
      case 3:
        return 'Good - Satisfied';
      case 4:
        return 'Very Good - Very satisfied';
      case 5:
        return 'Excellent - Extremely satisfied';
      default:
        return 'Tap a star to rate';
    }
  };

  const getPlaceholderText = () => {
    if (rating === 0) return 'Please select a rating first...';
    if (rating <= 2) return 'What could have been better? Your feedback helps improve the service.';
    if (rating === 3) return 'Tell us about your experience. What went well and what could be improved?';
    return 'What made this experience great? Share the highlights of working with this professional.';
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Write a Review</Text>
        </View>

        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{jobTitle}</Text>
          <Text style={styles.revieweeName}>Review for {revieweeName}</Text>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>How was your experience?</Text>
          <View style={styles.ratingContainer}>
            <StarRating
              rating={rating}
              onRatingChange={setRating}
              size={40}
              interactive
            />
          </View>
          <Text style={styles.ratingDescription}>
            {getRatingDescription(rating)}
          </Text>
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Share your experience</Text>
          <TextInput
            style={styles.commentInput}
            placeholder={getPlaceholderText()}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
            editable={rating > 0}
          />
          <Text style={styles.characterCount}>
            {comment.length}/500 characters
          </Text>
        </View>

        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.guidelineText}>Be honest and constructive</Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.guidelineText}>Focus on the work quality and professionalism</Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.guidelineText}>Avoid personal attacks or inappropriate language</Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.guidelineText}>Reviews are public and help others make decisions</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (rating === 0 || comment.trim().length < 10 || isSubmitting) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={rating === 0 || comment.trim().length < 10 || isSubmitting}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Submitting...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  jobInfo: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  revieweeName: {
    fontSize: 16,
    color: '#666',
  },
  ratingSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  ratingDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  commentSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  guidelines: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});