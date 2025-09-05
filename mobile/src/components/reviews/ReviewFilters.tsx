import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReviewFilters as ReviewFiltersType } from '../../types';
import { StarRating } from './StarRating';

interface ReviewFiltersProps {
  filters: ReviewFiltersType;
  onFiltersChange: (filters: ReviewFiltersType) => void;
  onClearFilters: () => void;
}

export const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const handleRatingFilter = (rating: number) => {
    const newRating = filters.rating === rating ? undefined : rating;
    onFiltersChange({ ...filters, rating: newRating });
  };

  const handleSortChange = (sortBy: 'date' | 'rating') => {
    const newSortOrder = 
      filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    onFiltersChange({ ...filters, sortBy, sortOrder: newSortOrder });
  };

  const hasActiveFilters = filters.rating !== undefined || 
    filters.sortBy !== undefined || 
    filters.status !== undefined;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filter Reviews</Text>
        {hasActiveFilters && (
          <TouchableOpacity onPress={onClearFilters} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Rating Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filter by Rating</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.ratingFilters}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingFilter,
                  filters.rating === rating && styles.activeRatingFilter,
                ]}
                onPress={() => handleRatingFilter(rating)}
              >
                <StarRating rating={rating} size={16} />
                <Text style={[
                  styles.ratingFilterText,
                  filters.rating === rating && styles.activeRatingFilterText,
                ]}>
                  {rating} star{rating !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sort by</Text>
        <View style={styles.sortOptions}>
          <TouchableOpacity
            style={[
              styles.sortOption,
              filters.sortBy === 'date' && styles.activeSortOption,
            ]}
            onPress={() => handleSortChange('date')}
          >
            <Ionicons 
              name="calendar-outline" 
              size={16} 
              color={filters.sortBy === 'date' ? '#007AFF' : '#666'} 
            />
            <Text style={[
              styles.sortOptionText,
              filters.sortBy === 'date' && styles.activeSortOptionText,
            ]}>
              Date
            </Text>
            {filters.sortBy === 'date' && (
              <Ionicons
                name={filters.sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#007AFF"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              filters.sortBy === 'rating' && styles.activeSortOption,
            ]}
            onPress={() => handleSortChange('rating')}
          >
            <Ionicons 
              name="star-outline" 
              size={16} 
              color={filters.sortBy === 'rating' ? '#007AFF' : '#666'} 
            />
            <Text style={[
              styles.sortOptionText,
              filters.sortBy === 'rating' && styles.activeSortOptionText,
            ]}>
              Rating
            </Text>
            {filters.sortBy === 'rating' && (
              <Ionicons
                name={filters.sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#007AFF"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  ratingFilters: {
    flexDirection: 'row',
  },
  ratingFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeRatingFilter: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  ratingFilterText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  activeRatingFilterText: {
    color: '#fff',
  },
  sortOptions: {
    flexDirection: 'row',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeSortOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 4,
  },
  activeSortOptionText: {
    color: '#007AFF',
    fontWeight: '500',
  },
});