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
  ReviewStackParamList 
} from '../../types';
import { useErrorHandler } from '../../hooks/useErrorHandler';

type ReviewsListScreenRouteProp = RouteProp<ReviewStackParamList, 'ReviewsList'>;

export const ReviewsListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReviewsListScreenRouteProp>();
  const { userId } = route.params || {};
  const { handleError } = useErrorHandler();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummaryType | null>(null);
  const [filters, setFilters] = useState<ReviewFiltersType>({
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Mock data - replace with actual API calls
  const mockReviews: Review[] = [
    {
      id: 1,
      bookingId: 1,
      reviewerId: 2,
      revieweeId: 1,
      reviewerName: 'Sarah Johnson',
      revieweeName: 'Mike Wilson',
      jobTitle: 'Kitchen Plumbing Repair',
      rating: 5,
      comment: 'Excellent work! Mike was professional, punctual, and fixed the issue quickly. The kitchen sink is working perfectly now. Highly recommend!',
      status: 'approved',
      createdAt: '2024-01-15T10:30:00Z',
      response: {
        id: 1,
        reviewId: 1,
        responderId: 1,
        responderName: 'Mike Wilson',
        response: 'Thank you Sarah! It was a pleasure working on your kitchen. Glad I could help resolve the plumbing issue quickly.',
        createdAt: '2024-01-15T14:20:00Z',
      },
    },
    {
      id: 2,
      bookingId: 2,
      reviewerId: 3,
      revieweeId: 1,
      reviewerName: 'David Chen',
      revieweeName: 'Mike Wilson',
      jobTitle: 'Bathroom Faucet Installation',
      rating: 4,
      comment: 'Good work overall. Mike installed the new faucet properly and cleaned up after himself. Only minor issue was he arrived 30 minutes late, but he called ahead to let me know.',
      status: 'approved',
      createdAt: '2024-01-10T16:45:00Z',
    },
    {
      id: 3,
      bookingId: 3,
      reviewerId: 4,
      revieweeId: 1,
      reviewerName: 'Lisa Martinez',
      revieweeName: 'Mike Wilson',
      jobTitle: 'Toilet Repair',
      rating: 5,
      comment: 'Outstanding service! Mike diagnosed the problem immediately and had it fixed in no time. Very knowledgeable and fair pricing. Will definitely hire again.',
      status: 'approved',
      createdAt: '2024-01-08T09:15:00Z',
    },
  ];

  const mockRatingSummary: RatingSummaryType = {
    averageRating: 4.7,
    totalReviews: 3,
    ratingDistribution: {
      5: 2,
      4: 1,
      3: 0,
      2: 0,
      1: 0,
    },
  };

  useEffect(() => {
    loadReviews();
  }, [filters]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API call
      console.log('Loading reviews with filters:', filters);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let filteredReviews = [...mockReviews];
      
      // Apply rating filter
      if (filters.rating) {
        filteredReviews = filteredReviews.filter(review => review.rating === filters.rating);
      }
      
      // Apply sorting
      if (filters.sortBy === 'date') {
        filteredReviews.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return filters.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
      } else if (filters.sortBy === 'rating') {
        filteredReviews.sort((a, b) => {
          return filters.sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating;
        });
      }
      
      setReviews(filteredReviews);
      setRatingSummary(mockRatingSummary);
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
      // TODO: Replace with actual API call
      console.log('Reporting review:', reviewId, reason);
      
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
      // TODO: Replace with actual API call
      console.log('Responding to review:', reviewId, response);
      
      // Update local state
      const newResponse = {
        id: Date.now(),
        reviewId,
        responderId: 1, // Current user ID
        responderName: 'Mike Wilson', // Current user name
        response,
        createdAt: new Date().toISOString(),
      };
      
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
      currentUserId={1} // TODO: Get from auth context
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