import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { JobFilters } from '@/types';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';

interface JobFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: JobFilters) => void;
  initialFilters?: JobFilters;
}

const JOB_CATEGORIES = [
  'construction',
  'cleaning',
  'plumbing',
  'electrical',
  'hvac',
  'landscaping',
  'painting',
  'carpentry',
  'roofing',
  'flooring',
  'other',
];

const SORT_OPTIONS = [
  { value: 'date', label: 'Date Posted' },
  { value: 'budget', label: 'Budget' },
  { value: 'distance', label: 'Distance' },
];

export const JobFiltersModal: React.FC<JobFiltersProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<JobFilters>(initialFilters);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
  };

  const updateFilter = (key: keyof JobFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Filter Jobs</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetButton}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Category Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              {JOB_CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    filters.category === category && styles.categoryChipSelected,
                  ]}
                  onPress={() => updateFilter('category', 
                    filters.category === category ? undefined : category
                  )}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      filters.category === category && styles.categoryChipTextSelected,
                    ]}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <AddressAutocomplete
              value={filters.location || ''}
              onChangeText={(text) => updateFilter('location', text)}
              onAddressSelect={(address) => {
                updateFilter('location', address.formattedAddress || address.address);
                updateFilter('userLatitude', address.coordinates.latitude);
                updateFilter('userLongitude', address.coordinates.longitude);
              }}
              placeholder="Enter city, state, or zip code"
              style={styles.addressInput}
            />
          </View>

          {/* Budget Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Range</Text>
            <View style={styles.budgetRow}>
              <View style={styles.budgetInput}>
                <Text style={styles.budgetLabel}>Min ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={filters.budgetMin?.toString() || ''}
                  onChangeText={(text) => updateFilter('budgetMin', 
                    text ? parseInt(text) : undefined
                  )}
                />
              </View>
              <View style={styles.budgetInput}>
                <Text style={styles.budgetLabel}>Max ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="No limit"
                  keyboardType="numeric"
                  value={filters.budgetMax?.toString() || ''}
                  onChangeText={(text) => updateFilter('budgetMax', 
                    text ? parseInt(text) : undefined
                  )}
                />
              </View>
            </View>
          </View>

          {/* Distance Radius */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distance Radius (miles)</Text>
            <View style={styles.radiusOptions}>
              {[5, 10, 25, 50, 100].map(radius => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.radiusChip,
                    filters.radius === radius && styles.radiusChipSelected,
                  ]}
                  onPress={() => updateFilter('radius', 
                    filters.radius === radius ? undefined : radius
                  )}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      filters.radius === radius && styles.radiusChipTextSelected,
                    ]}
                  >
                    {radius} mi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            {SORT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOption}
                onPress={() => updateFilter('sortBy', option.value)}
              >
                <View style={styles.sortOptionContent}>
                  <Text style={styles.sortOptionText}>{option.label}</Text>
                  <View style={[
                    styles.radio,
                    filters.sortBy === option.value && styles.radioSelected,
                  ]} />
                </View>
              </TouchableOpacity>
            ))}

            {filters.sortBy && (
              <View style={styles.sortOrderSection}>
                <Text style={styles.sortOrderTitle}>Order</Text>
                <View style={styles.sortOrderOptions}>
                  <TouchableOpacity
                    style={[
                      styles.sortOrderChip,
                      filters.sortOrder === 'asc' && styles.sortOrderChipSelected,
                    ]}
                    onPress={() => updateFilter('sortOrder', 'asc')}
                  >
                    <Text
                      style={[
                        styles.sortOrderChipText,
                        filters.sortOrder === 'asc' && styles.sortOrderChipTextSelected,
                      ]}
                    >
                      Ascending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortOrderChip,
                      filters.sortOrder === 'desc' && styles.sortOrderChipSelected,
                    ]}
                    onPress={() => updateFilter('sortOrder', 'desc')}
                  >
                    <Text
                      style={[
                        styles.sortOrderChipText,
                        filters.sortOrder === 'desc' && styles.sortOrderChipTextSelected,
                      ]}
                    >
                      Descending
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resetButton: {
    fontSize: 16,
    color: '#2196F3',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetInput: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  radiusChipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  radiusChipText: {
    fontSize: 14,
    color: '#666',
  },
  radiusChipTextSelected: {
    color: '#fff',
  },
  sortOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  radioSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  sortOrderSection: {
    marginTop: 12,
  },
  sortOrderTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  sortOrderOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOrderChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortOrderChipSelected: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  sortOrderChipText: {
    fontSize: 14,
    color: '#666',
  },
  sortOrderChipTextSelected: {
    color: '#fff',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressInput: {
    marginBottom: 0,
  },
});

export default JobFiltersModal;