import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import { Job, JobFilters, JobsStackParamList } from '@/types';
import { RootState } from '@/store';
import { apiService } from '@/services/api';
import { locationService } from '@/services/location';
import { JobMap } from '@/components/common/JobMap';
import { JobSearchBar } from '@/components/jobs/JobSearchBar';
import { JobFiltersAdvanced } from '@/components/jobs/JobFiltersAdvanced';
import { useLocation } from '@/hooks/useLocation';
import { ErrorHandler } from '@/utils/errorHandler';

type JobMapScreenNavigationProp = StackNavigationProp<JobsStackParamList, 'JobsList'>;
type JobMapScreenRouteProp = RouteProp<JobsStackParamList, 'JobsList'>;

export default function JobMapScreen() {
  const navigation = useNavigation<JobMapScreenNavigationProp>();
  const route = useRoute<JobMapScreenRouteProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<JobFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  
  const { currentLocation, getCurrentLocation, hasPermission } = useLocation();
  const isWorker = user?.role === 'worker';

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

  useEffect(() => {
    if (hasPermission && !currentLocation) {
      getCurrentLocation();
    }
  }, [hasPermission, currentLocation, getCurrentLocation]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleJobPress = (job: Job) => {
    setSelectedJobId(job.id);
    navigation.navigate('JobDetail', { jobId: job.id });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFiltersApply = (newFilters: JobFilters) => {
    setFilters(newFilters);
  };

  const handleRegionChange = (region: any) => {
    // Optionally update filters based on map region
    // This could be used to fetch jobs in the visible area
  };

  const switchToListView = () => {
    navigation.navigate('JobsList');
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <JobSearchBar
          onSearch={handleSearch}
          onFilterPress={() => setShowFilters(true)}
          hasActiveFilters={hasActiveFilters}
          placeholder={isWorker ? 'Search jobs...' : 'Search my jobs...'}
        />
      </View>

      {/* Map */}
      <JobMap
        jobs={jobs}
        onJobPress={handleJobPress}
        showUserLocation={isWorker}
        onRegionChange={handleRegionChange}
        selectedJobId={selectedJobId}
        style={styles.map}
      />

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={switchToListView}
        >
          <Text style={styles.controlButtonText}>📋 List View</Text>
        </TouchableOpacity>
        
        {loading && (
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </View>
        )}
        
        {!loading && jobs.length === 0 && (
          <View style={styles.emptyIndicator}>
            <Text style={styles.emptyText}>No jobs found in this area</Text>
          </View>
        )}
        
        {!loading && jobs.length > 0 && (
          <View style={styles.jobCountIndicator}>
            <Text style={styles.jobCountText}>
              {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
            </Text>
          </View>
        )}
      </View>

      {/* Filters Modal */}
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
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
  },
  emptyIndicator: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  jobCountIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  jobCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});