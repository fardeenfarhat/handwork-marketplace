import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { MainTabParamList } from '@/types';
import { RootState } from '@/store';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import JobsStackNavigator from './JobsStackNavigator';
import MessagesStackNavigator from './MessagesStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import PaymentStackNavigator from './PaymentStackNavigator';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { counts } = useNotificationBadge();
  const isWorker = user?.role === 'worker';
  const isClient = user?.role === 'client';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Jobs':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Payments':
              iconName = focused ? 'card' : 'card-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Jobs" 
        component={JobsStackNavigator}
        options={{
          tabBarLabel: isWorker ? 'Find Work' : 'My Jobs',
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesStackNavigator}
        options={{
          tabBarBadge: counts.messages > 0 ? counts.messages : undefined,
        }}
      />
      {(isClient || isWorker) && (
        <Tab.Screen 
          name="Payments" 
          component={PaymentStackNavigator}
          options={{
            tabBarLabel: isWorker ? 'Earnings' : 'Payments',
            tabBarBadge: counts.payments > 0 ? counts.payments : undefined,
          }}
        />
      )}
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}