import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ModernCard } from '@/components/ui/ModernCard';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/styles/DesignSystem';
import { PaymentStackParamList, Booking, BookingTimeline, BookingStatus } from '@/types';
import { Button, LoadingSpinner } from '@/components/common';
import apiService from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

import { StackNavigationProp } from '@/types/navigation';

const { height } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'JobTracking'>;
type RouteProps = RouteProp<PaymentStackParamList, 'JobTracking'>;

const JobTrackingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId, showReviewPrompt } = route.params;
  const { currentUserId, user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [timeline, setTimeline] = useState<BookingTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  useEffect(() => {
    // Hide the default navigation header since we have our own
    try {
      (navigation as any).setOptions?.({
        headerShown: false,
      });
    } catch (error) {
      console.log('Could not set navigation options:', error);
    }
  }, [navigation]);

  // Load data on mount and when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused - reloading booking data...');
      setLoading(true);
      loadBookingData();
    }, [bookingId])
  );

  // Handle review prompt from JobManagement screen
  useEffect(() => {
    if (showReviewPrompt && booking?.status === 'completed') {
      setTimeout(() => {
        Alert.alert(
          'Leave a Review',
          'You can leave a review for this completed job using the "Leave Review" button below.',
          [{ text: 'Got it', style: 'default' }]
        );
      }, 1000); // Small delay to let the screen load
    }
  }, [showReviewPrompt, booking?.status]);

  const loadBookingData = async () => {
    try {
      // Load booking data first
      const bookingData = await apiService.getBooking(bookingId);
      const booking = bookingData as unknown as Booking;
      
      console.log('📦 Booking data loaded:', {
        bookingId: booking.id,
        workerId: booking.workerId,
        clientId: booking.clientId,
        status: booking.status,
        hasUserReview: booking.hasUserReview,
        hasUserReviewType: typeof booking.hasUserReview
      });
      
      setBooking(booking);
      
      // Try to load timeline, but don't fail if this endpoint doesn't exist
      try {
        const timelineResponse = await apiService.getBookingTimeline(bookingId);
        console.log('Timeline response:', timelineResponse);
        
        // Handle different response formats
        let timelineData = [];
        if (Array.isArray(timelineResponse)) {
          timelineData = timelineResponse;
        } else if ((timelineResponse as any)?.timeline) {
          timelineData = (timelineResponse as any).timeline;
        } else {
          timelineData = [];
        }
        
        // Transform timeline data to match expected format
        const transformedTimeline = timelineData.map((item: any, index: number) => ({
          id: item.id || index + 1,
          bookingId: bookingId,
          status: item.status,
          description: item.notes || item.description || `Status: ${item.status}`,
          createdAt: item.timestamp || item.createdAt || new Date().toISOString(),
          createdBy: item.createdBy || 0,
          createdByName: item.createdByName || 'System'
        }));
        
        setTimeline(transformedTimeline);
      } catch (timelineError) {
        console.warn('Timeline not available:', timelineError);
        // Create a basic timeline entry
        setTimeline([{
          id: 1,
          bookingId: bookingId,
          status: (bookingData as unknown as Booking).status,
          description: `Booking ${(bookingData as unknown as Booking).status}`,
          createdAt: (bookingData as unknown as Booking).createdAt,
          createdBy: 0,
          createdByName: 'System'
        }]);
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
      Alert.alert('Error', 'Failed to load booking details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookingData();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (newStatus: BookingStatus, notes?: string) => {
    if (!booking) return;

    console.log('Attempting to update booking status:', {
      bookingId: booking.id,
      currentStatus: booking.status,
      newStatus: newStatus,
      workerId: booking.workerId,
      clientId: booking.clientId,
      notes
    });

    setUpdating(true);
    try {
      await apiService.updateBookingStatus(booking.id, newStatus, notes);
      await loadBookingData(); // Reload to get updated data
      Alert.alert('Success', 'Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      let errorMessage = 'Failed to update status';
      
      if (error instanceof Error) {
        if (error.message.includes('403') || error.message.includes('Only workers can mark work as completed')) {
          errorMessage = `You are not authorized to perform this action. Only the assigned worker (ID: ${booking.workerId}) can update the job status.`;
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Authorization Error', errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleStartJob = () => {
    Alert.alert(
      'Start Job',
      'Are you ready to start working on this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => handleStatusUpdate('in_progress', 'Job started by worker'),
        },
      ]
    );
  };

  const handleCompleteJob = () => {
    if (!booking) return;
    // For now, just update status to completed
    // Later can navigate to completion verification if that screen exists
    Alert.alert(
      'Complete Job',
      'Mark this job as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => handleStatusUpdate('completed', 'Job marked as completed'),
        },
      ]
    );
  };

  const handleCancelJob = () => {
    Alert.alert(
      'Cancel Job',
      'Are you sure you want to cancel this job? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => handleStatusUpdate('cancelled', 'Job cancelled by user'),
        },
      ]
    );
  };



  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return '#FFC107'; // Amber - waiting for confirmation
      case 'confirmed':
        return '#2196F3'; // Blue - confirmed and scheduled
      case 'in_progress':
        return '#FF9800'; // Orange - work is actively happening
      case 'completed':
        return '#4CAF50'; // Green - successfully finished
      case 'cancelled':
        return '#f44336'; // Red - cancelled/failed
      default:
        return '#9E9E9E'; // Gray - unknown status
    }
  };

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending Confirmation';
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Helper function to format currency values and prevent double dollar signs
  const formatCurrency = (value: string | number): string => {
    if (value === null || value === undefined) return '$0';
    
    const stringValue = String(value);
    // Remove any existing dollar signs to prevent duplication
    const cleanValue = stringValue.replace(/^\$+/, '');
    
    // Parse and format the number
    const numericValue = parseFloat(cleanValue) || 0;
    return `$${numericValue.toFixed(2)}`;
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'in_progress':
        return 'construct-outline';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getProgressPercentage = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 20;
      case 'confirmed':
        return 40;
      case 'in_progress':
        return 70;
      case 'completed':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const renderActionButtons = () => {
    if (!booking) return null;

    // Simplified access check - show buttons if user is a worker
    // Backend will handle the detailed authorization (checking if they're the assigned worker)
    const isWorker = user?.role === 'worker';
    const isClient = user?.role === 'client';
    
    console.log('🔍 Access Check:', {
      currentUserId,
      userRole: user?.role,
      bookingWorkerId: booking.workerId,
      bookingClientId: booking.clientId,
      isWorker,
      isClient
    });
    
    // Show different actions based on user role and job status
    if (!isWorker && booking.status !== 'completed') {
      return (
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: '#fff3cd' }]}>
            <Text style={styles.infoText}>
              {isClient 
                ? "As the client, you can view job progress. Status updates are handled by the assigned worker." 
                : "Only workers can update job status."}
            </Text>
          </View>
        </View>
      );
    }

    switch (booking.status) {
      case 'confirmed':
        // Only workers can start/cancel jobs
        if (!isWorker) return null;
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleStartJob}
              disabled={updating}
              style={[styles.floatingActionButton, updating && styles.disabledButton]}
            >
              <LinearGradient
                colors={['#11998E', '#38EF7D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Ionicons name="rocket" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {updating ? 'Starting...' : 'Start Job'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCancelJob}
              disabled={updating}
              style={[styles.floatingActionButton, updating && styles.disabledButton]}
            >
              <LinearGradient
                colors={['#FF3B30', '#FF6B5E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.cancelButtonText}>
                  {updating ? 'Updating...' : 'Cancel Job'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      case 'in_progress':
        // Only workers can mark jobs as complete
        if (!isWorker) return null;
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleCompleteJob}
              disabled={updating}
              style={[styles.floatingActionButton, updating && styles.disabledButton]}
            >
              <LinearGradient
                colors={['#11998E', '#38EF7D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {updating ? 'Updating...' : 'Mark as Complete'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      case 'completed':
        console.log('🔍 Review Button State:', {
          hasUserReview: booking.hasUserReview,
          type: typeof booking.hasUserReview,
          bookingId: booking.id
        });
        
        return (
          <View style={styles.actionButtons}>
            {booking.hasUserReview === true ? (
              <View style={styles.reviewedIndicator}>
                <LinearGradient
                  colors={['#E8F5E9', '#C8E6C9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.reviewedGradient}
                >
                  <Ionicons name="checkmark-done-circle" size={20} color={Colors.primary[600]} />
                  <Text style={styles.reviewedText}>✓ Review Submitted</Text>
                </LinearGradient>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  // Workers review clients, clients review workers
                  const revieweeId = isWorker ? booking.clientId : booking.workerId;
                  const revieweeName = isWorker ? booking.clientName : booking.workerName;
                  
                  console.log('🔍 Review Navigation:', {
                    isWorker,
                    revieweeId,
                    revieweeName,
                    bookingId: booking.id
                  });
                  
                  (navigation as any).navigate('Reviews', {
                    screen: 'ReviewSubmission',
                    params: {
                      bookingId: booking.id,
                      revieweeId: revieweeId,
                      revieweeName: revieweeName,
                      jobTitle: booking.jobTitle
                    }
                  });
                }}
                style={styles.floatingActionButton}
              >
                <LinearGradient
                  colors={[Colors.primary[500], Colors.primary[700]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Ionicons name="star" size={20} color="#FFFFFF" />
                  <Text style={styles.reviewButtonText}>
                    {isWorker ? 'Review Client' : 'Review Worker'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  const renderTimelineItem = (item: BookingTimeline, index: number) => {
    const isLastItem = index === (timeline?.length || 0) - 1;
    const statusColor = getStatusColor(item.status);
    
    return (
      <View key={item.id} style={styles.timelineItem}>
        <View style={styles.timelineIndicator}>
          {/* Gradient Dot */}
          <View style={styles.timelineDotContainer}>
            <LinearGradient
              colors={[statusColor, statusColor + 'CC']}
              style={styles.timelineDotGradient}
            >
              <View style={styles.timelineDotInner} />
            </LinearGradient>
          </View>
          
          {/* Gradient Connecting Line */}
          {!isLastItem && (
            <LinearGradient
              colors={[statusColor + 'AA', 'rgba(209, 213, 219, 0.3)']}
              style={styles.timelineLineGradient}
            />
          )}
        </View>
        <View style={styles.timelineContent}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineStatus}>{getStatusText(item.status)}</Text>
            <View style={[styles.timelineStatusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.timelineStatusDot, { backgroundColor: statusColor }]} />
            </View>
          </View>
          <Text style={styles.timelineDescription}>
            {(item as any).notes || item.description || `Status changed to ${getStatusText(item.status)}`}
          </Text>
          <View style={styles.timelineFooter}>
            <Ionicons name="time-outline" size={14} color={Colors.neutral[500]} />
            <Text style={styles.timelineDate}>
              {(() => {
                try {
                  // Handle both timestamp and createdAt fields from API
                  const dateString = (item as any).timestamp || item.createdAt;
                  if (!dateString) return 'Unknown date';
                  
                  const date = new Date(dateString);
                  if (isNaN(date.getTime())) return 'Invalid date';
                  
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                } catch (error) {
                  console.warn('Error formatting timeline date:', error);
                  return 'Invalid date';
                }
              })()}
            </Text>
            <Text style={styles.timelineUser}>
              • {(item as any).createdByName || item.createdByName || 'System'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Booking not found</Text>
      </SafeAreaView>
    );
  }

  if (loading || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

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
                <Ionicons name="analytics" size={24} color="#11998E" />
              </View>
              <Text style={styles.headerTitle}>Job Tracking</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Status Overview Card - ENHANCED WITH GLASS & GRADIENTS */}
        <View style={styles.heroCard}>
          {/* Gradient Background Overlay */}
          <LinearGradient
            colors={['rgba(17, 153, 142, 0.05)', 'rgba(56, 239, 125, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradientOverlay}
          />
          
          <View style={styles.heroHeader}>
            {/* Animated Status Icon with Gradient Ring */}
            <View style={styles.statusIconWrapper}>
              {/* Outer Gradient Ring */}
              <LinearGradient
                colors={['#11998E', '#38EF7D', '#06D6A0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusRingOuter}
              >
                <View style={styles.statusRingInner}>
                  <LinearGradient
                    colors={[getStatusColor(booking.status), getStatusColor(booking.status) + '80']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroIconContainer}
                  >
                    <Ionicons 
                      name={getStatusIcon(booking.status)} 
                      size={36} 
                      color="#FFFFFF" 
                    />
                  </LinearGradient>
                </View>
              </LinearGradient>
            </View>
            
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{booking.jobTitle}</Text>
              <View style={styles.statusBadgeContainer}>
                <LinearGradient
                  colors={[getStatusColor(booking.status), getStatusColor(booking.status) + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.statusBadgeGradient}
                >
                  <Ionicons name="pulse" size={14} color="#FFFFFF" />
                  <Text style={styles.heroSubtitle}>{getStatusText(booking.status)}</Text>
                </LinearGradient>
              </View>
            </View>
          </View>
          
          {/* Enhanced Progress Bar with Gradient */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={['#11998E', '#38EF7D', '#06D6A0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBarFill, 
                  { width: `${getProgressPercentage(booking.status)}%` }
                ]}
              >
                {/* Shimmer effect */}
                <View style={styles.progressShimmer} />
              </LinearGradient>
            </View>
            <View style={styles.progressLabelContainer}>
              <Ionicons name="rocket" size={16} color="#11998E" />
              <Text style={styles.progressText}>
                {getProgressPercentage(booking.status)}% Complete
              </Text>
            </View>
          </View>
        </View>

        {/* Participants Card - GLASS MORPHISM */}
        <View style={styles.participantsCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.glassCard}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBadge}>
                <Ionicons name="people" size={20} color="#11998E" />
              </View>
              <Text style={styles.cardTitle}>Participants</Text>
            </View>
            
            <View style={styles.participantsGrid}>
            <View style={styles.participantItem}>
              <View style={styles.participantAvatar}>
                <Ionicons name="person-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantRole}>Worker</Text>
                <Text style={styles.participantName}>{booking.workerName}</Text>
              </View>
            </View>
            <View style={styles.participantItem}>
              <View style={styles.participantAvatar}>
                <Ionicons name="business-outline" size={20} color="#34C759" />
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantRole}>Client</Text>
                <Text style={styles.participantName}>{booking.clientName}</Text>
              </View>
            </View>
          </View>
          </LinearGradient>
        </View>

        {/* Job Details Card - GLASS MORPHISM */}
        <View style={styles.detailsCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.glassCard}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBadge}>
                <Ionicons name="information-circle" size={20} color="#11998E" />
              </View>
              <Text style={styles.cardTitle}>Job Details</Text>
            </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={16} color="#FF9500" />
              <Text style={styles.detailLabel}>Rate</Text>
              <Text style={styles.detailValue}>{formatCurrency(booking.agreedRate)}/hr</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#007AFF" />
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailValue}>
                {new Date(booking.startDate).toLocaleDateString()}
              </Text>
            </View>
            {booking.endDate && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#FF3B30" />
                <Text style={styles.detailLabel}>End Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(booking.endDate).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
          </LinearGradient>
        </View>

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Timeline Card - GLASS MORPHISM */}
        <View style={styles.timelineCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.glassCard}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBadge}>
                <Ionicons name="time" size={20} color="#11998E" />
              </View>
              <Text style={styles.cardTitle}>Progress Timeline</Text>
            </View>
            <View style={styles.modernTimeline}>
              {timeline.map((item, index) => renderTimelineItem(item, index))}
            </View>
          </LinearGradient>
        </View>

        {/* Payment Information */}
        {booking.payment && (
          <View style={styles.paymentCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.glassCard}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBadge}>
                  <Ionicons name="card" size={20} color="#11998E" />
                </View>
                <Text style={styles.cardTitle}>Payment Details</Text>
              </View>
            <View style={styles.paymentGrid}>
              <View style={styles.paymentItem}>
                <View style={styles.paymentIconWrapper}>
                  <Ionicons name="cash" size={20} color="#34C759" />
                </View>
                <View style={styles.paymentContent}>
                  <Text style={styles.paymentLabel}>Total Amount</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(booking.payment.amount)}</Text>
                </View>
              </View>
              <View style={styles.paymentItem}>
                <View style={styles.paymentIconWrapper}>
                  <Ionicons name="card" size={20} color="#FF9500" />
                </View>
                <View style={styles.paymentContent}>
                  <Text style={styles.paymentLabel}>Platform Fee</Text>
                  <Text style={styles.paymentFee}>{formatCurrency(booking.payment.platformFee)}</Text>
                </View>
              </View>
              <View style={styles.paymentStatusContainer}>
                <Text style={styles.paymentStatusLabel}>Payment Status</Text>
                <View style={[styles.paymentStatusBadge, { backgroundColor: getStatusColor(booking.payment.status as any) }]}>
                  <Text style={styles.paymentStatusText}>{booking.payment.status}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
          </View>
        )}

        {/* Completion Photos */}
        {booking.completionPhotos && booking.completionPhotos.length > 0 && (
          <View style={styles.photosCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.glassCard}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBadge}>
                  <Ionicons name="images" size={20} color="#11998E" />
                </View>
                <Text style={styles.cardTitle}>Completion Photos</Text>
              </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              <View style={styles.photosContainer}>
                {booking.completionPhotos.map((photo, index) => (
                  <View key={index} style={styles.photoCard}>
                    <Ionicons name="image" size={24} color="#999" />
                    <Text style={styles.photoLabel}>Photo {index + 1}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </LinearGradient>
          </View>
        )}

        {/* Completion Notes */}
        {booking.completionNotes && (
          <View style={styles.notesCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.glassCard}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBadge}>
                  <Ionicons name="document-text" size={20} color="#11998E" />
                </View>
                <Text style={styles.cardTitle}>Completion Notes</Text>
              </View>
              <View style={styles.notesContainer}>
                <Text style={styles.notesText}>{booking.completionNotes}</Text>
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

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

  scrollView: {
    flex: 1,
    padding: Spacing[5],
  },

  // Hero Status Card
  heroCard: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.xl,
    padding: 0,
    marginBottom: Spacing[5],
    overflow: 'hidden',
  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[5],
    padding: Spacing[6],
    paddingBottom: 0,
  },
  statusIconWrapper: {
    marginRight: Spacing[4],
  },
  statusRingOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
  },
  statusBadgeContainer: {
    alignSelf: 'flex-start',
  },
  statusBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#FFFFFF',
  },
  progressBarContainer: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[6],
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    position: 'relative',
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.full,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  progressText: {
    fontSize: Typography.fontSize.sm,
    color: '#11998E',
    fontWeight: Typography.fontWeight.bold as any,
  },

  // Glass Morphism Cards
  glassCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[4],
    gap: Spacing[3],
  },
  cardIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 153, 142, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card Title Style
  cardTitle: {
    flex: 1,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[900],
  },

  // Participants Card
  participantsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
    ...Shadows.base,
  },
  participantsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  participantItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing[2],
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  participantInfo: {
    flex: 1,
  },
  participantRole: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    fontWeight: Typography.fontWeight.medium as any,
    marginBottom: 2,
  },
  participantName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[900],
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
    ...Shadows.base,
  },
  detailsGrid: {
    gap: Spacing[4],
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    padding: Spacing[3],
    borderRadius: BorderRadius.lg,
  },
  detailLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
    marginLeft: Spacing[3],
    flex: 1,
    fontWeight: Typography.fontWeight.medium as any,
  },
  detailValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[900],
  },

  // Action Buttons - Floating Gradient Design
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },
  floatingActionButton: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
    elevation: 8,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[5],
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    letterSpacing: 0.5,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    letterSpacing: 0.5,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    letterSpacing: 0.5,
  },
  reviewedIndicator: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.base,
  },
  reviewedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
  },
  reviewedText: {
    color: Colors.primary[600],
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  disabledButton: {
    opacity: 0.5,
    borderColor: '#C3E6C3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Timeline Card
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
    ...Shadows.base,
  },
  modernTimeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing[5],
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: Spacing[4],
    width: 28,
  },
  timelineDotContainer: {
    width: 28,
    height: 28,
  },
  timelineDotGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.base,
  },
  timelineDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLineGradient: {
    width: 3,
    flex: 1,
    marginTop: Spacing[2],
    borderRadius: 1.5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E5EA',
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    padding: Spacing[4],
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(17, 153, 142, 0.2)',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  timelineStatus: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
  },
  timelineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  timelineStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[2],
    lineHeight: 20,
  },
  timelineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  timelineDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
  },
  timelineUser: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
  },

  // Payment Card
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
    ...Shadows.base,
  },
  paymentGrid: {
    gap: 16,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    padding: 16,
    borderRadius: 12,
  },
  paymentIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentContent: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
  },
  paymentFee: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    padding: 16,
    borderRadius: 12,
  },
  paymentStatusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paymentStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Photos Card
  photosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
    ...Shadows.base,
  },
  photosScroll: {
    marginBottom: -10,
  },
  photosContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  photoCard: {
    width: 120,
    height: 120,
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  photoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },

  // Notes Card
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
    ...Shadows.base,
  },
  notesContainer: {
    backgroundColor: Colors.neutral[50],
    padding: Spacing[4],
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#11998E',
  },
  notesText: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    lineHeight: 24,
  },

  // Info and Error States
  section: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 32,
  },


});

export default JobTrackingScreen;