import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationData {
  type: 'message' | 'job_update' | 'payment' | 'review';
  jobId?: number;
  messageId?: number;
  userId?: number;
  [key: string]: any;
}

class NotificationService {
  private expoPushToken: string | null = null;

  async initialize() {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the token
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);
      
      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  getToken(): string | null {
    return this.expoPushToken;
  }

  // Set up notification channels for Android
  async setupAndroidChannels() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('job_updates', {
        name: 'Job Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#34C759',
      });

      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9500',
      });
    }
  }

  // Schedule a local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    delay: number = 0
  ) {
    const channelId = this.getChannelId(data?.type || 'message');
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: delay > 0 ? { seconds: delay } : null,
    });
  }

  // Handle notification received while app is in foreground
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Handle notification tapped
  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Setup Android notification channels
  async setupAndroidChannels() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('job_updates', {
        name: 'Job Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#34C759',
      });

      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9500',
      });
    }
  }

  // Clear all notifications
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Clear notifications by tag/category
  async clearNotificationsByType(type: string) {
    // This would require storing notification IDs by type
    // For now, we'll clear all notifications
    await this.clearAllNotifications();
  }

  // Set badge count
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  private getChannelId(type: string): string {
    switch (type) {
      case 'message':
        return 'messages';
      case 'job_update':
        return 'job_updates';
      case 'payment':
        return 'payments';
      default:
        return 'default';
    }
  }

  // Handle deep linking from notifications
  handleNotificationData(data: NotificationData, navigation: any) {
    switch (data.type) {
      case 'message':
        if (data.jobId) {
          navigation.navigate('Messages', {
            screen: 'Chat',
            params: { jobId: data.jobId },
          });
        }
        break;
      case 'job_update':
        if (data.jobId) {
          navigation.navigate('Jobs', {
            screen: 'JobDetail',
            params: { jobId: data.jobId },
          });
        }
        break;
      case 'payment':
        navigation.navigate('Dashboard');
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;