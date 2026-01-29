import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '@/components/ui/ModernCard';

import { Job, JobApplication, JobsStackParamList, Booking, Payment, MainTabParamList, PaymentStackParamList } from '@/types';
import { RootState, AppDispatch } from '@/store';
import { apiService } from '@/services/api';
import { ErrorHandler } from '@/utils/errorHandler';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/styles/DesignSystem';
import { releasePayment } from '@/store/slices/paymentSlice';

const { height } = Dimensions.get('window');

type JobDetailScreenRouteProp = RouteProp<JobsStackParamList, 'JobDetail'>;
type JobDetailScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<JobsStackParamList, 'JobDetail'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    StackNavigationProp<PaymentStackParamList>
  >
>;

function JobDetailScreen() {
  const navigation = useNavigation<JobDetailScreenNavigationProp>();
  const route = useRoute<JobDetailScreenRouteProp>();
  const { jobId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [releasingPayment, setReleasingPayment] = useState(false);
  const isWorker = user?.role === 'worker';
  const isClient = user?.role === 'client';
  const isJobOwner = user?.id && job?.clientId && user.id === job.clientId;

  // Animation refs (disabled - set to final values)
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const statsCardsAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animations disabled for stability
    // Animated.parallel([
    //   Animated.timing(fadeAnim, {
    //     toValue: 1,
    //     duration: 800,
    //     useNativeDriver: true,
    //   }),
    //   Animated.timing(slideAnim, {
    //     toValue: 0,
    //     duration: 600,
    //     useNativeDriver: true,
    //   }),
    //   Animated.timing(scaleAnim, {
    //     toValue: 1,
    //     duration: 700,
    //     useNativeDriver: true,
    //   }),
    // ]).start();

    // Delayed stats cards animation
    // setTimeout(() => {
    //   Animated.spring(statsCardsAnim, {
    //     toValue: 1,
    //     friction: 8,
    //     tension: 40,
    //     useNativeDriver: true,
    //   }).start();
    // }, 300);
  }, []);

  useEffect(() => {
    fetchJobDetails();
    if (isClient) {
      fetchApplications();
    }
    fetchBookingDetails();
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

  const fetchBookingDetails = async () => {
    try {
      // Fetch bookings for this job to check if there's a completed booking with payment
      const bookingsResponse = await apiService.getBookings();
      
      if (bookingsResponse && Array.isArray(bookingsResponse) && bookingsResponse.length > 0) {
        // Find the booking for this specific job
        const jobBooking = bookingsResponse.find((b: Booking) => b.jobId === jobId);
        if (jobBooking) {
          setBooking(jobBooking);
        }
      }
    } catch (error) {
      // Silently fail - booking might not exist yet
      console.log('No booking found for job:', error);
    }
  };

  const handleApplyToJob = () => {
    if (!job?.id) return;
    navigation.navigate('JobApplication', { jobId: job.id });
  };

  const handleShareJob = async () => {
    if (!job) return;
    
    try {
      const { Share } = await import('react-native');
      await Share.share({
        message: `Check out this job: ${job.title}\n\nBudget: ${formatBudget(job.budgetMin, job.budgetMax)}\nLocation: ${job.location || 'Not specified'}\n\nDownload Handwork Marketplace to apply!`,
        title: job.title,
      });
    } catch (error) {
      console.error('Error sharing job:', error);
    }
  };

  const handleContactClient = () => {
    if (!job?.clientName) return;
    // Navigate to messaging screen
    Alert.alert('Contact Client', 'This will open the messaging screen');
  };

  const handleGetDirections = () => {
    if (!job?.location) return;
    const url = `https://maps.google.com/?q=${encodeURIComponent(String(job.location))}`;
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

  const handleViewClientProfile = async () => {
    if (!job?.clientId) {
      Alert.alert('Error', 'Client profile information is not available');
      return;
    }
    
    navigation.navigate('UserProfileView', { 
      userId: job.clientId, 
      userType: 'client' 
    });
  };

  const handleCompleteJobAndPay = () => {
    if (!booking) {
      Alert.alert('Error', 'No booking found for this job');
      return;
    }

    // Navigate to payment screen with job and booking details
    // Requirements: 1.1, 1.2
    // @ts-ignore - Cross-stack navigation
    navigation.navigate('Payments', {
      screen: 'Payment',
      params: {
        bookingId: booking.id,
        jobTitle: job?.title || 'Job',
        workerName: booking.workerName,
        workingHours: 8, // Default - should be collected from user or booking
        hourlyRate: booking.agreedRate,
      },
    });
  };

  const handleReleasePayment = () => {
    if (!booking?.payment) {
      Alert.alert('Error', 'No payment found for this booking');
      return;
    }

    // Show confirmation dialog
    // Requirements: 3.3, 3.4
    Alert.alert(
      'Release Payment',
      `Are you sure you want to release the payment of $${booking.payment.amount.toFixed(2)} to ${booking.workerName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Release Payment',
          style: 'default',
          onPress: async () => {
            try {
              setReleasingPayment(true);
              await dispatch(releasePayment(booking.payment!.id)).unwrap();
              
              Alert.alert(
                'Success',
                'Payment has been released successfully!',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh booking details to show updated payment status
                      fetchBookingDetails();
                    },
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Failed to release payment. Please try again.'
              );
            } finally {
              setReleasingPayment(false);
            }
          },
        },
      ]
    );
  };

  const formatBudget = (min: number, max: number) => {
    if (!min && !max) return 'Budget not specified';
    return `$${min || 0} - $${max || 0}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
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
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#667EEA', '#764BA2', '#F093FB']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContainer}>
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={styles.loadingIconBadge}>
                <Ionicons name="time-outline" size={32} color={Colors.primary[500]} />
              </View>
              <Text style={styles.loadingText}>Loading job details...</Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Create a safe job object to prevent rendering errors
  const safeJob = {
    ...job,
    title: String(job.title || 'No title'),
    category: String(job.category || 'No category'),
    description: String(job.description || 'No description'),
    location: String(job.location || 'No location'),
    status: String(job.status || 'unknown'),
    clientName: job.clientName ? String(job.clientName) : 'Unknown client',
    budgetMin: Number(job.budgetMin) || 0,
    budgetMax: Number(job.budgetMax) || 0,
    clientRating: Number(job.clientRating) || 0,
    applicationsCount: Number(job.applicationsCount) || 0,
    distance: job.distance ? Number(job.distance) : null,
  };

  console.log('JobDetail - safeJob:', safeJob);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Background Header */}
      <LinearGradient
        colors={['#667EEA', '#764BA2', '#F093FB']}
        style={styles.gradientBackground}
      >
        {/* Decorative Circles */}
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />

        {/* Header with Back Button */}
        <SafeAreaView edges={['top']}>
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <View style={styles.gradientIconBadge}>
                <Ionicons name="briefcase" size={24} color={Colors.primary[500]} />
              </View>
              <Text style={styles.headerTitle}>Job Details</Text>
            </View>

            <TouchableOpacity style={styles.shareButton} onPress={handleShareJob}>
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

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
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(76, 175, 80, 0.2)' }]}>
                <Ionicons name="cash-outline" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.statLabel}>Budget</Text>
              <Text style={styles.statValue}>{formatBudget(safeJob.budgetMin, safeJob.budgetMax)}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(33, 150, 243, 0.2)' }]}>
                <Ionicons name="location-outline" size={20} color="#2196F3" />
              </View>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>
                {safeJob.distance ? `${safeJob.distance.toFixed(1)}mi` : 'N/A'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(255, 152, 0, 0.2)' }]}>
                <Ionicons name="people-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.statLabel}>Applicants</Text>
              <Text style={styles.statValue}>{safeJob.applicationsCount}</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Content */}
      <Animated.View 
        style={[
          styles.contentCard,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Job Header Section */}
          <ModernCard variant="elevated" style={styles.jobHeaderCard}>
            <View style={styles.jobHeaderTop}>
              <View style={styles.jobTitleContainer}>
                <Text style={styles.jobTitle}>{safeJob.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(safeJob.status) }]}>
                  <Text style={styles.statusText}>{safeJob.status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
            <View style={styles.jobMetadata}>
              <View style={styles.categoryContainer}>
                <Ionicons name="briefcase" size={16} color={Colors.primary[500]} />
                <Text style={styles.category}>{safeJob.category}</Text>
              </View>
              <View style={styles.dateContainer}>
                <Ionicons name="time-outline" size={16} color={Colors.neutral[600]} />
                <Text style={styles.postedDate}>Posted {formatDate(job.createdAt || '')}</Text>
              </View>
            </View>
          </ModernCard>

          {/* Location & Date Row */}
          <View style={styles.detailRow}>
            <ModernCard variant="elevated" style={styles.detailCardHalf}>
              <TouchableOpacity onPress={handleGetDirections} activeOpacity={0.7}>
                <LinearGradient
                  colors={['rgba(33, 150, 243, 0.08)', 'rgba(33, 150, 243, 0.02)']}
                  style={styles.cardGradientBg}
                >
                  <View style={styles.detailCardHeader}>
                    <View style={styles.iconBadge}>
                      <Ionicons name="location" size={20} color="#2196F3" />
                    </View>
                    <Text style={styles.detailCardTitle}>Location</Text>
                  </View>
                  <View style={{ paddingRight: Spacing[2] }}>
                    <Text style={styles.detailCardValue} numberOfLines={3}>{safeJob.location}</Text>
                  </View>
                  <View style={styles.directionsIndicator}>
                    <Ionicons name="navigate" size={14} color="#2196F3" />
                    <Text style={styles.directionsText}>Get Directions</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </ModernCard>

            <ModernCard variant="elevated" style={styles.detailCardHalf}>
              <LinearGradient
                colors={['rgba(255, 152, 0, 0.08)', 'rgba(255, 152, 0, 0.02)']}
                style={styles.cardGradientBg}
              >
                <View style={styles.detailCardHeader}>
                  <View style={styles.iconBadge}>
                    <Ionicons name="calendar-outline" size={20} color="#FF9800" />
                  </View>
                  <Text style={styles.detailCardTitle}>Preferred Date</Text>
                </View>
                <View style={{ paddingRight: Spacing[2] }}>
                  <Text style={styles.detailCardValue}>
                    {formatDate(job.preferredDate || '')}
                  </Text>
                </View>
              </LinearGradient>
            </ModernCard>
          </View>

          {/* Description Section */}
          <ModernCard variant="elevated" style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>Job Description</Text>
            <Text style={styles.description}>{safeJob.description}</Text>
          </ModernCard>

          {/* Requirements Section */}
          {job?.requirements && Array.isArray(job.requirements) && job.requirements.length > 0 && (
            <ModernCard variant="elevated" style={styles.requirementsCard}>
              <Text style={styles.sectionTitle}>Requirements</Text>
              <View style={styles.requirementsList}>
                {job.requirements.map((requirement, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <View style={styles.requirementBullet}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </View>
                    <Text style={styles.requirementText}>{String(requirement || '')}</Text>
                  </View>
                ))}
              </View>
            </ModernCard>
          )}

          {/* Client Information Section */}
          {safeJob.clientName && (
            <ModernCard variant="elevated" style={styles.clientCard}>
              <View style={styles.clientCardHeader}>
                <Text style={styles.sectionTitle}>Posted by</Text>
              </View>
              <View style={styles.clientInfo}>
                <View style={styles.clientAvatar}>
                  <Ionicons name="person" size={24} color={Colors.primary[500]} />
                </View>
                <View style={styles.clientDetails}>
                  <Text style={styles.clientName}>{safeJob.clientName}</Text>
                  {safeJob.clientRating > 0 && (
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.rating}>{safeJob.clientRating.toFixed(1)}</Text>
                      <Text style={styles.ratingLabel}>rating</Text>
                    </View>
                  )}
                </View>
              </View>
            </ModernCard>
          )}

          {/* Applications (for clients) */}
          {isClient && isJobOwner && applications.length > 0 && (
            <ModernCard variant="elevated" style={styles.applicationsSection}>
              <Text style={styles.sectionTitle}>
                Applications ({applications.length})
              </Text>
              {applications.map((application) => (
                <View key={application.id} style={styles.applicationCard}>
                  <View style={styles.applicationHeader}>
                    <Text style={styles.workerName}>{String(application.workerName || 'Unknown Worker')}</Text>
                    <View style={styles.workerRating}>
                      <Ionicons name="star" size={14} color="#FF9800" />
                      <Text style={styles.ratingText}>{(Number(application.workerRating) || 0).toFixed(1)}</Text>
                    </View>
                  </View>
                  <Text style={styles.applicationMessage}>{String(application.message || 'No message')}</Text>
                  <View style={styles.applicationDetails}>
                    <Text style={styles.proposedRate}>
                      Proposed Rate: ${String(application.proposedRate || '0')}
                    </Text>
                    <Text style={styles.startDate}>
                      Start Date: {formatDate(application.proposedStartDate)}
                    </Text>
                  </View>
                  {application.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.hireButtonWrapper}
                      onPress={() => handleHireWorker(application)}
                    >
                      <LinearGradient
                        colors={Gradients.primaryBlue}
                        style={styles.hireButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="person-add" size={16} color="#fff" />
                        <Text style={styles.hireButtonText}>Hire Worker</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  {application.status === 'accepted' && (
                    <View style={styles.acceptedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.acceptedText}>HIRED</Text>
                    </View>
                  )}
                </View>
              ))}
            </ModernCard>
          )}
        </ScrollView>
      </Animated.View>

      {/* Action Buttons */}
      {isWorker && safeJob.status === 'open' && (
        <SafeAreaView edges={['bottom']} style={styles.actionContainer}>
          {hasApplied ? (
            <View style={styles.appliedContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.appliedText}>Application Submitted</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.applyButtonWrapper} onPress={handleApplyToJob}>
              <LinearGradient
                colors={Gradients.primaryBlue}
                style={styles.applyButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <Text style={styles.applyButtonText}>Apply for Job</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      )}

      {/* Complete Job & Pay Button - Requirements: 1.1, 1.2 */}
      {isClient && isJobOwner && safeJob.status === 'completed' && booking && !booking.payment && (
        <SafeAreaView edges={['bottom']} style={styles.actionContainer}>
          <TouchableOpacity style={styles.applyButtonWrapper} onPress={handleCompleteJobAndPay}>
            <LinearGradient
              colors={['#4CAF50', '#45A049']}
              style={styles.applyButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="card" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Complete Job & Pay</Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Release Payment Button - Requirements: 3.3, 3.4 */}
      {isClient && isJobOwner && safeJob.status === 'completed' && booking?.payment && booking.payment.status === 'held' && (
        <SafeAreaView edges={['bottom']} style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.applyButtonWrapper} 
            onPress={handleReleasePayment}
            disabled={releasingPayment}
          >
            <LinearGradient
              colors={['#FF9800', '#F57C00']}
              style={styles.applyButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {releasingPayment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="#fff" />
                  <Text style={styles.applyButtonText}>Release Payment</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.paymentInfoContainer}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.neutral[600]} />
            <Text style={styles.paymentInfoText}>
              Payment of ${booking.payment.amount.toFixed(2)} is held in escrow
            </Text>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container & Base
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  
  // Loading State
  loadingGradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconBadge: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
    ...Shadows.lg,
  },
  loadingText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#fff',
    textAlign: 'center',
  },

  // Gradient Background Header
  gradientBackground: {
    height: height * 0.35,
    paddingBottom: Spacing[6],
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
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
    left: -30,
  },
  circle3: {
    width: 120,
    height: 120,
    top: 60,
    right: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[4],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientIconBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[2],
    ...Shadows.lg,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#fff',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Dashboard
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[2],
    gap: Spacing[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: BorderRadius.xl,
    padding: Spacing[3],
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium as any,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing[1],
    textAlign: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#fff',
    textAlign: 'center',
  },

  // Content Card
  contentCard: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -Spacing[6],
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing[4],
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[2],
  },

  // Job Header Card
  jobHeaderCard: {
    marginBottom: Spacing[4],
  },
  jobHeaderTop: {
    marginBottom: Spacing[3],
  },
  jobTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  jobTitle: {
    flex: 1,
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginRight: Spacing[3],
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  statusBadge: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    ...Shadows.base,
  },
  statusText: {
    color: '#fff',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold as any,
    letterSpacing: 1,
  },
  jobMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  category: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.primary[500],
    textTransform: 'capitalize',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  postedDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
    fontWeight: Typography.fontWeight.medium as any,
  },

  // Detail Cards
  detailRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  detailCardHalf: {
    flex: 1,
    overflow: 'hidden',
  },
  cardGradientBg: {
    padding: Spacing[4],
    borderRadius: BorderRadius.lg,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[2],
    ...Shadows.base,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  detailCardTitle: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[600],
    paddingRight: Spacing[2],
    flexWrap: 'wrap',
  },
  detailCardValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    lineHeight: 22,
    flexWrap: 'wrap',
    paddingRight: Spacing[1],
  },
  directionsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    marginTop: Spacing[2],
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(33, 150, 243, 0.1)',
  },
  directionsText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#2196F3',
  },

  // Description Card
  descriptionCard: {
    marginBottom: Spacing[4],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[3],
    letterSpacing: -0.5,
  },
  description: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[700],
    lineHeight: 26,
    letterSpacing: 0.2,
  },

  // Requirements Card
  requirementsCard: {
    marginBottom: Spacing[4],
  },
  requirementsList: {
    gap: Spacing[2],
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  requirementBullet: {
    marginTop: 0,
  },
  requirementText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[700],
    lineHeight: 24,
  },

  // Client Card
  clientCard: {
    marginBottom: Spacing[4],
  },
  clientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  viewClientProfileButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  viewProfileGradient: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  viewProfileButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#fff',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
    borderWidth: 2,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  rating: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[700],
  },
  ratingLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
    textTransform: 'uppercase',
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },

  // Applications Section
  applicationsSection: {
    marginBottom: Spacing[4],
  },
  applicationCard: {
    backgroundColor: Colors.neutral[50],
    padding: Spacing[4],
    borderRadius: BorderRadius.xl,
    marginTop: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadows.base,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  workerName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
  },
  workerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  ratingText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[700],
  },
  applicationMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[700],
    lineHeight: 22,
    marginBottom: Spacing[3],
  },
  applicationDetails: {
    marginBottom: Spacing[3],
    gap: Spacing[1],
  },
  proposedRate: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#4CAF50',
  },
  startDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  hireButtonWrapper: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  hireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  hireButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#fff',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: '#4CAF50',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  acceptedText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#fff',
  },

  // Action Container
  actionContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    paddingBottom: Spacing[4],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    ...Shadows.lg,
  },
  applyButtonWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
  },
  applyButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#fff',
  },
  appliedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
  },
  appliedText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#4CAF50',
  },
  paymentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[4],
  },
  paymentInfoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    fontWeight: Typography.fontWeight.medium as any,
  },
});

export default JobDetailScreen;