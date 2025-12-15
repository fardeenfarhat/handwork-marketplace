import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotificationStackParamList } from '@/types';
import NotificationsScreen from '@/screens/NotificationsScreen';
import NotificationSettingsScreen from '@/screens/profile/NotificationSettingsScreen';

const Stack = createNativeStackNavigator<NotificationStackParamList>();

export default function NotificationStackNavigator() {
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
        name="NotificationsList"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          headerShown: false,
          title: 'Notification Settings',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}