import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { PaymentStackParamList, Booking, BookingTimeline, BookingStatus } from '@/types';
import { Button, LoadingSpinner } from '@/components/common';
import apiService from '@/services/api';

import { StackNavigationProp } from '@/types/navigation';

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'JobTracking'>;
type RouteProps = RouteProp<PaymentStackParamList, 'JobTracking'>;

const JobTrackingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [timeline, setTimeline] = useState<BookingTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadBookingData();
  }, []);

  const loadBookingData = async () => {
    try {
      const [bookingData, timelineData] = await Promise.all([
        apiService.getBooking(bookingId),
        apiService.getBookingTimeline(bookingId),
      ]);
      setBooking(bookingData as Booking);
      setTimeline(timelineData as BookingTimeline[]);
    } catch (error) {
      console.error('Error loading booking data:', error);
      Alert.alert('Error', 'Failed to load booking details');
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

    setUpdating(true);
    try {
      await apiService.updateBookingStatus(booking.id, newStatus, notes);
      await loadBookingData(); // Reload to get updated data
      Alert.alert('Success', 'Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
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
    navigation.navigate('CompletionVerification', { bookingId: booking.id });
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
        return '#FF9800';
      case 'confirmed':
        return '#2196F3';
      case 'in_progress':
        return '#4CAF50';
      case 'completed':
        return '#8BC34A';
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
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

  const renderActionButtons = () => {
    if (!booking) return null;

    switch (booking.status) {
      case 'confirmed':
        return (
          <View style={styles.actionButtons}>
            <Button
              title="Start Job"
              onPress={handleStartJob}
              disabled={updating}
              style={styles.actionButton}
            />
            <Button
              title="Cancel Job"
              onPress={handleCancelJob}
              disabled={updating}
              style={[styles.actionButton, { backgroundColor: '#f44336' }]}
            />
          </View>
        );
      case 'in_progress':
        return (
          <View style={styles.actionButtons}>
            <Button
              title="Mark as Complete"
              onPress={handleCompleteJob}
              disabled={updating}
              style={styles.actionButton}
            />
          </View>
        );
      case 'completed':
        return (
          <View style={styles.actionButtons}>
            <Button
              title="Report Issue"
              onPress={() => navigation.navigate('DisputeReport', { bookingId: booking.id })}
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            />
          </View>
        );
      default:
        return null;
    }
  };

  const renderTimelineItem = (item: BookingTimeline, index: number) => (
    <View key={item.id} style={styles.timelineItem}>
      <View style={styles.timelineIndicator}>
        <View style={[styles.timelineDot, { backgroundColor: getStatusColor(item.status) }]} />
        {index < timeline.length - 1 && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineStatus}>{getStatusText(item.status)}</Text>
        <Text style={styles.timelineDescription}>{item.description}</Text>
        <Text style={styles.timelineDate}>
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <Text style={styles.timelineUser}>by {item.createdByName}</Text>
      </View>
    </View>
  );

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.title}>Job Tracking</Text>

        {/* Booking Overview */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.statusHeader}>
              <Text style={styles.jobTitle}>{booking.jobTitle}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
              </View>
            </View>
            
            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Worker:</Text>
                <Text style={styles.detailValue}>{booking.workerName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Client:</Text>
                <Text style={styles.detailValue}>{booking.clientName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rate:</Text>
                <Text style={styles.detailValue}>${booking.agreedRate}/hour</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Start Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(booking.startDate).toLocaleDateString()}
                </Text>
              </View>
              {booking.endDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>End Date:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(booking.endDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Timeline</Text>
          <View style={styles.timeline}>
            {timeline.map((item, index) => renderTimelineItem(item, index))}
          </View>
        </View>

        {/* Payment Information */}
        {booking.payment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <View style={styles.card}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>${booking.payment.amount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform Fee:</Text>
                <Text style={styles.detailValue}>${booking.payment.platformFee}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, { color: getStatusColor(booking.payment.status as any) }]}>
                  {booking.payment.status}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Completion Photos */}
        {booking.completionPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Photos</Text>
            <View style={styles.photosContainer}>
              {booking.completionPhotos.map((photo, index) => (
                <View key={index} style={styles.photoPlaceholder}>
                  <Text style={styles.photoText}>Photo {index + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Completion Notes */}
        {booking.completionNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Notes</Text>
            <View style={styles.card}>
              <Text style={styles.completionNotes}>{booking.completionNotes}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '600',
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
    fontWeight: '600',
  },
  bookingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },

  timeline: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#999',
  },
  timelineUser: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    fontSize: 12,
    color: '#666',
  },
  completionNotes: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 32,
  },
});

export default JobTrackingScreen;