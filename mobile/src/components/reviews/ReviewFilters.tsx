import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from './StarRating';

import { ReviewFilters as ReviewFiltersType } from '@/types';

interface ReviewFiltersProps {
  filters: ReviewFiltersType;
  onFiltersChange: (filters: ReviewFiltersType) => void;
}

const ReviewFilters: React.FC<ReviewFiltersProps> = ({ filters, onFiltersChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const handleRatingChange = (rating: number) => {
    const newRating = tempFilters.rating === rating ? undefined : rating;
    setTempFilters({ ...tempFilters, rating: newRating });
  };

  const handleSortChange = (sortBy: 'date' | 'rating') => {
    const newSortOrder = tempFilters.sortBy === sortBy && tempFilters.sortOrder === 'desc' ? 'asc' : 'desc';
    setTempFilters({ ...tempFilters, sortBy, sortOrder: newSortOrder });
  };

  const applyFilters = () => {
    onFiltersChange(tempFilters);
    setShowModal(false);
  };

  const clearAllFilters = () => {
    const clearedFilters: ReviewFiltersType = {
      rating: undefined,
      sortBy: 'date',
      sortOrder: 'desc',
    };
    setTempFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setShowModal(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.rating !== undefined) count++;
    if (filters.sortBy !== 'date' || filters.sortOrder !== 'desc') count++;
    return count;
  };

  const getFilterSummary = () => {
    const parts = [];
    if (filters.rating) {
      parts.push(`${filters.rating}+ stars only`);
    } else {
      parts.push('All ratings');
    }
    
    if (filters.sortBy === 'rating') {
      parts.push('sorted by highest rated');
    } else {
      parts.push('sorted by most recent');
    }
    
    return parts.join(' • ');
  };

  return (
    <>
      <TouchableOpacity style={styles.compactContainer} onPress={() => setShowModal(true)}>
        <View style={styles.filterButton}>
          <Ionicons name="options-outline" size={20} color="#007AFF" />
          <Text style={styles.filterButtonText}>Filters</Text>
          {getActiveFiltersCount() > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.filterSummary}>{getFilterSummary()}</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Review Filters</Text>
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Rating Filter Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filter by Rating</Text>
              <Text style={styles.sectionDescription}>Show reviews with this rating or higher</Text>
              <View style={styles.ratingChips}>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingChip,
                      tempFilters.rating === rating && styles.activeRatingChip,
                    ]}
                    onPress={() => handleRatingChange(rating)}
                    activeOpacity={0.7}
                  >
                    <StarRating rating={rating} size={16} />
                    <Text style={[
                      styles.ratingChipText,
                      tempFilters.rating === rating && styles.activeRatingChipText,
                    ]}>
                      {rating}+ stars
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Options Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort Reviews</Text>
              <Text style={styles.sectionDescription}>Choose how to order the reviews</Text>
              
              <View style={styles.sortOptions}>
                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    tempFilters.sortBy === 'date' && styles.activeSortOption,
                  ]}
                  onPress={() => setTempFilters({ ...tempFilters, sortBy: 'date' })}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={tempFilters.sortBy === 'date' ? '#007AFF' : '#666'} 
                  />
                  <Text style={[
                    styles.sortOptionText,
                    tempFilters.sortBy === 'date' && styles.activeSortOptionText,
                  ]}>
                    Most Recent
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    tempFilters.sortBy === 'rating' && styles.activeSortOption,
                  ]}
                  onPress={() => setTempFilters({ ...tempFilters, sortBy: 'rating' })}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="star-outline" 
                    size={20} 
                    color={tempFilters.sortBy === 'rating' ? '#007AFF' : '#666'} 
                  />
                  <Text style={[
                    styles.sortOptionText,
                    tempFilters.sortBy === 'rating' && styles.activeSortOptionText,
                  ]}>
                    Highest Rated
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filterSummary: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  clearButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  ratingChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
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
  sortOptions: {
    gap: 12,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activeSortOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  sortOptionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  activeSortOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { ReviewFilters };
