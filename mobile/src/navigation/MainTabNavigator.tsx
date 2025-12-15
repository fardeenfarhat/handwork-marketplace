import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';

import { MainTabParamList } from '@/types';
import { RootState } from '@/store';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/styles/DesignSystem';
import JobsStackNavigator from './JobsStackNavigator';
import MessagesStackNavigator from './MessagesStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import PaymentStackNavigator from './PaymentStackNavigator';
import NotificationStackNavigator from './NotificationStackNavigator';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom Tab Bar Icon Component
const TabIcon = ({ focused, iconName, badgeCount }: { 
  focused: boolean; 
  iconName: keyof typeof Ionicons.glyphMap; 
  badgeCount?: number;
}) => {
  return (
    <View style={styles.iconContainer}>
      <Ionicons 
        name={iconName} 
        size={26} 
        color={focused ? Colors.primary[500] : Colors.neutral[500]} 
      />
      {(badgeCount && badgeCount > 0) ? (
        <View style={styles.badgeContainer}>
          <LinearGradient
            colors={[Colors.danger[500], Colors.danger[600]]}
            style={styles.badgeGradient}
          >
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : String(badgeCount)}
            </Text>
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
};

export default function MainTabNavigator() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { counts } = useNotificationBadge();
  const isWorker = user?.role === 'worker';
  const isClient = user?.role === 'client';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          let badgeCount = 0;

          switch (route.name) {
            case 'Jobs':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              badgeCount = counts.jobs;
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              badgeCount = counts.messages;
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'apps' : 'apps-outline';
              break;
            case 'Payments':
              iconName = focused ? 'card' : 'card-outline';
              badgeCount = counts.payments;
              break;
            case 'Notifications':
              iconName = focused ? 'notifications' : 'notifications-outline';
              badgeCount = counts.notifications;
              break;
            default:
              iconName = 'help-outline';
          }

          return <TabIcon focused={focused} iconName={iconName} badgeCount={badgeCount} />;
        },
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.neutral[500],
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: Typography.fontSize.xs,
          fontWeight: '600' as const,
          marginTop: 4,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 88 : 70,
          ...Shadows.lg,
          elevation: 20,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
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
      {/* Messages tab temporarily disabled */}
      {/* <Tab.Screen 
        name="Messages" 
        component={MessagesStackNavigator}
      /> */}
      <Tab.Screen 
        name="Notifications" 
        component={NotificationStackNavigator}
      />
      {(isClient || isWorker) && (
        <Tab.Screen 
          name="Payments" 
          component={PaymentStackNavigator}
          options={{
            tabBarLabel: isWorker ? 'Earnings' : 'Payments',
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

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 40,
  },
  badgeContainer: {
    position: 'absolute',
    right: 8,
    top: -2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  badgeGradient: {
    minWidth: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
});