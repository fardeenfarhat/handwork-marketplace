import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { useSelector } from 'react-redux';
import { MockIcon as Icon } from '@/components/common/MockIcon';

import { Job, JobApplication, JobsStackParamList } from '@/types';
import { RootState } from '@/store';
import { apiService } from '@/services/api';
import { ErrorHandler } from '@/utils/errorHandler';

type JobDetailScreenRouteProp = RouteProp<JobsStackParamList, 'JobDetail'>;
type JobDetailScreenNavigationProp = StackNavigationProp<JobsStackParamList, 'JobDetail'>;

function JobDetailScreen() {
  const navigation = useNavigation<JobDetailScreenNavigationProp>();
  const route = useRoute<JobDetailScreenRouteProp>();
  const { jobId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);

  const isWorker = user?.role === 'worker';
  const isClient = user?.role === 'client';
  const isJobOwner = job?.clientId === user?.id;

  useEffect(() => {
    fetchJobDetails();
    if (isClient) {
      fetchApplications();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const jobData = await apiService.getJob(jobId);
      setJob(jobData);
      
      if (isWorker) {
        // Check if worker has already applied
        const userApplications = await apiService.getWorkerApplications() as JobApplication[];
        const hasAppliedToJob = userApplications.some((app: JobApplication) => app.jobId === jobId);
        setHasApplied(hasAppliedToJob);
      }
    } catch (error) {
      ErrorHandler.handle(error);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const applicationsData = await apiService.getJobApplications(jobId) as JobApplication[];
      setApplications(applicationsData);
    } catch (error) {
      ErrorHandler.handle(error);
    }
  };

  const handleApplyToJob = () => {
    if (!job) return;
    navigation.navigate('JobApplication', { jobId: job.id });
  };

  const handleContactClient = () => {
    if (!job?.clientName) return;
    // Navigate to messaging screen
    Alert.alert('Contact Client', 'This will open the messaging screen');
  };

  const handleGetDirections = () => {
    if (!job?.location) return;
    const url = `https://maps.google.com/?q=${encodeURIComponent(job.location)}`;
    Linking.openURL(url);
  };

  const handleHireWorker = (application: JobApplication) => {
    Alert.alert(
      'Hire Worker',
      `Are you sure you want to hire ${application.workerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hire',
          onPress: async () => {
            try {
              await apiService.acceptJobApplication(application.id);
              Alert.alert('Success', 'Worker hired successfully!');
              fetchApplications();
              fetchJobDetails();
            } catch (error) {
              ErrorHandler.handle(error);
            }
          },
        },
      ]
    );
  };

  const formatBudget = (min: number, max: number) => {
    return `$${min} - $${max}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#4CAF50';
      case 'assigned':
        return '#FF9800';
      case 'in_progress':
        return '#2196F3';
      case 'completed':
        return '#9C27B0';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  if (loading || !job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{job.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
              <Text style={styles.statusText}>{job.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.category}>{job.category}</Text>
          <Text style={styles.postedDate}>Posted {formatDate(job.createdAt)}</Text>
        </View>

        {/* Budget and Location */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Icon name="attach-money" size={20} color="#4CAF50" />
            <Text style={styles.budget}>{formatBudget(job.budgetMin, job.budgetMax)}</Text>
          </View>
          <TouchableOpacity style={styles.infoRow} onPress={handleGetDirections}>
            <Icon name="location-on" size={20} color="#2196F3" />
            <Text style={styles.location}>{job.location}</Text>
            <Icon name="directions" size={16} color="#2196F3" />
          </TouchableOpacity>
          <View style={styles.infoRow}>
            <Icon name="schedule" size={20} color="#FF9800" />
            <Text style={styles.preferredDate}>Preferred: {formatDate(job.preferredDate)}</Text>
          </View>
          {job.distance && (
            <View style={styles.infoRow}>
              <Icon name="near-me" size={20} color="#9C27B0" />
              <Text style={styles.distance}>{job.distance.toFixed(1)} miles away</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {job.requirements.map((requirement, index) => (
              <View key={index} style={styles.requirementItem}>
                <Text style={styles.requirementBullet}>•</Text>
                <Text style={styles.requirementText}>{requirement}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Client Information */}
        {job.clientName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Posted by</Text>
            <View style={styles.clientInfo}>
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>{job.clientName}</Text>
                {job.clientRating && (
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={16} color="#FF9800" />
                    <Text style={styles.rating}>{job.clientRating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              {isWorker && (
                <TouchableOpacity style={styles.contactButton} onPress={handleContactClient}>
                  <Icon name="message" size={16} color="#2196F3" />
                  <Text style={styles.contactButtonText}>Contact</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Applications (for clients) */}
        {isClient && isJobOwner && applications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Applications ({applications.length})
            </Text>
            {applications.map((application) => (
              <View key={application.id} style={styles.applicationCard}>
                <View style={styles.applicationHeader}>
                  <Text style={styles.workerName}>{application.workerName}</Text>
                  <View style={styles.workerRating}>
                    <Icon name="star" size={14} color="#FF9800" />
                    <Text style={styles.ratingText}>{application.workerRating.toFixed(1)}</Text>
                  </View>
                </View>
                <Text style={styles.applicationMessage}>{application.message}</Text>
                <View style={styles.applicationDetails}>
                  <Text style={styles.proposedRate}>
                    Proposed Rate: ${application.proposedRate}
                  </Text>
                  <Text style={styles.startDate}>
                    Start Date: {formatDate(application.proposedStartDate)}
                  </Text>
                </View>
                {application.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.hireButton}
                    onPress={() => handleHireWorker(application)}
                  >
                    <Text style={styles.hireButtonText}>Hire Worker</Text>
                  </TouchableOpacity>
                )}
                {application.status === 'accepted' && (
                  <View style={styles.acceptedBadge}>
                    <Text style={styles.acceptedText}>HIRED</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {isWorker && job.status === 'open' && (
        <View style={styles.actionContainer}>
          {hasApplied ? (
            <View style={styles.appliedContainer}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.appliedText}>Application Submitted</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyToJob}>
              <Text style={styles.applyButtonText}>Apply for Job</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  category: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  postedDate: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  budget: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  location: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 8,
    flex: 1,
  },
  preferredDate: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  distance: {
    fontSize: 16,
    color: '#9C27B0',
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requirementBullet: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    marginTop: 2,
  },
  requirementText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  contactButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  applicationCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  workerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
  },
  applicationMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  applicationDetails: {
    marginBottom: 12,
  },
  proposedRate: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  startDate: {
    fontSize: 14,
    color: '#666',
  },
  hireButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  hireButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptedBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  acceptedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionContainer: {
    backgroundColor: '#fff',
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
  appliedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  appliedText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default JobDetailScreen;