import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { MockIcon as Icon } from '@/components/common/MockIcon';
import { JobFilters } from '@/types';
import { locationService, LocationCoordinates } from '@/services/location';

interface JobFiltersAdvancedProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: JobFilters) => void;
  initialFilters?: JobFilters;
  userRole: 'client' | 'worker';
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
  { value: 'rating', label: 'Client Rating' },
];

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export const JobFiltersAdvanced: React.FC<JobFiltersAdvancedProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
  userRole,
}) => {
  const [filters, setFilters] = useState<JobFilters>(initialFilters);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
      const cachedLocation = locationService.getCachedLocation();
      if (cachedLocation) {
        setCurrentLocation(cachedLocation);
      }
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    const finalFilters = { ...filters };
    
    // Add location coordinates if using current location
    if (useCurrentLocation && currentLocation) {
      finalFilters.userLatitude = currentLocation.latitude;
      finalFilters.userLongitude = currentLocation.longitude;
    }
    
    onApply(finalFilters);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
    setUseCurrentLocation(false);
  };

  const updateFilter = (key: keyof JobFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleGetCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      setUseCurrentLocation(true);
      Alert.alert('Success', 'Current location obtained successfully!');
    } catch (error) {
      Alert.alert('Error', 'Could not get your current location. Please check your location settings.');
      setUseCurrentLocation(false);
    } finally {
      setLocationLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    updateFilter('category', filters.category === category ? undefined : category);
  };

  const toggleRadius = (radius: number) => {
    updateFilter('radius', filters.radius === radius ? undefined : radius);
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key => {
      const value = filters[key as keyof JobFilters];
      return value !== undefined && value !== '' && value !== null;
    }).length;
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
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Filter Jobs</Text>
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filtersBadge}>
                <Text style={styles.filtersBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetButton}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                  onPress={() => toggleCategory(category)}
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
            
            {/* Current Location Toggle */}
            {userRole === 'worker' && (
              <View style={styles.locationToggle}>
                <View style={styles.locationToggleContent}>
                  <Icon name="my-location" size={20} color="#2196F3" />
                  <Text style={styles.locationToggleText}>Use my current location</Text>
                </View>
                <Switch
                  value={useCurrentLocation}
                  onValueChange={(value) => {
                    if (value && !currentLocation) {
                      handleGetCurrentLocation();
                    } else {
                      setUseCurrentLocation(value);
                    }
                  }}
                  trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
                  thumbColor={useCurrentLocation ? '#fff' : '#f4f3f4'}
                />
              </View>
            )}

            {/* Get Location Button */}
            {userRole === 'worker' && !currentLocation && (
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetCurrentLocation}
                disabled={locationLoading}
              >
                <Icon name="location-searching" size={20} color="#2196F3" />
                <Text style={styles.locationButtonText}>
                  {locationLoading ? 'Getting location...' : 'Get Current Location'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Location Status */}
            {currentLocation && (
              <View style={styles.locationStatus}>
                <Icon name="location-on" size={16} color="#4CAF50" />
                <Text style={styles.locationStatusText}>
                  Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
              </View>
            )}

            {/* Manual Location Input */}
            <TextInput
              style={styles.input}
              placeholder="Enter city, state, or zip code"
              value={filters.location || ''}
              onChangeText={(text) => updateFilter('location', text)}
              editable={!useCurrentLocation}
            />
          </View>

          {/* Distance Radius (only for workers) */}
          {userRole === 'worker' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distance Radius</Text>
              <Text style={styles.sectionSubtitle}>
                {useCurrentLocation ? 'Jobs within this distance from your location' : 'Maximum distance from specified location'}
              </Text>
              <View style={styles.radiusOptions}>
                {RADIUS_OPTIONS.map(radius => (
                  <TouchableOpacity
                    key={radius}
                    style={[
                      styles.radiusChip,
                      filters.radius === radius && styles.radiusChipSelected,
                    ]}
                    onPress={() => toggleRadius(radius)}
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
          )}

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

          {/* Job Status Filter (for clients) */}
          {userRole === 'client' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Status</Text>
              <View style={styles.statusOptions}>
                {['open', 'assigned', 'in_progress', 'completed'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      filters.status === status && styles.statusChipSelected,
                    ]}
                    onPress={() => updateFilter('status', 
                      filters.status === status ? undefined : status
                    )}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        filters.status === status && styles.statusChipTextSelected,
                      ]}
                    >
                      {status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
                      {filters.sortBy === 'date' ? 'Oldest First' : 'Low to High'}
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
                      {filters.sortBy === 'date' ? 'Newest First' : 'High to Low'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>
              Apply Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            </Text>
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filtersBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filtersBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
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
  locationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  locationToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationToggleText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginBottom: 12,
  },
  locationButtonText: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 8,
    fontWeight: '500',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0fff0',
    borderRadius: 6,
    marginBottom: 12,
  },
  locationStatusText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
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
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusChipSelected: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  statusChipText: {
    fontSize: 12,
    color: '#666',
  },
  statusChipTextSelected: {
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
});

export default JobFiltersAdvanced;