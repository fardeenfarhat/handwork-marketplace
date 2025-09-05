import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { useSelector } from 'react-redux';

import { Job, JobFilters, JobsStackParamList } from '@/types';
import { RootState } from '@/store';
import { apiService } from '@/services/api';
import { JobCard } from '@/components/jobs/JobCard';
import { JobSearchBar } from '@/components/jobs/JobSearchBar';
import { JobFiltersAdvanced } from '@/components/jobs/JobFiltersAdvanced';
import { useLocation } from '@/hooks/useLocation';
import { locationService } from '@/services/location';
import { ErrorHandler } from '@/utils/errorHandler';

type JobsScreenNavigationProp = StackNavigationProp<JobsStackParamList, 'JobsList'>;

export default function JobsScreen() {
  const navigation = useNavigation<JobsScreenNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<JobFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const isWorker = user?.role === 'worker';
  const isClient = user?.role === 'client';
  
  const { currentLocation, getCurrentLocation, hasPermission, requestPermission } = useLocation();

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      
      // Include user location in filters if available
      const locationFilters = currentLocation ? {
        userLatitude: currentLocation.latitude,
        userLongitude: currentLocation.longitude,
      } : {};

      const response = await apiService.getJobs({
        ...filters,
        ...locationFilters,
        ...(searchQuery && { search: searchQuery }),
      });

      // Calculate distances and add coordinates for jobs
      const jobsWithLocation = await Promise.all(
        response.map(async (job) => {
          let jobWithCoords = { ...job };
          
          // If job doesn't have coordinates, try to geocode the location
          if (!job.latitude || !job.longitude) {
            try {
              const geocodeResult = await locationService.geocodeAddress(job.location);
              if (geocodeResult) {
                jobWithCoords.latitude = geocodeResult.coordinates.latitude;
                jobWithCoords.longitude = geocodeResult.coordinates.longitude;
              }
            } catch (error) {
              console.warn('Failed to geocode job location:', job.location);
            }
          }
          
          // Calculate distance if user location is available
          if (currentLocation && jobWithCoords.latitude && jobWithCoords.longitude) {
            const distance = locationService.calculateDistance(
              currentLocation,
              { latitude: jobWithCoords.latitude, longitude: jobWithCoords.longitude }
            );
            jobWithCoords.distance = distance;
          }
          
          return jobWithCoords;
        })
      );

      // Filter by radius if specified
      let filteredJobs = jobsWithLocation;
      if (filters.radius && currentLocation) {
        filteredJobs = locationService.filterJobsByLocation(
          jobsWithLocation,
          currentLocation,
          filters.radius
        );
      }

      setJobs(filteredJobs);
    } catch (error) {
      ErrorHandler.handle(error);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, currentLocation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }, [fetchJobs]);

  useEffect(() => {
    if (isWorker && hasPermission && !currentLocation) {
      getCurrentLocation();
    }
  }, [isWorker, hasPermission, currentLocation, getCurrentLocation]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleJobPress = (jobId: number) => {
    navigation.navigate('JobDetail', { jobId });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFiltersApply = (newFilters: JobFilters) => {
    setFilters(newFilters);
  };

  const switchToMapView = () => {
    navigation.navigate('JobMap' as any);
  };

  const requestLocationAccess = async () => {
    const granted = await requestPermission();
    if (granted) {
      await getCurrentLocation();
    } else {
      Alert.alert(
        'Location Access',
        'Enable location access to see nearby jobs and get distance information.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {/* Open settings */} },
        ]
      );
    }
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  const renderJob = ({ item }: { item: Job }) => (
    <JobCard
      job={item}
      onPress={handleJobPress}
      showDistance={isWorker}
      showApplicationsCount={isClient}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {searchQuery || hasActiveFilters ? 'No jobs found' : 'No jobs available'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || hasActiveFilters
          ? 'Try adjusting your search or filters'
          : isWorker
          ? 'Check back later for new opportunities'
          : 'Be the first to post a job!'
        }
      </Text>
      {isClient && !searchQuery && !hasActiveFilters && (
        <TouchableOpacity
          style={styles.postJobButton}
          onPress={() => navigation.navigate('JobPost')}
        >
          <Text style={styles.postJobButtonText}>Post a Job</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {isWorker ? 'Find Jobs' : 'My Jobs'}
        </Text>
        <Text style={styles.subtitle}>
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} available
        </Text>
      </View>
      
      <View style={styles.headerActions}>
        {isWorker && (
          <TouchableOpacity
            style={styles.mapButton}
            onPress={switchToMapView}
          >
            <Text style={styles.mapButtonText}>🗺️ Map</Text>
          </TouchableOpacity>
        )}
        
        {isClient && (
          <>
            <TouchableOpacity
              style={styles.postButton}
              onPress={() => navigation.navigate('JobPost')}
            >
              <Text style={styles.postButtonText}>Post Job</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => navigation.navigate('JobManagement')}
            >
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <JobSearchBar
        onSearch={handleSearch}
        onFilterPress={() => setShowFilters(true)}
        hasActiveFilters={hasActiveFilters}
        placeholder={isWorker ? 'Search jobs...' : 'Search my jobs...'}
      />

      {/* Location Access Prompt for Workers */}
      {isWorker && !hasPermission && (
        <View style={styles.locationPrompt}>
          <Text style={styles.locationPromptText}>
            Enable location access to see nearby jobs and distances
          </Text>
          <TouchableOpacity
            style={styles.locationPromptButton}
            onPress={requestLocationAccess}
          >
            <Text style={styles.locationPromptButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : undefined}
      />

      <JobFiltersAdvanced
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleFiltersApply}
        initialFilters={filters}
        userRole={user?.role || 'worker'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  postButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  manageButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  manageButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  mapButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  locationPrompt: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationPromptText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    marginRight: 12,
  },
  locationPromptButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  locationPromptButtonText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  postJobButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  postJobButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});