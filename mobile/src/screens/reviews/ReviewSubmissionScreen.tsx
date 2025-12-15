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
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../../components/common';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StarRating } from '../../components/reviews';
import { ReviewStackParamList, ReviewSubmission } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useReviews } from '../../hooks/useReviews';
import { useAuth } from '../../hooks/useAuth';

const { width } = Dimensions.get('window');

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
        // revieweeId is optional - backend will auto-determine from booking
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
      // Handle specific error cases
      if (error instanceof Error && error.message.includes('already reviewed')) {
        Alert.alert(
          'Review Already Submitted',
          'You have already submitted a review for this booking. You can only review each booking once.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        handleError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingDescription = (rating: number): { text: string; color: string; icon: string } => {
    switch (rating) {
      case 1:
        return { text: 'Poor - Very dissatisfied', color: '#FF3B30', icon: 'sad-outline' };
      case 2:
        return { text: 'Fair - Below expectations', color: '#FF9500', icon: 'sad-outline' };
      case 3:
        return { text: 'Good - Met expectations', color: '#FFCC00', icon: 'happy-outline' };
      case 4:
        return { text: 'Very Good - Exceeded expectations', color: '#30D158', icon: 'happy-outline' };
      case 5:
        return { text: 'Excellent - Outstanding work', color: '#34C759', icon: 'star' };
      default:
        return { text: 'Tap the stars to rate your experience', color: '#8E8E93', icon: 'star-outline' };
    }
  };

  const getPlaceholderText = () => {
    if (rating === 0) return 'Please select a rating first...';
    if (rating <= 2) return 'What could have been better? Your feedback helps improve the service.';
    if (rating === 3) return 'Tell us about your experience. What went well and what could be improved?';
    return 'What made this experience great? Share the highlights of working with this professional.';
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerIconBadge}>
              <Ionicons name="create" size={24} color="#667eea" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Write a Review</Text>
              <Text style={styles.headerSubtitle}>Share your experience</Text>
            </View>
          </View>
          
          {/* Decorative circles */}
          <View style={[styles.decorativeCircle, { top: -20, right: -20, width: 100, height: 100, opacity: 0.1 }]} />
          <View style={[styles.decorativeCircle, { bottom: 10, left: 30, width: 60, height: 60, opacity: 0.15 }]} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          
          {/* Job Info Hero Card */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.05)']}
              style={styles.heroGradient}
            >
              <View style={styles.jobIconBadge}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.jobIconGradient}
                >
                  <Ionicons name="briefcase" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              
              <View style={styles.jobInfo}>
                <Text style={styles.jobLabel}>Reviewing job for</Text>
                <Text style={styles.jobTitle}>{jobTitle}</Text>
                
                <View style={styles.revieweeContainer}>
                  <View style={styles.revieweeIconBadge}>
                    <Ionicons name="person" size={16} color="#667eea" />
                  </View>
                  <Text style={styles.revieweeName}>{revieweeName}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Rating Card */}
          <View style={styles.ratingCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBadge}>
                <Ionicons name="star" size={20} color="#FFD700" />
              </View>
              <Text style={styles.cardTitle}>Rate Your Experience</Text>
            </View>
            
            <View style={styles.ratingContainer}>
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                size={48}
                interactive
              />
            </View>
            
            <View style={[styles.ratingBadge, { backgroundColor: getRatingDescription(rating).color + '20' }]}>
              <Ionicons name={getRatingDescription(rating).icon as any} size={20} color={getRatingDescription(rating).color} />
              <Text style={[styles.ratingDescription, { color: getRatingDescription(rating).color }]}>
                {getRatingDescription(rating).text}
              </Text>
            </View>
          </View>

          {/* Comment Card */}
          <View style={styles.commentCard}>
            <View style={styles.cardHeader}>
                <View style={styles.cardIconBadge}>
                  <Ionicons name="chatbox-ellipses" size={20} color="#667eea" />
                </View>
                <Text style={styles.cardTitle}>Your Detailed Review</Text>
              </View>
              
              <Text style={styles.commentInstructions}>
                {getPlaceholderText()}
              </Text>
              
              <View style={[
                styles.commentInputContainer,
                rating === 0 && styles.inputDisabled,
                comment.length >= 10 && styles.inputValid
              ]}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Share your experience in detail..."
                  placeholderTextColor={Colors.neutral[400]}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                  editable={rating > 0}
                />
              </View>
              
              <View style={styles.commentFooter}>
                <View style={styles.commentMeta}>
                  <Ionicons 
                    name={comment.length < 10 ? "alert-circle" : "checkmark-circle"} 
                    size={16} 
                    color={comment.length < 10 ? "#FF9500" : "#34C759"} 
                  />
                  <Text style={[styles.characterCount, comment.length < 10 && styles.warningText]}>
                    {comment.length}/500 characters
                  </Text>
                </View>
                <Text style={[styles.minChars, comment.length >= 10 && styles.validText]}>
                  Min 10 required
                </Text>
              </View>
          </View>

          {/* Guidelines Card */}
          <View style={styles.guidelinesCard}>
            <LinearGradient
              colors={['rgba(255, 204, 0, 0.1)', 'rgba(255, 149, 0, 0.05)']}
              style={styles.guidelinesGradient}
            >
              <View style={styles.guidelinesHeader}>
                <View style={styles.guidelinesIconBadge}>
                  <Ionicons name="information-circle" size={20} color="#FF9500" />
                </View>
                <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
              </View>
              
              <View style={styles.guidelinesList}>
                {[
                  { icon: 'checkmark-circle', text: 'Be honest and constructive' },
                  { icon: 'briefcase', text: 'Focus on work quality' },
                  { icon: 'shield-checkmark', text: 'Stay professional' },
                  { icon: 'people', text: 'Help others decide' },
                ].map((item, index) => (
                  <View key={index} style={styles.guideline}>
                    <Ionicons name={item.icon as any} size={18} color="#FF9500" />
                    <Text style={styles.guidelineText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={rating === 0 || comment.trim().length < 10 || isSubmitting}
              activeOpacity={0.8}
              style={styles.submitButtonWrapper}
            >
              <LinearGradient
                colors={
                  rating === 0 || comment.trim().length < 10 || isSubmitting
                    ? ['#E5E5EA', '#D1D1D6']
                    : ['#667eea', '#764ba2']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {isSubmitting ? (
                  <>
                    <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  
  // Gradient Header
  gradientHeader: {
    paddingBottom: Spacing[5],
    paddingTop: Platform.OS === 'android' ? Spacing[6] : 0,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  headerIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  
  // Scroll View
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  
  // Hero Card (Job Info)
  heroCard: {
    marginBottom: Spacing[4],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Shadows.base,
  },
  heroGradient: {
    padding: Spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginRight: Spacing[4],
    ...Shadows.base,
  },
  jobIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobInfo: {
    flex: 1,
  },
  jobLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
  },
  revieweeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  revieweeIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revieweeName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#667eea',
  },
  
  // Rating Card
  ratingCard: {
    marginBottom: Spacing[4],
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    backgroundColor: '#FFFFFF',
    ...Shadows.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  cardIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
  },
  ratingDescription: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  
  // Comment Card
  commentCard: {
    marginBottom: Spacing[4],
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    backgroundColor: '#FFFFFF',
    ...Shadows.base,
  },
  commentInstructions: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[3],
    lineHeight: 20,
  },
  commentInputContainer: {
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral[50],
    marginBottom: Spacing[3],
    minHeight: 140,
  },
  inputDisabled: {
    backgroundColor: Colors.neutral[100],
    borderColor: Colors.neutral[300],
    opacity: 0.6,
  },
  inputValid: {
    borderColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
  },
  commentInput: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    padding: Spacing[4],
    minHeight: 140,
    textAlignVertical: 'top',
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  characterCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
  },
  minChars: {
    fontSize: Typography.fontSize.xs,
    color: '#FF9500',
  },
  validText: {
    color: '#34C759',
  },
  warningText: {
    color: '#FF9500',
    fontWeight: Typography.fontWeight.semibold as any,
  },
  
  // Guidelines Card
  guidelinesCard: {
    marginBottom: Spacing[4],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Shadows.base,
  },
  guidelinesGradient: {
    padding: Spacing[5],
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  guidelinesIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidelinesTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
  },
  guidelinesList: {
    gap: Spacing[3],
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  guidelineText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[700],
    lineHeight: 20,
  },
  
  // Submit Button Container
  submitContainer: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[6],
  },
  submitButtonWrapper: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
    elevation: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[6],
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    letterSpacing: 0.5,
  },
});

export default ReviewSubmissionScreen;