import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPreferences, PushNotification, NotificationType } from '../types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  async initialize(): Promise<void> {
    try {
      // Register for push notifications
      await this.registerForPushNotifications();
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      // Load notification preferences
      await this.loadNotificationPreferences();
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with actual project ID
      });
      
      this.expoPushToken = token.data;
      
      // Store token locally
      await AsyncStorage.setItem('expoPushToken', token.data);
      
      // Send token to backend
      await this.sendTokenToBackend(token.data);
      
      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  private setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.handleNotificationReceived(notification);
      }
    );

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        this.handleNotificationResponse(response);
      }
    );
  }

  private handleNotificationReceived(notification: Notifications.Notification): void {
    const { title, body, data } = notification.request.content;
    
    // Store notification in local storage for history
    this.storeNotificationLocally({
      id: notification.request.identifier,
      title: title || '',
      body: body || '',
      type: (data?.type as NotificationType) || 'system',
      data: data || {},
      userId: data?.userId || 0,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // Update badge count
    this.updateBadgeCount();
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const { data } = notification.request.content;

    // Mark notification as read
    this.markNotificationAsRead(notification.request.identifier);

    // Handle navigation based on notification type
    this.handleNotificationNavigation(data);
  }

  private handleNotificationNavigation(data: any): void {
    // This will be handled by the navigation service
    // For now, we'll emit an event that can be caught by the app
    if (data?.type && data?.navigationData) {
      // Emit navigation event
      console.log('Navigate to:', data.type, data.navigationData);
    }
  }

  async sendTokenToBackend(token: string): Promise<void> {
    try {
      // This would send the token to your backend API
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header
        },
        body: JSON.stringify({ token, platform: Platform.OS }),
      });

      if (!response.ok) {
        throw new Error('Failed to register push token');
      }
    } catch (error) {
      console.error('Failed to send token to backend:', error);
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data: any = {},
    scheduledFor?: Date
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: scheduledFor ? { date: scheduledFor } : null,
    });

    return identifier;
  }

  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getNotificationHistory(): Promise<PushNotification[]> {
    try {
      const stored = await AsyncStorage.getItem('notificationHistory');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  private async storeNotificationLocally(notification: PushNotification): Promise<void> {
    try {
      const history = await this.getNotificationHistory();
      const updated = [notification, ...history].slice(0, 100); // Keep last 100 notifications
      await AsyncStorage.setItem('notificationHistory', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to store notification locally:', error);
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const history = await this.getNotificationHistory();
      const updated = history.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      );
      await AsyncStorage.setItem('notificationHistory', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async markAllNotificationsAsRead(): Promise<void> {
    try {
      const history = await this.getNotificationHistory();
      const updated = history.map(notification => ({ ...notification, isRead: true }));
      await AsyncStorage.setItem('notificationHistory', JSON.stringify(updated));
      
      // Clear badge count
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const history = await this.getNotificationHistory();
      return history.filter(notification => !notification.isRead).length;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  private async updateBadgeCount(): Promise<void> {
    try {
      const unreadCount = await this.getUnreadCount();
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem('notificationPreferences');
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Default preferences
      return {
        jobUpdates: true,
        messages: true,
        payments: true,
        reviews: true,
        bookings: true,
        marketing: false,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return {
        jobUpdates: true,
        messages: true,
        payments: true,
        reviews: true,
        bookings: true,
        marketing: false,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };
    }
  }

  private async loadNotificationPreferences(): Promise<void> {
    const preferences = await this.getNotificationPreferences();
    // Apply preferences to notification behavior
    console.log('Loaded notification preferences:', preferences);
  }

  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const current = await this.getNotificationPreferences();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(updated));
      
      // Send preferences to backend
      await this.sendPreferencesToBackend(updated);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  }

  private async sendPreferencesToBackend(preferences: NotificationPreferences): Promise<void> {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences on backend');
      }
    } catch (error) {
      console.error('Failed to send preferences to backend:', error);
    }
  }

  async clearNotificationHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem('notificationHistory');
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Failed to clear notification history:', error);
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Add missing methods for compatibility
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

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
}

export default new NotificationService();