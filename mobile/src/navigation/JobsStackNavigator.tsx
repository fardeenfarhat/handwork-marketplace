import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

import { JobsStackParamList } from '@/types';
import { RootState } from '@/store';
import JobsScreen from '@/screens/jobs/JobsScreen';
import JobMapScreen from '@/screens/jobs/JobMapScreen';
import JobDetailScreen from '@/screens/jobs/JobDetailScreen';
import JobPostScreen from '@/screens/jobs/JobPostScreen';
import JobApplicationScreen from '@/screens/jobs/JobApplicationScreen';
import JobManagementScreen from '@/screens/jobs/JobManagementScreen';

const Stack = createNativeStackNavigator<JobsStackParamList>();

export default function JobsStackNavigator() {
  const { user } = useSelector((state: RootState) => state.auth);
  const isWorker = user?.role === 'worker';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="JobsList" 
        component={JobsScreen}
        options={{
          title: isWorker ? 'Find Work' : 'My Jobs',
          headerShown: false, // Let the screen handle its own header
        }}
      />
      <Stack.Screen 
        name="JobMap" 
        component={JobMapScreen}
        options={{
          title: 'Jobs Map',
          headerShown: false, // Let the screen handle its own header
        }}
      />
      <Stack.Screen 
        name="JobDetail" 
        component={JobDetailScreen}
        options={{
          title: 'Job Details',
        }}
      />
      {!isWorker && (
        <Stack.Screen 
          name="JobPost" 
          component={JobPostScreen}
          options={{
            title: 'Post a Job',
            presentation: 'modal',
          }}
        />
      )}
      {isWorker && (
        <Stack.Screen 
          name="JobApplication" 
          component={JobApplicationScreen}
          options={{
            title: 'Apply for Job',
            presentation: 'modal',
          }}
        />
      )}
      <Stack.Screen 
        name="JobManagement" 
        component={JobManagementScreen}
        options={{
          title: isWorker ? 'My Applications' : 'Manage Jobs',
        }}
      />
    </Stack.Navigator>
  );
}