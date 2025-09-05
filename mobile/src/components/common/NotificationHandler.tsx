import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import { RootState } from '../../store';
import notificationService from '../../services/notificationService';
import useWebSocket from '../../hooks/useWebSocket';

const NotificationHandler: React.FC = () => {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Setup WebSocket with notification handlers
  useWebSocket({
    onNotification: (data) => {
      console.log('Received WebSocket notification:', data);
      // Handle real-time notifications
      handleNotificationData(data);
    },
    onMessage: (data) => {
      console.log('Received WebSocket message:', data);
      // Show local notification for new message
      notificationService.scheduleLocalNotification(
        'New Message',
        `You have a new message`,
        {
          type: 'message',
          jobId: data.jobId,
          senderId: data.senderId,
        }
      );
    },
    onJobUpdate: (data) => {
      console.log('Received job update:', data);
      // Show local notification for job update
      notificationService.scheduleLocalNotification(
        'Job Update',
        `Your job status has been updated to ${data.status}`,
        {
          type: 'job_update',
          jobId: data.jobId,
          status: data.status,
        }
      );
    },
    onBookingUpdate: (data) => {
      console.log('Received booking update:', data);
      // Show local notification for booking update
      notificationService.scheduleLocalNotification(
        'Booking Update',
        `Your booking status has been updated to ${data.status}`,
        {
          type: 'booking_update',
          bookingId: data.bookingId,
          status: data.status,
        }
      );
    },
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      setupNotificationListeners();
    }

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated, user]);

  const setupNotificationListeners = () => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // Handle foreground notification
        handleForegroundNotification(notification);
      }
    );

    // Listen for user interactions with notifications
    responseListener.current = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        // Handle notification tap
        handleNotificationResponse(response);
      }
    );
  };

  const handleForegroundNotification = (notification: Notifications.Notification) => {
    const { title, body, data } = notification.request.content;
    
    // You could show an in-app notification banner here
    // For now, just log it
    console.log('Foreground notification:', { title, body, data });
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content;
    handleNotificationData(data);
  };

  const handleNotificationData = (data: any) => {
    if (!data || !navigation) return;

    const { type, jobId, bookingId, reviewId, messageId } = data;

    try {
      switch (type) {
        case 'message':
          if (jobId) {
            (navigation as any).navigate('Messages', {
              screen: 'Chat',
              params: { jobId },
            });
          }
          break;

        case 'job_update':
          if (jobId) {
            (navigation as any).navigate('Jobs', {
              screen: 'JobDetail',
              params: { jobId },
            });
          }
          break;

        case 'booking_update':
          if (bookingId) {
            (navigation as any).navigate('Payments', {
              screen: 'JobTracking',
              params: { bookingId },
            });
          }
          break;

        case 'payment':
          (navigation as any).navigate('Payments', {
            screen: 'PaymentHistory',
          });
          break;

        case 'review':
          if (reviewId) {
            (navigation as any).navigate('Reviews', {
              screen: 'ReviewDetail',
              params: { reviewId },
            });
          }
          break;

        default:
          // Navigate to dashboard for unknown types
          (navigation as any).navigate('Dashboard');
          break;
      }
    } catch (error) {
      console.error('Error handling notification navigation:', error);
    }
  };

  // This component doesn't render anything
  return null;
};

export default NotificationHandler;