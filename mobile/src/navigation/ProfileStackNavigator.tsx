import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/types';
import {
  ProfileScreen,
  WorkerProfileEditScreen,
  ClientProfileEditScreen,
  KYCUploadScreen,
  PortfolioScreen,
} from '@/screens/profile';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkerProfileEdit"
        component={WorkerProfileEditScreen}
        options={{
          title: 'Edit Profile',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="ClientProfileEdit"
        component={ClientProfileEditScreen}
        options={{
          title: 'Edit Profile',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="KYCUpload"
        component={KYCUploadScreen}
        options={{
          title: 'Identity Verification',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{
          title: 'Portfolio',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}