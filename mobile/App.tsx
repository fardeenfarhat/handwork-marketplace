import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, LogBox } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';

import { store } from '@/store';
import AppNavigator from '@/navigation/AppNavigator';
import { offlineSyncService } from '@/services/offlineSync';
import notificationService from '@/services/notificationService';
import { CacheCleanup } from '@/utils/cacheCleanup';

// Ignore specific warnings for development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'AsyncStorage has been extracted from react-native',
    'RN GoogleSignin native module is not correctly linked',
  ]);
}

// Stripe configuration
// Fallback to hardcoded key if env var not loaded (common Expo issue)
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_51STj0VAhfIphC8T0N11xb3jOW12LBNkWq3pcu1e7UrCE0LdE26VYZmnaxmqaz9ec2NaFKGJyPfMB9XfHQq8GJOZW00xYM0DBQ1';

export default function App() {
  console.log('🚀 APP: Component mounted');
  console.log(
    '🔑 STRIPE KEY:',
    STRIPE_PUBLISHABLE_KEY
      ? `${STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...`
      : 'NOT SET'
  );

  // Global error handler to catch the last4 error
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.toString().includes('last4')) {
        console.log('🚨 CAUGHT last4 ERROR:', args);
        console.trace('🚨 ERROR STACK TRACE');
      }
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    console.log('🚀 APP: Initializing services...');
    // Initialize services
    const initializeServices = async () => {
      try {
        console.log('🧹 Cleaning up corrupted cache data...');
        // Clean up any corrupted cache data that might cause JSON parsing errors
        await CacheCleanup.validateAndFixStorageData();
        console.log('✅ Cache cleanup completed');

        console.log('🔄 Initializing offline sync service...');
        // Initialize offline sync service
        offlineSyncService.initialize();
        console.log('✅ Offline sync service initialized');

        console.log('🔔 Initializing notification service...');
        // Initialize notification service
        await notificationService.initialize();
        console.log('✅ Notification service initialized');

        console.log('📱 Setting up Android notification channels...');
        // Setup Android notification channels
        await notificationService.setupAndroidChannels();
        console.log('✅ Android notification channels set up');

        console.log('🎉 All services initialized successfully');
      } catch (error) {
        console.error('💥 Failed to initialize services:', error);
      }
    };

    initializeServices();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <AppNavigator />
          <StatusBar style="auto" />
        </StripeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
