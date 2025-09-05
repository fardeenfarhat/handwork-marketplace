import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, LogBox } from 'react-native';

import { store } from '@/store';
import AppNavigator from '@/navigation/AppNavigator';
import { offlineSyncService } from '@/services/offlineSync';
import notificationService from '@/services/notificationService';

// Ignore specific warnings for development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'AsyncStorage has been extracted from react-native',
  ]);
}

export default function App() {
  console.log('🚀 APP: Component mounted');
  
  useEffect(() => {
    console.log('🚀 APP: Initializing services...');
    // Initialize services
    const initializeServices = async () => {
      try {
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
        <AppNavigator />
        <StatusBar style="auto" />
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});