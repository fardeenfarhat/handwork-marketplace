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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { useSelector } from 'react-redux';
import { MockIcon as Icon } from '@/components/common/MockIcon';

import { Job, JobApplication, JobsStackParamList } from '@/types';
import { RootState } from '@/store';
import { apiService } from '@/services/api';
import { JobCard } from '@/components/jobs/JobCard';
import { ErrorHandler } from '@/utils/errorHandler';

type JobManagementScreenNavigationProp = StackNavigationProp<JobsStackParamList, 'JobManagement'>;

interface TabData {
  key: string;
  title: string;
  count: number;
}

export default function JobManagementScreen() {
  const navigation = useNavigation<JobManagementScreenNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState('posted');
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isWorker = user?.role === 'worker';
  const isClient = user?.role === 'client';

  const tabs: TabData[] = isClient 
    ? [
        { key: 'posted', title: 'Posted Jobs', count: postedJobs.length },
        { key: 'applications', title: 'Applications', count: applications.length },
      ]
    : [
        { key: 'applied', title: 'Applied Jobs', count: appliedJobs.length },
        { key: 'applications', title: 'My Applications', count: applications.length },
      ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (isClient) {
        // Fetch client's posted jobs and applications received
        const [jobsResponse, applicationsResponse] = await Promise.all([
          apiService.getClientJobs(),
          apiService.getClientApplications(),
        ]);
        setPostedJobs(jobsResponse);
        setApplications(applicationsResponse as JobApplication[]);
      } else if (isWorker) {
        // Fetch worker's applied jobs and applications sent
        const [jobsResponse, applicationsResponse] = await Promise.all([
          apiService.getWorkerAppliedJobs(),
          apiService.getWorkerApplications(),
        ]);
        setAppliedJobs(jobsResponse);
        setApplications(applicationsResponse as JobApplication[]);
      }
    } catch (error) {
      ErrorHandler.handle(error);
    } finally {
      setLoading(false);
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

  const handleJobPress = (jobId: number) => {
    navigation.navigate('JobDetail', { jobId });
  };

  const handleEditJob = (job: Job) => {
    // Navigate to edit job screen (could be same as JobPost with edit mode)
    Alert.alert('Edit Job', 'Job editing functionality will be implemented');
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

  const renderJobCard = ({ item }: { item: Job }) => (
    <View style={styles.jobCardContainer}>
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
            <Icon name="edit" size={16} color="#2196F3" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteJob(item)}
          >
            <Icon name="delete" size={16} color="#F44336" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
                <Icon name="work-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Posted Jobs</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't posted any jobs yet. Create your first job posting to find workers.
                </Text>
                <TouchableOpacity
                  style={styles.postJobButton}
                  onPress={() => navigation.navigate('JobPost')}
                >
                  <Text style={styles.postJobButtonText}>Post a Job</Text>
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
                <Icon name="search" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Applied Jobs</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't applied to any jobs yet. Browse available jobs to find opportunities.
                </Text>
                <TouchableOpacity
                  style={styles.browseJobsButton}
                  onPress={() => navigation.navigate('JobsList')}
                >
                  <Text style={styles.browseJobsButtonText}>Browse Jobs</Text>
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
                <Icon name="assignment" size={64} color="#ccc" />
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

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Job Management</Text>
        {isClient && (
          <TouchableOpacity
            style={styles.postButton}
            onPress={() => navigation.navigate('JobPost')}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.postButtonText}>Post Job</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.title}
              </Text>
              {tab.count > 0 && (
                <View style={styles.tabBadge}>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  tabBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
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
  browseJobsButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  browseJobsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  jobCardContainer: {
    marginBottom: 8,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 4,
  },
  actionButtonText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#F44336',
  },
  deleteButtonText: {
    color: '#F44336',
  },
  applicationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  applicationJobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  applicationStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  applicationStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  applicationDetails: {
    marginBottom: 12,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workerRating: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 4,
  },
  proposedRate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  applicationDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  applicationMessage: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  applicationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewJobButton: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  viewJobButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  withdrawButton: {
    backgroundColor: '#fff5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  withdrawButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '500',
  },
});