import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { AuthStackParamList } from '@/types';
import { RootState } from '@/store';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import EmailVerificationScreen from '@/screens/auth/EmailVerificationScreen';
import PhoneVerificationScreen from '@/screens/auth/PhoneVerificationScreen';
import OnboardingScreen from '@/screens/auth/OnboardingScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  console.log('🔐 AUTH NAVIGATOR: Component rendered');
  const { isAuthenticated, isEmailVerified, onboardingCompleted, user } = useSelector((state: RootState) => state.auth);
  
  // Determine initial route based on auth state
  const getInitialRouteName = (): keyof AuthStackParamList => {
    console.log('🔐 AUTH NAVIGATOR: Determining initial route...');
    console.log('🔐 isAuthenticated:', isAuthenticated);
    console.log('� isEumailVerified:', isEmailVerified);  
    console.log('🎯 onboardingCompleted:', onboardingCompleted);
    
    if (!isAuthenticated) {
      console.log('🔐 → Going to Login (not authenticated)');
      return 'Login';
    }
    
    if (!isEmailVerified) {
      console.log('📧 → Going to EmailVerification (not verified)');
      return 'EmailVerification';
    }
    
    if (!onboardingCompleted) {
      console.log('🎯 → Going to Onboarding (not completed)');
      return 'Onboarding';
    }
    
    // If everything is complete, this shouldn't happen as AppNavigator should show MainTab
    console.log('🔐 → Fallback to Login');
    return 'Login';
  };
  
  // Create a key that changes when auth state changes to force re-render
  const navigatorKey = `${isAuthenticated}-${isEmailVerified}-${onboardingCompleted}`;
  
  return (
    <Stack.Navigator
      key={navigatorKey}
      initialRouteName={getInitialRouteName()}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}