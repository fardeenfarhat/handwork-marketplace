import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import { RootState, AppDispatch } from '@/store';
import { RootStackParamList } from '@/types';
import { loadStoredAuth } from '@/store/slices/authSlice';
import { linkingConfig, deepLinkingService } from '@/services/deepLinking';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import NotificationHandler from '@/components/common/NotificationHandler';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    isEmailVerified, 
    onboardingCompleted 
  } = useSelector((state: RootState) => state.auth);

  console.log('🧭 APP NAVIGATOR: Component rendered');
  console.log('🔐 isAuthenticated:', isAuthenticated);
  console.log('⏳ isLoading:', isLoading);
  console.log('👤 user:', user ? `${user.firstName} ${user.lastName}` : 'null');
  console.log('📧 isEmailVerified:', isEmailVerified);
  console.log('🎯 onboardingCompleted:', onboardingCompleted);

  useEffect(() => {
    console.log('🧭 APP NAVIGATOR: Loading stored auth...');
    // Load stored authentication on app start
    dispatch(loadStoredAuth());
  }, [dispatch]);

  // Handle deep links
  const handleDeepLink = (url: string) => {
    deepLinkingService.handleDeepLink(url);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('⏳ APP NAVIGATOR: Showing loading spinner');
    return <LoadingSpinner text="Loading..." />;
  }

  // Determine which navigator to show based on auth state
  const shouldShowAuth = !isAuthenticated || 
    (isAuthenticated && (!isEmailVerified || !onboardingCompleted));
  
  console.log('🧭 APP NAVIGATOR: shouldShowAuth =', shouldShowAuth);
  console.log('🧭 Navigation decision logic:');
  console.log('  - !isAuthenticated:', !isAuthenticated);
  console.log('  - isAuthenticated && !isEmailVerified:', isAuthenticated && !isEmailVerified);
  console.log('  - isAuthenticated && !onboardingCompleted:', isAuthenticated && !onboardingCompleted);

  return (
    <NavigationContainer
      linking={linkingConfig}
      onReady={() => {
        // Set navigation ref for deep linking service
        deepLinkingService.setNavigationRef(
          // @ts-ignore - NavigationContainer ref typing issue
          React.createRef()
        );
      }}
    >
      <NotificationHandler />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {shouldShowAuth ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}