import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { 
  ReviewCard, 
  RatingSummary, 
  ReviewFilters 
} from '../../components/reviews';
import { 
  Review, 
  ReviewFilters as ReviewFiltersType, 
  RatingSummary as RatingSummaryType,
  ReviewStackParamList,
  RootState
} from '../../types';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { apiService } from '../../services/api';

type ReviewsListScreenRouteProp = RouteProp<ReviewStackParamList, 'ReviewsList'>;

export const ReviewsListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReviewsListScreenRouteProp>();
  const { userId } = route.params || {};
  const { handleError } = useErrorHandler();
  const { user } = useSelector((state: RootState) => state.auth);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummaryType | null>(null);
  const [filters, setFilters] = useState<ReviewFiltersType>({
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);



  useEffect(() => {
    loadReviews();
  }, [filters]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      
      console.log('Loading reviews with filters:', filters);
      
      // Call API service to get reviews
      const reviewsData = await apiService.getReviews(userId, filters);
      setReviews(reviewsData.reviews);
      setRatingSummary(reviewsData.ratingSummary);
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

  const handleRespondToReview = async (reviewId: number, response: string) => {
    try {
      console.log('Responding to review:', reviewId, response);
      
      const newResponse = await apiService.respondToReview(reviewId, response);
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, response: newResponse }
          : review
      ));
    } catch (error) {
      handleError(error);
    }
  };

  const clearFilters = () => {
    setFilters({
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const renderReview = ({ item }: { item: Review }) => (
    <ReviewCard
      review={item}
      onReport={handleReportReview}
      onRespond={handleRespondToReview}
      currentUserId={user?.id}
    />
  );

  const renderHeader = () => (
    <View>
      {ratingSummary && (
        <View style={styles.summaryContainer}>
          <RatingSummary ratingSummary={ratingSummary} />
        </View>
      )}
      
      <View style={styles.filtersHeader}>
        <Text style={styles.reviewsCount}>
          {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color="#007AFF" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>
      
      {showFilters && (
        <ReviewFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
        />
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="star-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>No Reviews Yet</Text>
      <Text style={styles.emptyStateText}>
        Reviews will appear here once jobs are completed and rated.
      </Text>
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Reviews</Text>
      </View>

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
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  summaryContainer: {
    margin: 16,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  reviewsCount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
  },
});