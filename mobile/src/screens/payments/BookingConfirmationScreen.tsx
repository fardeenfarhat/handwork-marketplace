import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { PaymentStackParamList, Job, WorkerProfile, PaymentMethod } from '@/types';
import { Button, LoadingSpinner } from '@/components/common';
import apiService from '@/services/api';

import { StackNavigationProp } from '@/types/navigation';

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'BookingConfirmation'>;
type RouteProps = RouteProp<PaymentStackParamList, 'BookingConfirmation'>;

const BookingConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { jobId, workerId, agreedRate } = route.params;

  const [job, setJob] = useState<Job | null>(null);
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobData, workerData, paymentMethodsData] = await Promise.all([
        apiService.getJob(jobId),
        apiService.getWorkerProfile(), // This would need to be modified to get specific worker
        apiService.getPaymentMethods(),
      ]);

      setJob(jobData);
      setWorker(workerData);
      setPaymentMethods(paymentMethodsData);
      
      // Set default payment method
      const defaultMethod = paymentMethodsData.find(method => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const subtotal = agreedRate;
    const platformFee = subtotal * 0.05; // 5% platform fee
    const total = subtotal + platformFee;
    return { subtotal, platformFee, total };
  };

  const handleConfirmBooking = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setProcessing(true);
    try {
      // Create booking
      const bookingData = {
        jobId,
        workerId,
        startDate: startDate.toISOString(),
        agreedRate,
      };
      
      const booking = await apiService.createBooking(bookingData) as { id: number };
      
      // Process payment
      const { total } = calculateTotal();
      await apiService.processPayment({
        bookingId: booking.id,
        paymentMethodId: selectedPaymentMethod,
        amount: total,
      });

      Alert.alert(
        'Booking Confirmed!',
        'Your booking has been confirmed and payment has been processed.',
        [
          {
            text: 'View Booking',
            onPress: () => navigation.navigate('JobTracking', { bookingId: booking.id }),
          },
        ]
      );
    } catch (error) {
      console.error('Error confirming booking:', error);
      Alert.alert('Error', 'Failed to confirm booking. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodOption,
        selectedPaymentMethod === method.id && styles.paymentMethodSelected,
      ]}
      onPress={() => setSelectedPaymentMethod(method.id)}
    >
      <View style={styles.paymentMethodInfo}>
        <Text style={styles.paymentMethodType}>
          {method.type === 'card' ? 'Credit Card' : 
           method.type === 'paypal' ? 'PayPal' : 'Bank Account'}
        </Text>
        <Text style={styles.paymentMethodDetails}>
          {method.type === 'card' && `**** **** **** ${method.last4}`}
          {method.type === 'paypal' && method.email}
          {method.type === 'bank_account' && `${method.bankName} ****${method.last4}`}
        </Text>
      </View>
      <View style={[
        styles.radioButton,
        selectedPaymentMethod === method.id && styles.radioButtonSelected,
      ]}>
        {selectedPaymentMethod === method.id && <View style={styles.radioButtonInner} />}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!job || !worker) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Failed to load booking details</Text>
      </SafeAreaView>
    );
  }

  const { subtotal, platformFee, total } = calculateTotal();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Confirm Booking</Text>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.card}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobCategory}>{job.category}</Text>
            <Text style={styles.jobLocation}>{job.location}</Text>
          </View>
        </View>

        {/* Worker Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Worker</Text>
          <View style={styles.card}>
            <Text style={styles.workerName}>John Doe</Text>
            <Text style={styles.workerRating}>⭐ {worker.rating} ({worker.totalJobs} jobs)</Text>
            <Text style={styles.workerRate}>${agreedRate}/hour</Text>
          </View>
        </View>

        {/* Start Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Date</Text>
          <View style={styles.card}>
            <Text style={styles.startDate}>
              {startDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.noPaymentMethods}>No payment methods available</Text>
              <Button
                title="Add Payment Method"
                onPress={() => navigation.navigate('AddPaymentMethod')}
                style={styles.addPaymentButton}
              />
            </View>
          ) : (
            <View style={styles.paymentMethods}>
              {paymentMethods.map(renderPaymentMethod)}
            </View>
          )}
        </View>

        {/* Cost Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Breakdown</Text>
          <View style={styles.card}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Hourly Rate</Text>
              <Text style={styles.costValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Platform Fee (5%)</Text>
              <Text style={styles.costValue}>${platformFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.costRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Your payment will be held in escrow until the job is completed and approved.
          </Text>
        </View>

        <Button
          title={processing ? 'Processing...' : 'Confirm Booking'}
          onPress={handleConfirmBooking}
          disabled={processing || paymentMethods.length === 0 || !selectedPaymentMethod}
          style={styles.confirmButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  jobCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  jobLocation: {
    fontSize: 14,
    color: '#666',
  },
  workerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workerRating: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  workerRate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  startDate: {
    fontSize: 16,
    color: '#333',
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  paymentMethodSelected: {
    borderColor: '#2196F3',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentMethodDetails: {
    fontSize: 14,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2196F3',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
  },
  noPaymentMethods: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  addPaymentButton: {
    marginTop: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 16,
    color: '#666',
  },
  costValue: {
    fontSize: 16,
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  disclaimer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  confirmButton: {
    marginBottom: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 32,
  },
});

export default BookingConfirmationScreen;