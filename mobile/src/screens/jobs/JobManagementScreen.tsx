import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ModernCard } from '@/components/ui/ModernCard';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/styles/DesignSystem';

import { Job, JobApplication, JobsStackParamList } from '@/types';
import { RootState } from '@/store';
import { apiService } from '@/services/api';
import { JobCard } from '@/components/jobs/JobCard';
import { ErrorHandler } from '@/utils/errorHandler';

const { height } = Dimensions.get('window');

type JobManagementScreenNavigationProp = StackNavigationProp<JobsStackParamList, 'JobManagement'>;
type JobManagementScreenRouteProp = RouteProp<JobsStackParamList, 'JobManagement'>;

interface TabData {
  key: string;
  title: string;
  count: number;
}

export default function JobManagementScreen() {
  const navigation = useNavigation<JobManagementScreenNavigationProp>();
  const route = useRoute<JobManagementScreenRouteProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const isWorker = user?.role === 'worker';
  const isClient = user?.role === 'client';
  
  const getDefaultTab = () => {
    if (route.params?.initialTab) {
      return route.params.initialTab;
    }
    // Default to the first tab available for the user's role
    return isWorker ? 'applied' : 'posted';
  };

  const [activeTab, setActiveTab] = useState<'posted' | 'applications' | 'applied' | 'bookings'>(
    getDefaultTab()
  );
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabs: TabData[] = isClient 
    ? [
        { key: 'posted', title: 'Posted Jobs', count: postedJobs.length },
        { key: 'applications', title: 'Applications', count: applications.length },
        { key: 'bookings', title: 'Active Jobs', count: bookings.length },
      ]
    : [
        { key: 'applied', title: 'Applied Jobs', count: appliedJobs.length },
        { key: 'applications', title: 'My Applications', count: applications.length },
        { key: 'bookings', title: 'My Bookings', count: bookings.length },
      ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 JobManagement: Fetching data...');
      
      if (isClient) {
        // Fetch client's posted jobs, applications received, and bookings
        const [jobsResponse, applicationsResponse, bookingsResponse] = await Promise.all([
          apiService.getClientJobs(),
          apiService.getClientApplications(),
          apiService.getBookings(),
        ]);
        console.log('✅ JobManagement: Client data fetched', {
          jobs: jobsResponse.length,
          applications: applicationsResponse.length,
          bookings: bookingsResponse.length
        });
        console.log('📊 JobManagement: Client bookings data:', bookingsResponse);
        setPostedJobs(jobsResponse);
        setApplications(applicationsResponse as JobApplication[]);
        setBookings(bookingsResponse);
      } else if (isWorker) {
        // Fetch worker's applied jobs, applications sent, and bookings
        const [jobsResponse, applicationsResponse, bookingsResponse] = await Promise.all([
          apiService.getWorkerAppliedJobs(),
          apiService.getWorkerApplications(),
          apiService.getBookings(),
        ]);
        console.log('✅ JobManagement: Worker data fetched', {
          appliedJobs: jobsResponse.length,
          applications: applicationsResponse.length,
          bookings: bookingsResponse.length
        });
        console.log('📊 JobManagement: Worker bookings data:', bookingsResponse);
        setAppliedJobs(jobsResponse);
        setApplications(applicationsResponse as JobApplication[]);
        setBookings(bookingsResponse);
      }
    } catch (error) {
      console.error('❌ JobManagement: Error fetching data', error);
      ErrorHandler.handle(error);
    } finally {
      setLoading(false);
      console.log('🏁 JobManagement: Loading complete');
    }
  }, [isClient, isWorker]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when screen comes into focus (e.g., after posting a job)
  useFocusEffect(
    useCallback(() => {
      // Force refresh if coming from job posting
      if (route.params?.refresh) {
        fetchData();
        // Clear the refresh parameter to avoid continuous refreshing
        navigation.setParams({ refresh: undefined });
      } else {
        fetchData();
      }
    }, [fetchData, route.params?.refresh, navigation])
  );

  const handleJobPress = (jobId: number) => {
    navigation.navigate('JobDetail', { jobId });
  };

  const handleClientPress = (clientUserId: number) => {
    // Navigate to view the client's profile
    navigation.navigate('UserProfileView', { 
      userId: clientUserId, 
      userType: 'client' 
    });
  };

  const handleEditJob = (job: Job) => {
    // Navigate to JobPost screen in edit mode
    navigation.navigate('JobPost', { jobId: job.id, isEdit: true });
  };

  const handleDeleteJob = (job: Job) => {
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${job.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteJob(job.id);
              Alert.alert('Success', 'Job deleted successfully');
              fetchData();
            } catch (error) {
              ErrorHandler.handle(error);
            }
          },
        },
      ]
    );
  };

  const handleWithdrawApplication = (application: JobApplication) => {
    Alert.alert(
      'Withdraw Application',
      'Are you sure you want to withdraw your application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.withdrawApplication(application.id);
              Alert.alert('Success', 'Application withdrawn successfully');
              fetchData();
            } catch (error) {
              ErrorHandler.handle(error);
            }
          },
        },
      ]
    );
  };

  const handleAcceptApplication = (application: JobApplication) => {
    Alert.alert(
      'Accept Application',
      `Are you sure you want to accept ${application.workerName}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await apiService.acceptApplication(application.id);
              Alert.alert('Success', 'Application accepted successfully');
              fetchData();
            } catch (error) {
              ErrorHandler.handle(error);
            }
          },
        },
      ]
    );
  };

  const handleRejectApplication = (application: JobApplication) => {
    Alert.alert(
      'Reject Application',
      `Are you sure you want to reject ${application.workerName}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.rejectApplication(application.id);
              Alert.alert('Success', 'Application rejected successfully');
              fetchData();
            } catch (error) {
              ErrorHandler.handle(error);
            }
          },
        },
      ]
    );
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <>
      <JobCard
        job={item}
        onPress={handleJobPress}
        showApplicationsCount={isClient}
      />
      {isClient && (
        <View style={styles.jobActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditJob(item)}
          >
            <Ionicons name="create-outline" size={18} color="#2196F3" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteJob(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#F44336" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderApplicationCard = ({ item }: { item: JobApplication }) => (
    <View style={styles.applicationCard}>
      <View style={styles.applicationHeader}>
        <Text style={styles.applicationJobTitle}>{item.jobTitle || 'Job Application'}</Text>
        <View style={[
          styles.applicationStatusBadge,
          { backgroundColor: getApplicationStatusColor(item.status) }
        ]}>
          <Text style={styles.applicationStatusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      {isClient ? (
        <View style={styles.applicationDetails}>
          <Text style={styles.workerName}>Worker: {item.workerName}</Text>
          <Text style={styles.workerRating}>Rating: ★ {item.workerRating?.toFixed(1) || 'N/A'}</Text>
          <Text style={styles.proposedRate}>Proposed Rate: ${item.proposedRate}</Text>
          <Text style={styles.applicationMessage} numberOfLines={3}>{item.message}</Text>
        </View>
      ) : (
        <View style={styles.applicationDetails}>
          <Text style={styles.proposedRate}>Your Rate: ${item.proposedRate}</Text>
          <Text style={styles.applicationDate}>
            Applied: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.applicationMessage} numberOfLines={3}>{item.message}</Text>
        </View>
      )}

      <View style={styles.applicationActions}>
        <TouchableOpacity
          style={styles.viewJobButton}
          onPress={() => handleJobPress(item.jobId)}
        >
          <Text style={styles.viewJobButtonText}>View Job</Text>
        </TouchableOpacity>
        
        {isClient && item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptApplication(item)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectApplication(item)}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
        
        {isWorker && item.status === 'pending' && (
          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={() => handleWithdrawApplication(item)}
          >
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'accepted':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const renderBookingCard = ({ item }: { item: any }) => {
    console.log('📋 Rendering booking card:', JSON.stringify(item, null, 2));
    
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => navigation.navigate('Payments', {
          screen: 'JobTracking',
          params: { bookingId: item.id }
        } as any)}
      >
        <View style={styles.bookingContent}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingTitle}>{item.jobTitle}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getBookingStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.bookingDetails}>
            <Text style={styles.bookingPartner}>
              {isClient ? `Worker: ${item.workerName}` : `Client: ${item.clientName}`}
            </Text>
            <Text style={styles.bookingRate}>Rate: ${item.agreedRate}/hr</Text>
            {item.startDate && (
              <Text style={styles.bookingDate}>
                Started: {new Date(item.startDate).toLocaleDateString()}
              </Text>
            )}
          </View>
          
          <View style={styles.bookingActions}>
            {item.status === 'completed' ? (
              item.hasUserReview ? (
                <View style={styles.reviewedIndicator}>
                  <Text style={styles.reviewedText}>✓ Reviewed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent navigation to JobTracking
                    
                    // Navigate to JobTracking where review can be submitted
                    navigation.navigate('JobTracking', { 
                      bookingId: item.id,
                      showReviewPrompt: true 
                    });
                  }}
                >
                  <Text style={styles.reviewButtonText}>Leave Review</Text>
                </TouchableOpacity>
              )
            ) : (
              <Text style={styles.trackText}>Tap to track progress →</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getBookingStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#2196F3';
      case 'in_progress':
        return '#FF9800';
      case 'completed':
        return '#4CAF50';
      case 'approved':
        return '#8BC34A';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'posted':
        return (
          <FlatList
            data={postedJobs}
            renderItem={renderJobCard}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBadge}>
                  <Ionicons name="briefcase-outline" size={48} color="#11998E" />
                </View>
                <Text style={styles.emptyTitle}>No Posted Jobs</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't posted any jobs yet. Create your first job posting to find workers.
                </Text>
                <TouchableOpacity
                  style={styles.postJobButton}
                  onPress={() => navigation.navigate('JobPost')}
                >
                  <LinearGradient
                    colors={['#11998E', '#38EF7D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.postJobButtonGradient}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.postJobButtonText}>Post a Job</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={postedJobs.length === 0 ? styles.emptyContainer : undefined}
          />
        );

      case 'applied':
        return (
          <FlatList
            data={appliedJobs}
            renderItem={renderJobCard}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBadge}>
                  <Ionicons name="search-outline" size={48} color="#11998E" />
                </View>
                <Text style={styles.emptyTitle}>No Applied Jobs</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't applied to any jobs yet. Browse available jobs to find opportunities.
                </Text>
                <TouchableOpacity
                  style={styles.browseJobsButton}
                  onPress={() => navigation.navigate('JobsList')}
                >
                  <LinearGradient
                    colors={['#11998E', '#38EF7D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.browseJobsButtonGradient}
                  >
                    <Ionicons name="compass" size={20} color="#FFFFFF" />
                    <Text style={styles.browseJobsButtonText}>Browse Jobs</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={appliedJobs.length === 0 ? styles.emptyContainer : undefined}
          />
        );

      case 'applications':
        return (
          <FlatList
            data={applications}
            renderItem={renderApplicationCard}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBadge}>
                  <Ionicons name="document-text-outline" size={48} color="#11998E" />
                </View>
                <Text style={styles.emptyTitle}>
                  {isClient ? 'No Applications Received' : 'No Applications Sent'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {isClient 
                    ? 'No one has applied to your jobs yet. Make sure your job postings are attractive and competitive.'
                    : 'You haven\'t submitted any applications yet. Start applying to jobs that match your skills.'
                  }
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={applications.length === 0 ? styles.emptyContainer : undefined}
          />
        );

      case 'bookings':
        return (
          <FlatList
            data={bookings}
            renderItem={renderBookingCard}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBadge}>
                  <Ionicons name="calendar-outline" size={48} color="#11998E" />
                </View>
                <Text style={styles.emptyTitle}>No Active Bookings</Text>
                <Text style={styles.emptySubtitle}>
                  {isClient 
                    ? 'No active jobs yet. Accept applications to start working with professionals.'
                    : 'No active jobs yet. Your accepted applications will appear here.'
                  }
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : undefined}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={['#11998E', '#38EF7D', '#06D6A0']}
        style={styles.gradientBackground}
      >
        {/* Decorative Circles */}
        <View style={[styles.decorativeCircle, { width: 200, height: 200, top: -50, right: -50 }]} />
        <View style={[styles.decorativeCircle, { width: 150, height: 150, top: 80, left: -40 }]} />
        <View style={[styles.decorativeCircle, { width: 120, height: 120, bottom: -20, right: 60 }]} />

        {/* Header with Back Button */}
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <View style={styles.iconBadge}>
                <Ionicons name="folder-open" size={24} color="#11998E" />
              </View>
              <Text style={styles.headerTitle}>
                {isClient ? 'Manage Jobs' : 'My Activity'}
              </Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {tabs.map((tab, index) => (
              <View key={tab.key} style={styles.statCard}>
                <Ionicons 
                  name={
                    tab.key === 'posted' ? 'briefcase' :
                    tab.key === 'applied' ? 'send' :
                    tab.key === 'applications' ? 'document-text' :
                    'checkmark-circle'
                  } 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.statValue}>{tab.count}</Text>
                <Text style={styles.statLabel}>{tab.title.replace(' Jobs', '').replace(' My', '')}</Text>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.key as 'posted' | 'applications' | 'applied' | 'bookings')}
            >
              {activeTab === tab.key && (
                <LinearGradient
                  colors={['#11998E', '#38EF7D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeTabGradient}
                />
              )}
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.title}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.activeTabBadge]}>
                  <Text style={styles.tabBadgeText}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },

  // Gradient Header
  gradientBackground: {
    paddingBottom: Spacing[4],
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[4],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[2],
    ...Shadows.lg,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    gap: Spacing[2],
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[1],
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium as any,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },

  // Tabs
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    ...Shadows.base,
  },
  tabScrollContent: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  tab: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    overflow: 'hidden',
  },
  activeTab: {
    backgroundColor: 'transparent',
  },
  activeTabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.neutral[700],
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.bold as any,
  },
  tabBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBadgeText: {
    color: '#11998E',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold as any,
  },

  // Content
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[6],
  },

  // Job Cards
  jobActions: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing[4],
    marginTop: -Spacing[4],
    marginBottom: Spacing[2],
    paddingTop: Spacing[3],
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral[100],
  },
  actionButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#2196F3',
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  deleteButtonText: {
    color: '#F44336',
  },

  // Application Cards
  applicationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[2],
    padding: Spacing[4],
    borderRadius: BorderRadius.xl,
    ...Shadows.base,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing[3],
  },
  applicationJobTitle: {
    flex: 1,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginRight: Spacing[2],
  },
  applicationStatusBadge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  applicationStatusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  applicationDetails: {
    gap: Spacing[2],
  },
  workerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[900],
  },
  workerRating: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.neutral[600],
  },
  proposedRate: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#11998E',
  },
  applicationMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[700],
    lineHeight: 20,
  },
  applicationActions: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[3],
  },

  // Booking Cards
  bookingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[2],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.base,
  },
  bookingContent: {
    padding: Spacing[4],
  },
  bookingTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
  },
  bookingInfo: {
    gap: Spacing[2],
  },
  bookingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  bookingInfoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[700],
  },
  bookingRate: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#11998E',
  },
  reviewButton: {
    marginTop: Spacing[2],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  reviewButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.primary[500],
  },
  trackText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: Spacing[2],
  },

  // Empty States
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  emptyIconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(17, 153, 142, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  emptyTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing[4],
    maxWidth: 300,
  },
  postJobButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  postJobButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
  },
  postJobButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
  browseJobsButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  browseJobsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
  },
  browseJobsButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
  applicationDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  viewJobButton: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  viewJobButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.primary[500],
  },
  withdrawButton: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: '#FFEBEE',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  withdrawButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#F44336',
  },
  acceptButton: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary[600],
  },
  acceptButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.primary[600],
  },
  rejectButton: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: '#FFEBEE',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  rejectButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#F44336',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  statusBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
  bookingDetails: {
    gap: Spacing[2],
  },
  bookingPartner: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[900],
  },
  bookingDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  bookingActions: {
    marginTop: Spacing[3],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  reviewedIndicator: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary[600],
    alignSelf: 'center',
  },
  reviewedText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.primary[600],
  },
});