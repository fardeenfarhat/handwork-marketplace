import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useWebSocket } from './useWebSocket';
import apiService from '../services/api';

interface NotificationCounts {
  messages: number;
  jobs: number;
  payments: number;
  reviews: number;
  notifications: number;
  total: number;
}

export const useNotificationBadge = () => {
  const [counts, setCounts] = useState<NotificationCounts>({
    messages: 0,
    jobs: 0,
    payments: 0,
    reviews: 0,
    notifications: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Setup WebSocket to listen for real-time updates
  useWebSocket({
    onMessage: () => {
      // Increment message count
      setCounts(prev => ({
        ...prev,
        messages: prev.messages + 1,
        total: prev.total + 1,
      }));
    },
    onJobUpdate: () => {
      // Increment job notification count
      setCounts(prev => ({
        ...prev,
        jobs: prev.jobs + 1,
        total: prev.total + 1,
      }));
    },
    onBookingUpdate: () => {
      // Increment payment notification count
      setCounts(prev => ({
        ...prev,
        payments: prev.payments + 1,
        total: prev.total + 1,
      }));
    },
    onNotification: (data: any) => {
      // Handle other notification types
      const { type } = data;
      setCounts(prev => {
        const newCounts = { ...prev };
        
        switch (type) {
          case 'review':
            newCounts.reviews += 1;
            break;
          case 'payment':
            newCounts.payments += 1;
            break;
          case 'job_update':
            newCounts.jobs += 1;
            break;
          default:
            // Don't increment specific counters for unknown types
            break;
        }
        
        newCounts.total = newCounts.messages + newCounts.jobs + newCounts.payments + newCounts.reviews;
        return newCounts;
      });
    },
  });

  const loadNotificationCounts = async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setIsLoading(true);
      
      // Get badge counts and unread notifications
      const [badgeCounts, unreadNotifications] = await Promise.all([
        apiService.getNotificationCounts(),
        apiService.getUnreadNotifications(100)
      ]);
      
      const unreadCount = Array.isArray(unreadNotifications) ? unreadNotifications.length : 0;
      
      setCounts({
        messages: (badgeCounts as any)?.messages || 0,
        jobs: (badgeCounts as any)?.jobs || 0,
        payments: (badgeCounts as any)?.payments || 0,
        reviews: (badgeCounts as any)?.reviews || 0,
        notifications: unreadCount,
        total: (badgeCounts as any)?.total || unreadCount,
      });
    } catch (error) {
      console.error('Error loading notification counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = (count: number = 0) => {
    setCounts(prev => ({
      ...prev,
      messages: Math.max(0, prev.messages - count),
      total: Math.max(0, prev.total - count),
    }));
  };

  const markJobNotificationsAsRead = (count: number = 0) => {
    setCounts(prev => ({
      ...prev,
      jobs: Math.max(0, prev.jobs - count),
      total: Math.max(0, prev.total - count),
    }));
  };

  const markPaymentNotificationsAsRead = (count: number = 0) => {
    setCounts(prev => ({
      ...prev,
      payments: Math.max(0, prev.payments - count),
      total: Math.max(0, prev.total - count),
    }));
  };

  const markReviewNotificationsAsRead = (count: number = 0) => {
    setCounts(prev => ({
      ...prev,
      reviews: Math.max(0, prev.reviews - count),
      total: Math.max(0, prev.total - count),
    }));
  };

  const clearAllNotifications = () => {
    setCounts({
      messages: 0,
      jobs: 0,
      payments: 0,
      reviews: 0,
      notifications: 0,
      total: 0,
    });
  };

  // Load initial counts when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      loadNotificationCounts();
    } else {
      clearAllNotifications();
    }
  }, [isAuthenticated, user]);

  return {
    counts,
    isLoading,
    loadNotificationCounts,
    markMessagesAsRead,
    markJobNotificationsAsRead,
    markPaymentNotificationsAsRead,
    markReviewNotificationsAsRead,
    clearAllNotifications,
  };
};