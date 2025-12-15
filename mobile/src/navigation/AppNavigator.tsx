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
import ReviewStackNavigator from './ReviewStackNavigator';
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
    const checkStoredAuth = async () => {
      console.log('🧭 APP NAVIGATOR: Checking for stored auth...');
      try {
        const { secureStorage } = await import('@/services/storage');
        const rememberMe = await secureStorage.getItem('remember_me');
        
        if (rememberMe === 'true') {
          console.log('🧭 APP NAVIGATOR: User chose to be remembered, loading stored auth...');
          dispatch(loadStoredAuth());
        } else {
          console.log('🧭 APP NAVIGATOR: No remember me preference, starting fresh');
        }
      } catch (error) {
        console.log('🧭 APP NAVIGATOR: Error checking remember me preference:', error);
      }
    };

    checkStoredAuth();
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

  // Simple logic: Show main app ONLY if authenticated + email verified + onboarding done
  const canShowMainApp = isAuthenticated && isEmailVerified && onboardingCompleted;
  
  console.log('🧭 APP NAVIGATOR: Navigation decision');
  console.log('  - isAuthenticated:', isAuthenticated);
  console.log('  - isEmailVerified:', isEmailVerified);
  console.log('  - onboardingCompleted:', onboardingCompleted);
  console.log('  - canShowMainApp:', canShowMainApp);
  console.log('  - Will show:', canShowMainApp ? 'Main Navigator' : 'Auth Navigator');

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
        {canShowMainApp ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="Reviews" 
              component={ReviewStackNavigator}
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}