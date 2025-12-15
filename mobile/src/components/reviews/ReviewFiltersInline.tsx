import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from './StarRating';
import { ReviewFilters as ReviewFiltersType } from '@/types';

interface ReviewFiltersProps {
  filters: ReviewFiltersType;
  onFiltersChange: (filters: ReviewFiltersType) => void;
}

const ReviewFiltersInline: React.FC<ReviewFiltersProps> = ({ filters, onFiltersChange }) => {
  const handleRatingChange = (rating: number) => {
    const newRating = filters.rating === rating ? undefined : rating;
    onFiltersChange({ ...filters, rating: newRating });
  };

  const handleSortChange = (sortBy: 'date' | 'rating') => {
    // If the same sort option is selected, toggle sort order
    if (filters.sortBy === sortBy) {
      const newSortOrder = filters.sortOrder === 'desc' ? 'asc' : 'desc';
      onFiltersChange({ ...filters, sortOrder: newSortOrder });
    } else {
      // If different sort option, use default descending order
      onFiltersChange({ ...filters, sortBy, sortOrder: 'desc' });
    }
  };

  const clearFilters = () => {
    onFiltersChange({ rating: undefined, sortBy: 'date', sortOrder: 'desc' } as ReviewFiltersType);
  };

  const hasActiveFilters = filters.rating !== undefined;

  return (
    <View style={styles.container}>
      {/* Rating Filter Chips */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Filter by Rating</Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.scrollContent}
        >
          {[5, 4, 3, 2, 1].map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.ratingChip,
                filters.rating === rating && styles.activeRatingChip,
              ]}
              onPress={() => handleRatingChange(rating)}
              activeOpacity={0.7}
            >
              <StarRating rating={rating} size={14} />
              <Text style={[
                styles.ratingChipText,
                filters.rating === rating && styles.activeRatingChipText,
              ]}>
                {rating}+
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sort by</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity
            style={[
              styles.sortChip,
              filters.sortBy === 'date' && styles.activeSortChip,
            ]}
            onPress={() => handleSortChange('date')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="time-outline" 
              size={16} 
              color={filters.sortBy === 'date' ? '#007AFF' : '#666'} 
            />
            <Text style={[
              styles.sortChipText,
              filters.sortBy === 'date' && styles.activeSortChipText,
            ]}>
              {filters.sortBy === 'date' 
                ? (filters.sortOrder === 'desc' ? 'Newest' : 'Oldest')
                : 'Recent'
              }
            </Text>
            {filters.sortBy === 'date' && (
              <Ionicons 
                name={filters.sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} 
                size={12} 
                color="#007AFF" 
                style={{ marginLeft: 4 }}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortChip,
              filters.sortBy === 'rating' && styles.activeSortChip,
            ]}
            onPress={() => handleSortChange('rating')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="star-outline" 
              size={16} 
              color={filters.sortBy === 'rating' ? '#007AFF' : '#666'} 
            />
            <Text style={[
              styles.sortChipText,
              filters.sortBy === 'rating' && styles.activeSortChipText,
            ]}>
              {filters.sortBy === 'rating' 
                ? (filters.sortOrder === 'desc' ? 'Highest Rated' : 'Lowest Rated')
                : 'Top Rated'
              }
            </Text>
            {filters.sortBy === 'rating' && (
              <Ionicons 
                name={filters.sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} 
                size={12} 
                color="#007AFF" 
                style={{ marginLeft: 4 }}
              />
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingRight: 16,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeRatingChip: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  ratingChipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeRatingChipText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeSortChip: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  sortChipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeSortChipText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export { ReviewFiltersInline };