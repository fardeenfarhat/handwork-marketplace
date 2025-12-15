import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../../components/common';
import { 
  ReviewCard, 
  RatingSummary, 
  ReviewFiltersInline,
  StarRating 
} from '../../components/reviews';
import { 
  Review, 
  ReviewResponse,
  ReviewFilters as ReviewFiltersType, 
  RatingSummary as RatingSummaryType,
  ReviewStackParamList
} from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';
import { RootState } from '@/store';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { apiService } from '../../services/api';

const { width } = Dimensions.get('window');

type ReviewsListScreenRouteProp = RouteProp<ReviewStackParamList, 'ReviewsList'>;

export const ReviewsListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReviewsListScreenRouteProp>();
  const { userId } = route.params || {};
  const { handleError } = useErrorHandler();
  const { user } = useSelector((state: RootState) => state.auth);

  const [originalReviews, setOriginalReviews] = useState<Review[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummaryType | null>(null);
  const [filters, setFilters] = useState<ReviewFiltersType>({
    rating: undefined,
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Function to apply filters and sorting locally
  const applyFiltersAndSorting = (reviewsList: Review[], currentFilters: ReviewFiltersType): Review[] => {
    let filteredReviews = [...reviewsList];

    // Apply rating filter
    if (currentFilters.rating) {
      filteredReviews = filteredReviews.filter(review => review.rating >= currentFilters.rating!);
    }

    // Apply sorting
    filteredReviews.sort((a, b) => {
      if (currentFilters.sortBy === 'rating') {
        return currentFilters.sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating;
      } else {
        // Sort by date
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return currentFilters.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
    });

    return filteredReviews;
  };

  useEffect(() => {
    loadReviews();
  }, [userId]); // Only reload from API when userId changes

  // Apply filters locally when filters change
  useEffect(() => {
    if (originalReviews.length > 0) {
      const filteredAndSorted = applyFiltersAndSorting(originalReviews, filters);
      setReviews(filteredAndSorted);
    }
  }, [filters, originalReviews]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      
      // For "My Reviews", show reviews about the user (reviewee_id)
      const apiFilters = {
        ...filters,
        ...(userId && { reviewee_id: userId }),
        sortBy: filters.sortBy || 'date',
        sortOrder: filters.sortOrder || 'desc'
      };
      
      console.log('Loading reviews with filters:', apiFilters);
      
      // Call API service to get reviews
      const reviewsData = await apiService.getReviews(apiFilters);
      const reviewsList = reviewsData.reviews || [];
      
      // Store original reviews and apply filters
      setOriginalReviews(reviewsList);
      const filteredAndSorted = applyFiltersAndSorting(reviewsList, filters);
      setReviews(filteredAndSorted);
      // Note: ratingSummary not included in current API response
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReviews();
  };

  const handleReportReview = async (reviewId: number, reason: string) => {
    try {
      console.log('Reporting review:', reviewId, reason);
      
      await apiService.reportReview(reviewId, reason);
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, isReported: true, reportReason: reason }
          : review
      ));
    } catch (error) {
      handleError(error);
    }
  };

  // Removed respond functionality as backend endpoint doesn't exist

  const clearFilters = () => {
    setFilters({
      rating: undefined,
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  // Removed review detail navigation as current cards show sufficient detail

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCardWrapper}>
      {/* Gradient Border Effect */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.reviewCardBorder}
      >
        <View style={styles.reviewCardInner}>
          {/* Subtle Background Gradient */}
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.02)', 'rgba(118, 75, 162, 0.05)', 'rgba(102, 126, 234, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reviewCardGradient}
          >
            <View style={styles.reviewCardContent}>
              {/* Decorative Corner Accent */}
              <View style={styles.cornerAccent}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.cornerAccentGradient}
                />
              </View>

              {/* Reviewer Header */}
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerBadge}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.reviewerBadgeGradient}
                  >
                    <Ionicons name="person" size={22} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>{item.reviewerName}</Text>
                  <View style={styles.jobTitleRow}>
                    <Ionicons name="briefcase-outline" size={14} color={Colors.neutral[500]} />
                    <Text style={styles.jobTitle}>{item.jobTitle}</Text>
                  </View>
                </View>
                <View style={styles.ratingBadge}>
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.15)']}
                    style={styles.ratingBadgeGradient}
                  >
                    <Ionicons name="star" size={18} color="#FFD700" />
                    <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                  </LinearGradient>
                </View>
              </View>

              {/* Star Rating with Date */}
              <View style={styles.ratingSection}>
                <View style={styles.starsWrapper}>
                  <StarRating rating={item.rating} size={20} />
                </View>
                <View style={styles.dateBadge}>
                  <Ionicons name="time-outline" size={12} color={Colors.neutral[500]} />
                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>

              {/* Comment Section with Quote Design */}
              <View style={styles.commentSection}>
                <Ionicons name="chatbox-ellipses" size={14} color="#667eea" style={{ opacity: 0.3, marginRight: 8 }} />
                <Text style={styles.commentText}>{item.comment}</Text>
              </View>

              {/* Response Section */}
              {item.response && (
                <View style={styles.responseSection}>
                  <LinearGradient
                    colors={['rgba(17, 153, 142, 0.1)', 'rgba(56, 239, 125, 0.08)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.responseGradient}
                  >
                    {/* Decorative Left Border */}
                    <View style={styles.responseLeftBorder}>
                      <LinearGradient
                        colors={['#11998E', '#38EF7D']}
                        style={styles.responseLeftBorderGradient}
                      />
                    </View>
                    
                    <View style={styles.responseContent}>
                      <View style={styles.responseHeader}>
                        <View style={styles.responseIconBadge}>
                          <LinearGradient
                            colors={['#11998E', '#38EF7D']}
                            style={styles.responseIconBadgeGradient}
                          >
                            <Ionicons name="chatbubble-ellipses" size={11} color="#FFFFFF" />
                          </LinearGradient>
                        </View>
                        <Text style={styles.responseLabel}>Response</Text>
                        <View style={styles.responseDivider} />
                        <Text style={styles.responderName}>{item.response.responderName}</Text>
                      </View>
                      <Text style={styles.responseText}>{item.response.response}</Text>
                      <View style={styles.responseDateContainer}>
                        <Ionicons name="checkmark-circle" size={12} color="#11998E" />
                        <Text style={styles.responseDateText}>{formatDate(item.response.createdAt)}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              )}

              {/* Actions Footer */}
              {(user?.id !== item.reviewerId || item.isReported) && (
                <View style={styles.reviewActions}>
                  {user?.id !== item.reviewerId && !item.isReported && (
                    <TouchableOpacity
                      style={styles.reportButton}
                      onPress={() => handleReportReview(item.id, 'Inappropriate content')}
                    >
                      <LinearGradient
                        colors={['rgba(255, 59, 48, 0.1)', 'rgba(255, 59, 48, 0.05)']}
                        style={styles.reportButtonGradient}
                      >
                        <Ionicons name="flag-outline" size={16} color="#FF3B30" />
                        <Text style={styles.reportButtonText}>Report</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  {item.isReported && (
                    <View style={styles.reportedBadge}>
                      <LinearGradient
                        colors={['rgba(255, 149, 0, 0.15)', 'rgba(255, 149, 0, 0.08)']}
                        style={styles.reportedBadgeGradient}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#FF9500" />
                        <Text style={styles.reportedText}>Reported</Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {ratingSummary && (
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 193, 7, 0.05)']}
            style={styles.summaryGradient}
          >
            <RatingSummary ratingSummary={ratingSummary} />
          </LinearGradient>
        </View>
      )}
      
      <View style={styles.statsBar}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statsGradient}
        >
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.statsCount}>{reviews.length}</Text>
              <Text style={styles.statsLabel}>Review{reviews.length !== 1 ? 's' : ''}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.filterButtonModern}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name={showFilters ? "close-circle" : "options"} size={20} color="#FFFFFF" />
              <Text style={styles.filterButtonTextModern}>
                {showFilters ? 'Close' : 'Filter'}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
      
      {showFilters && (
        <View style={styles.filtersCard}>
          <ReviewFiltersInline
            filters={filters}
            onFiltersChange={setFilters}
          />
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.05)']}
        style={styles.emptyGradient}
      >
        <View style={styles.emptyIconBadge}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.emptyIconGradientBg}
          >
            <Ionicons name="star-outline" size={48} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <Text style={styles.emptyStateTitle}>No Reviews Yet</Text>
        <Text style={styles.emptyStateText}>
          Reviews will appear here once jobs are completed and rated.
        </Text>
      </LinearGradient>
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <View style={styles.loadingIconBadge}>
              <Ionicons name="star" size={32} color="#667eea" />
            </View>
            <ActivityIndicator size="large" color="#FFFFFF" style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

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
              <Ionicons name="star" size={24} color="#667eea" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Reviews</Text>
              <Text style={styles.headerSubtitle}>Feedback & ratings</Text>
            </View>
          </View>
        </View>
        
        {/* Decorative circles */}
        <View style={[styles.decorativeCircle, { top: -20, right: -20, width: 100, height: 100, opacity: 0.1 }]} />
        <View style={[styles.decorativeCircle, { bottom: 10, left: 30, width: 60, height: 60, opacity: 0.15 }]} />
      </LinearGradient>

      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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

  // Header Container & Summary
  headerContainer: {
    marginBottom: Spacing[1],
  },
  summaryCard: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    marginBottom: Spacing[2],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Shadows.base,
  },
  summaryGradient: {
    padding: Spacing[4],
  },
  
  // Stats Bar
  statsBar: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.base,
  },
  statsGradient: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  statsCount: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
  statsLabel: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  filterButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.full,
  },
  filterButtonTextModern: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#FFFFFF',
  },
  
  // Filters Card
  filtersCard: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    ...Shadows.base,
  },

  // List Content
  listContent: {
    paddingTop: Spacing[3],
    paddingBottom: Spacing[6],
  },

  // Review Card
  reviewCardWrapper: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
  },
  reviewCardBorder: {
    borderRadius: BorderRadius.xl,
    padding: 1.5,
    ...Shadows.lg,
  },
  reviewCardInner: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  reviewCardGradient: {
    borderRadius: BorderRadius.xl,
  },
  reviewCardContent: {
    padding: Spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    position: 'relative',
  },
  
  // Decorative Corner Accent
  cornerAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    overflow: 'hidden',
    borderTopRightRadius: BorderRadius.xl,
  },
  cornerAccentGradient: {
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  
  // Review Header
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  reviewerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: Spacing[3],
    ...Shadows.base,
  },
  reviewerBadgeGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  jobTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    fontWeight: Typography.fontWeight.medium as any,
  },
  
  // Rating Badge
  ratingBadge: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.base,
  },
  ratingBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  ratingText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
  },
  
  // Rating Section
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  starsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.lg,
  },
  dateText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
    fontWeight: Typography.fontWeight.medium as any,
  },
  
  // Comment Section
  commentSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing[3],
  },
  commentText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[700],
    lineHeight: 24,
    fontStyle: 'italic',
  },
  
  // Response Section
  responseSection: {
    marginTop: Spacing[3],
    marginBottom: Spacing[3],
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.base,
  },
  responseGradient: {
    position: 'relative',
  },
  responseLeftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  responseLeftBorderGradient: {
    width: '100%',
    height: '100%',
  },
  responseContent: {
    paddingLeft: Spacing[4],
    paddingRight: Spacing[3],
    paddingVertical: Spacing[3],
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
    gap: Spacing[2],
  },
  responseIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
  },
  responseIconBadgeGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responseLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#11998E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  responseDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.neutral[300],
  },
  responderName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[700],
    flex: 1,
    lineHeight: 18,
  },
  responseText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[700],
    lineHeight: 20,
    marginBottom: Spacing[2],
  },
  responseDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseDateText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
  },
  
  // Review Actions
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: Spacing[3],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  reportButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  reportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  reportButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#FF3B30',
  },
  reportedBadge: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  reportedBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  reportedText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#FF9500',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[4],
    ...Shadows.lg,
  },
  loadingSpinner: {
    marginVertical: Spacing[4],
  },
  loadingText: {
    fontSize: Typography.fontSize.lg,
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.semibold as any,
  },
  
  // Empty State
  emptyState: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[8],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Shadows.base,
  },
  emptyGradient: {
    padding: Spacing[8],
    alignItems: 'center',
  },
  emptyIconBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: Spacing[5],
    ...Shadows.lg,
  },
  emptyIconGradientBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing[4],
  },
});

export default ReviewsListScreen;