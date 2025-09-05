import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

import { PaymentStackParamList } from '@/types';
import { RootState } from '@/store';
import PaymentMethodsScreen from '@/screens/payments/PaymentMethodsScreen';
import AddPaymentMethodScreen from '@/screens/payments/AddPaymentMethodScreen';
import BookingConfirmationScreen from '@/screens/payments/BookingConfirmationScreen';
import JobTrackingScreen from '@/screens/payments/JobTrackingScreen';
import CompletionVerificationScreen from '@/screens/payments/CompletionVerificationScreen';
import PaymentHistoryScreen from '@/screens/payments/PaymentHistoryScreen';
import DisputeReportScreen from '@/screens/payments/DisputeReportScreen';
import DisputeDetailScreen from '@/screens/payments/DisputeDetailScreen';

const Stack = createNativeStackNavigator<PaymentStackParamList>();

export default function PaymentStackNavigator() {
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
        name="PaymentMethods" 
        component={PaymentMethodsScreen}
        options={{
          title: isWorker ? 'Payout Methods' : 'Payment Methods',
          headerShown: false, // Let the screen handle its own header
        }}
      />
      <Stack.Screen 
        name="AddPaymentMethod" 
        component={AddPaymentMethodScreen}
        options={{
          title: isWorker ? 'Add Payout Method' : 'Add Payment Method',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="BookingConfirmation" 
        component={BookingConfirmationScreen}
        options={{
          title: 'Confirm Booking',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="JobTracking" 
        component={JobTrackingScreen}
        options={{
          title: 'Job Progress',
        }}
      />
      <Stack.Screen 
        name="CompletionVerification" 
        component={CompletionVerificationScreen}
        options={{
          title: 'Mark Complete',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="PaymentHistory" 
        component={PaymentHistoryScreen}
        options={{
          title: isWorker ? 'Earnings History' : 'Payment History',
        }}
      />
      <Stack.Screen 
        name="DisputeReport" 
        component={DisputeReportScreen}
        options={{
          title: 'Report Issue',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="DisputeDetail" 
        component={DisputeDetailScreen}
        options={{
          title: 'Dispute Details',
        }}
      />
    </Stack.Navigator>
  );
}