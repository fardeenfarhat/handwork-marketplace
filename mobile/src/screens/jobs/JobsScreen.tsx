import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { useSelector } from 'react-redux';

import { Job, JobFilters, JobsStackParamList } from '@/types';
import { RootState } from '@/store';
import { apiService } from '@/services/api';
import { JobCard } from '@/components/jobs/JobCard';
import { JobSearchBar } from '@/components/jobs/JobSearchBar';
import { JobFiltersAdvanced } from '@/components/jobs/JobFiltersAdvanced';
import { Gradients, Colors, Spacing, BorderRadius, Typography, Shadows } from '@/styles/DesignSystem';
import { useLocation } from '@/hooks/useLocation';
import { locationService } from '@/services/location';
import { ErrorHandler } from '@/utils/errorHandler';
import { ModernCard } from '@/components/ui/ModernCard';

const { width, height } = Dimensions.get('window');

type JobsScreenNavigationProp = StackNavigationProp<JobsStackParamList, 'JobsList'>;

export default function JobsScreen() {
  const navigation = useNavigation<JobsScreenNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clientReviewCounts, setClientReviewCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<JobFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const statsCardsAnim = useRef(new Animated.Value(0)).current;

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

      // TEMPORARY: Skip location processing to debug rendering issue
      const jobsWithLocation = response;

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
      
      // Fetch review counts for clients in background
      fetchClientReviewCounts(filteredJobs);
    } catch (error) {
      ErrorHandler.handle(error);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, currentLocation]);

  const fetchClientReviewCounts = async (jobsList: Job[]) => {
    try {
      const clientIds = [...new Set(jobsList.map(job => job.clientId))];
      const reviewCounts: Record<number, number> = {};
      
      // Fetch review counts for each unique client
      await Promise.all(
        clientIds.map(async (clientId) => {
          try {
            const count = await apiService.getUserReviewCount(clientId);
            reviewCounts[clientId] = count;
          } catch (error) {
            console.log(`Failed to fetch review count for client ${clientId}`);
            reviewCounts[clientId] = 0;
          }
        })
      );
      
      setClientReviewCounts(reviewCounts);
    } catch (error) {
      console.log('Failed to fetch client review counts:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }, [fetchJobs]);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Delayed animation for stats cards
    setTimeout(() => {
      Animated.spring(statsCardsAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }, 300);
  }, []);

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

  const handleClientPress = (clientId: number) => {
    // Navigate within the Jobs stack to view the client's profile
    navigation.navigate('UserProfileView', { 
      userId: clientId, 
      userType: 'client' 
    });
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

  // Calculate stats
  const totalJobs = jobs.length;
  const appliedJobs = jobs.filter(j => j.applicationsCount && j.applicationsCount > 0).length;
  const activeJobs = jobs.filter(j => j.status === 'open').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  const hasActiveFilters = Object.keys(filters).length > 0;

  const renderJob = ({ item, index }: { item: Job; index: number }) => (
    <View style={styles.jobCardWrapper}>
      <JobCard
        job={item}
        onPress={handleJobPress}
        onClientPress={handleClientPress}
        showDistance={isWorker}
        showApplicationsCount={isClient}
        clientReviewCount={clientReviewCounts[item.clientId] || 0}
        currentUserId={user?.id}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIcon}>
        <Ionicons 
          name={isWorker ? "briefcase-outline" : "folder-open-outline"} 
          size={60} 
          color={Colors.neutral[300]} 
        />
      </View>
      <Text style={styles.emptyStateText}>
        {searchQuery || hasActiveFilters ? 'No jobs found' : 'No jobs available'}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        {searchQuery || hasActiveFilters
          ? 'Try adjusting your search or filters'
          : isWorker
          ? 'Check back later for new opportunities'
          : 'Be the first to post a job!'
        }
      </Text>
      {isClient && !searchQuery && !hasActiveFilters && (
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={() => navigation.navigate('JobPost')}
        >
          <LinearGradient
            colors={isWorker ? ['#4776E6', '#8E54E9'] : ['#11998E', '#38EF7D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emptyStateButtonGradient}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.emptyStateButtonText}>Post a Job</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={isWorker ? ['#4776E6', '#8E54E9', '#667EEA'] : ['#11998E', '#38EF7D', '#06B49A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeContainer}>
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
        <View style={[styles.decorativeCircle, styles.circle4]} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header Section */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconBadge}>
                <LinearGradient
                  colors={['#FFFFFF', '#F8F9FA']}
                  style={styles.headerIconGradient}
                >
                  <Ionicons 
                    name={isWorker ? "briefcase" : "folder-open"} 
                    size={28} 
                    color={isWorker ? '#4776E6' : '#11998E'} 
                  />
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isWorker ? 'Find Your Next Job' : 'Manage Your Jobs'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {totalJobs} {totalJobs === 1 ? 'opportunity' : 'opportunities'} available
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.headerActions}>
              {isWorker && (
                <TouchableOpacity style={styles.headerActionButton} onPress={switchToMapView}>
                  <Ionicons name="map-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {isClient && (
                <TouchableOpacity 
                  style={[styles.headerActionButton, styles.primaryActionButton]} 
                  onPress={() => navigation.navigate('JobPost')}
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.headerActionButton} onPress={() => navigation.navigate('JobManagement')}>
                <Ionicons name="list" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Cards */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: statsCardsAnim,
                transform: [
                  {
                    scale: statsCardsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(71, 118, 230, 0.2)' }]}>
                  <Ionicons name="briefcase" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{totalJobs}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(56, 239, 125, 0.2)' }]}>
                  <Ionicons name={isClient ? "list" : "checkmark-circle"} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{isClient ? activeJobs : appliedJobs}</Text>
                <Text style={styles.statLabel}>{isClient ? 'Active' : 'Applied'}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 159, 67, 0.2)' }]}>
                  <Ionicons name="pulse" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{activeJobs}</Text>
                <Text style={styles.statLabel}>Open</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(102, 126, 234, 0.2)' }]}>
                  <Ionicons name="trending-up" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{successRate}%</Text>
                <Text style={styles.statLabel}>Rate</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <ModernCard variant="elevated" style={styles.mainContentCard}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <JobSearchBar
                onSearch={handleSearch}
                onFilterPress={() => setShowFilters(true)}
                hasActiveFilters={hasActiveFilters}
                placeholder={isWorker ? 'Search jobs...' : 'Search my jobs...'}
              />
            </View>

            {/* Location Access Prompt for Workers */}
            {isWorker && !hasPermission && (
              <ModernCard variant="outlined" style={styles.locationPrompt}>
                <View style={styles.locationPromptContent}>
                  <View style={styles.locationPromptIcon}>
                    <Ionicons name="location" size={24} color={Colors.primary[500]} />
                  </View>
                  <View style={styles.locationPromptTextContainer}>
                    <Text style={styles.locationPromptTitle}>Enable Location</Text>
                    <Text style={styles.locationPromptText}>
                      Find nearby jobs and see accurate distances
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.locationPromptButton}
                    onPress={requestLocationAccess}
                  >
                    <LinearGradient
                      colors={['#4776E6', '#8E54E9']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.locationPromptButtonGradient}
                    >
                      <Text style={styles.locationPromptButtonText}>Enable</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ModernCard>
            )}

            {/* Jobs List */}
            <FlatList
              data={jobs}
              renderItem={renderJob}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={!loading ? renderEmptyState : null}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={handleRefresh}
                  tintColor={isWorker ? '#4776E6' : '#11998E'}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : styles.listContent}
            />
          </ModernCard>
        </View>
      </SafeAreaView>

      <JobFiltersAdvanced
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleFiltersApply}
        initialFilters={filters}
        userRole={user?.role || 'worker'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  
  // Background
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height * 0.5,
  },
  
  // Decorative Elements
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    top: 100,
    left: -40,
  },
  circle3: {
    width: 100,
    height: 100,
    top: 50,
    right: 100,
  },
  circle4: {
    width: 120,
    height: 120,
    top: 180,
    right: 50,
  },
  
  safeArea: {
    flex: 1,
  },
  
  // Header Section
  headerSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconBadge: {
    width: 56,
    height: 56,
    marginRight: Spacing[3],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  headerIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  primaryActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Stats Cards
  statsContainer: {
    marginTop: Spacing[2],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium as any,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Content Section
  contentSection: {
    flex: 1,
  },
  mainContentCard: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.neutral[50],
    paddingTop: Spacing[5],
    marginTop: -Spacing[4],
  },
  
  // Search Bar
  searchContainer: {
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    paddingTop: Spacing[1],
  },
  
  // Location Prompt
  locationPrompt: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  locationPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
  },
  locationPromptIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  locationPromptTextContainer: {
    flex: 1,
  },
  locationPromptTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#92400E',
    marginBottom: 2,
  },
  locationPromptText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal as any,
    color: '#B45309',
  },
  locationPromptButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  locationPromptButtonGradient: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  locationPromptButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#FFFFFF',
  },
  
  // Job Cards
  jobCardWrapper: {
    marginBottom: Spacing[3],
  },
  
  // List Content
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[6],
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[6],
  },
  
  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[6],
    paddingHorizontal: Spacing[4],
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
    ...Shadows.base,
  },
  emptyStateText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal as any,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginBottom: Spacing[5],
    lineHeight: 24,
  },
  emptyStateButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  emptyStateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
  },
  emptyStateButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#FFFFFF',
  },
});