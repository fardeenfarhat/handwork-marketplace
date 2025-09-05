import notificationService from '../../services/notificationService';
import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    HIGH: 'high',
    DEFAULT: 'default',
  },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(notificationService).toBeDefined();
  });

  it('should have initialize method', () => {
    expect(notificationService.initialize).toBeDefined();
    expect(typeof notificationService.initialize).toBe('function');
  });

  it('should have getNotificationPreferences method', () => {
    expect(notificationService.getNotificationPreferences).toBeDefined();
    expect(typeof notificationService.getNotificationPreferences).toBe('function');
  });

  it('should have updateNotificationPreferences method', () => {
    expect(notificationService.updateNotificationPreferences).toBeDefined();
    expect(typeof notificationService.updateNotificationPreferences).toBe('function');
  });

  it('should have setupAndroidChannels method', () => {
    expect(notificationService.setupAndroidChannels).toBeDefined();
    expect(typeof notificationService.setupAndroidChannels).toBe('function');
  });

  it('should setup Android channels', async () => {
    await notificationService.setupAndroidChannels();
    
    // Should call setNotificationChannelAsync for each channel
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(3);
  });
});