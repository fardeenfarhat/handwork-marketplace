import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Header } from '@/components/common';
import { NotificationStackParamList } from '@/types';
import { Gradients, Colors, Spacing, BorderRadius, Typography, Shadows } from '@/styles/DesignSystem';
import apiService from '@/services/api';
import { useErrorHandler } from '@/hooks/useErrorHandler';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<NotificationStackParamList, 'NotificationsList'>;

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, any> | null;
}

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const { handleError } = useErrorHandler();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingRead, setMarkingRead] = useState<number[]>([]);


  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [filter])
  );

  const loadNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let response: any;
      if (filter === 'unread') {
        response = await apiService.getUnreadNotifications(100);
      } else {
        response = await apiService.getNotificationHistory(100, 0);
        response = response.notifications || response;
      }

      setNotifications(Array.isArray(response) ? response : []);
    } catch (error) {
      handleError(error, 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadNotifications(true);
  };

  const markAsRead = async (notificationId: number) => {
    try {
      setMarkingRead(prev => [...prev, notificationId]);
      await apiService.markNotificationsAsRead([notificationId]);
      
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      handleError(error, 'Failed to mark notification as read');
    } finally {
      setMarkingRead(prev => prev.filter(id => id !== notificationId));
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      handleError(error, 'Failed to mark all notifications as read');
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Handle navigation based on notification type
    const notificationData = notification.data || {};
    
    if (notification.type === 'job_application' && notificationData.jobId) {
      // Navigate to job details
      // navigation.navigate('Jobs', { screen: 'JobDetail', params: { jobId: notificationData.jobId } });
    } else if (notification.type === 'message' && notificationData.conversationId) {
      // Navigate to messages
      // navigation.navigate('Messages', { screen: 'Chat', params: { conversationId: notificationData.conversationId } });
    } else if (notification.type === 'booking_update' && notificationData.bookingId) {
      // Navigate to booking tracking
      // navigation.navigate('Payment', { screen: 'JobTracking', params: { bookingId: notificationData.bookingId } });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job_application':
        return 'briefcase-outline';
      case 'message':
        return 'chatbubble-outline';
      case 'payment':
        return 'card-outline';
      case 'booking_update':
        return 'calendar-outline';
      case 'review':
        return 'star-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'job_application':
        return '#007AFF';
      case 'message':
        return '#34C759';
      case 'payment':
        return '#FF9500';
      case 'booking_update':
        return '#5856D6';
      case 'review':
        return '#FFD700';
      default:
        return '#8E8E93';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderCustomHeader = () => (
    <LinearGradient
      colors={['#667EEA', '#764BA2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.customHeader}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.bellIconContainer}>
              <Ionicons name="notifications" size={32} color="#FFFFFF" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {notifications.filter(n => !n.is_read).length}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSubtitle}>
                Stay updated with your activity
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('NotificationSettings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Inline Stats */}
        <View style={styles.inlineStats}>
          <View style={styles.inlineStatItem}>
            <Text style={styles.inlineStatNumber}>{notifications.length}</Text>
            <Text style={styles.inlineStatLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.inlineStatItem}>
            <Text style={styles.inlineStatNumber}>
              {notifications.filter(n => !n.is_read).length}
            </Text>
            <Text style={styles.inlineStatLabel}>Unread</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.inlineStatItem}>
            <Text style={styles.inlineStatNumber}>
              {notifications.filter(n => n.is_read).length}
            </Text>
            <Text style={styles.inlineStatLabel}>Read</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.is_read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      {/* Colored Accent Bar */}
      {!item.is_read && (
        <View style={[
          styles.accentBar,
          { backgroundColor: getNotificationColor(item.type) }
        ]} />
      )}
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <LinearGradient
            colors={[getNotificationColor(item.type), getNotificationColor(item.type) + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Ionicons
              name={getNotificationIcon(item.type) as any}
              size={24}
              color="#FFFFFF"
            />
          </LinearGradient>
          
          <View style={styles.notificationText}>
            <View style={styles.notificationTitleRow}>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.is_read && (
                <View style={styles.unreadDot} />
              )}
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={styles.notificationFooter}>
              <Ionicons name="time-outline" size={12} color={Colors.neutral[400]} />
              <Text style={styles.notificationTime}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
          
          <View style={styles.notificationActions}>
            {markingRead.includes(item.id) ? (
              <ActivityIndicator size="small" color={Colors.primary[500]} />
            ) : !item.is_read ? (
              <TouchableOpacity
                style={styles.markReadButton}
                onPress={(e) => {
                  e.stopPropagation();
                  markAsRead(item.id);
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color={Colors.primary[500]} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="checkmark-circle" size={24} color={Colors.success[500]} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyIconGradient}
        >
          <Ionicons name="notifications-off-outline" size={48} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>
        {filter === 'unread' ? 'All Caught Up!' : 'No Notifications Yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'unread' 
          ? "Great job! You've read all your notifications."
          : "When you receive notifications, they'll appear here."
        }
      </Text>
    </View>
  );

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <View style={styles.container}>
      {renderCustomHeader()}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.activeFilterTabText]}>
            All Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterTabText, filter === 'unread' && styles.activeFilterTabText]}>
            Unread Only
          </Text>
          {notifications.filter(n => !n.is_read).length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notifications.filter(n => !n.is_read).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Actions Bar */}
      {notifications.filter(n => !n.is_read).length > 0 && (
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.markAllReadButton}
            onPress={markAllAsRead}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={Colors.primary[500]} />
            <Text style={styles.markAllReadText}>Mark All as Read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={Colors.primary[500]}
            />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
  },
  // Custom Header with Gradient
  customHeader: {
    paddingBottom: Spacing[4],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.danger[500],
    borderRadius: BorderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: Spacing[1],
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Inline Stats in Header
  inlineStats: {
    flexDirection: 'row',
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.xl,
    padding: Spacing[3],
    backdropFilter: 'blur(10px)',
  },
  inlineStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: Spacing[2],
  },
  inlineStatNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: Spacing[1],
  },
  inlineStatLabel: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    backgroundColor: '#FFFFFF',
    gap: Spacing[3],
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.neutral[100],
    gap: Spacing[2],
  },
  activeFilterTab: {
    backgroundColor: Colors.primary[500],
  },
  filterTabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.neutral[600],
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700' as const,
    color: Colors.primary[500],
  },
  actionsBar: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  markAllReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  markAllReadText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.primary[500],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[3],
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
  },
  listContainer: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing[3],
    overflow: 'hidden',
    ...Shadows.lg,
  },
  unreadNotification: {
    backgroundColor: '#F0F4FF',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  notificationContent: {
    padding: Spacing[4],
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
    gap: Spacing[2],
  },
  notificationTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500],
  },
  notificationMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    lineHeight: 20,
    marginBottom: Spacing[2],
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  notificationTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
    fontWeight: '500' as const,
  },
  notificationActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markReadButton: {
    padding: Spacing[1],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing[6] * 2,
    paddingHorizontal: Spacing[5],
  },
  emptyIconContainer: {
    marginBottom: Spacing[5],
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.xl,
  },
  emptyTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default NotificationsScreen;