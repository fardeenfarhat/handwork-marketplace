import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ReviewStackParamList } from '@/types';
import ReviewSubmissionScreen from '@/screens/reviews/ReviewSubmissionScreen';
import ReviewsListScreen from '@/screens/reviews/ReviewsListScreen';
import ReviewDetailScreen from '@/screens/reviews/ReviewDetailScreen';
import ReviewModerationScreen from '@/screens/reviews/ReviewModerationScreen';

const Stack = createNativeStackNavigator<ReviewStackParamList>();

export default function ReviewStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="ReviewSubmission" 
        component={ReviewSubmissionScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="ReviewsList" 
        component={ReviewsListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ReviewDetail" 
        component={ReviewDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ReviewModeration" 
        component={ReviewModerationScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}