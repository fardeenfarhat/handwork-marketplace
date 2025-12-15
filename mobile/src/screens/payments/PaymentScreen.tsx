import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useStripe } from '@stripe/stripe-react-native';

import { PaymentStackParamList, Booking, PaymentMethod } from '@/types';
import { Button, LoadingSpinner } from '@/components/common';
import {
  Gradients,
  Colors,
  Spacing,
  BorderRadius,
  Typography,
} from '@/styles/DesignSystem';
import { StackNavigationProp } from '@/types/navigation';
import { RootState, AppDispatch } from '@/store';
import {
  fetchPaymentMethods,
  createPaymentIntent,
  confirmPayment,
} from '@/store/slices/paymentSlice';
import { paymentService } from '@/services/paymentService';

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'Payment'>;
type RouteProps = RouteProp<PaymentStackParamList, 'Payment'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const isFocused = useIsFocused();
  const dispatch = useDispatch<AppDispatch>();
  const stripe = useStripe();

  // Get booking details from route params
  const { bookingId, jobTitle, workerName, workingHours, hourlyRate } =
    route.params;

  // Redux state
  const {
    paymentMethods,
    isLoadingPaymentMethods,
    isProcessingPayment,
    error,
  } = useSelector((state: RootState) => state.payment);

  // Local state
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>('');
  const [paymentBreakdown, setPaymentBreakdown] = useState<any>(null);

  // Don't render if not focused to prevent background rendering errors
  if (!isFocused) {
    return null;
  }

  useEffect(() => {
    // Load payment methods
    dispatch(fetchPaymentMethods());

    // Calculate payment breakdown
    // Requirements: 1.2, 10.1, 10.2
    const breakdown = paymentService.calculatePayment(workingHours, hourlyRate);
    setPaymentBreakdown(breakdown);
  }, [dispatch, workingHours, hourlyRate]);

  useEffect(() => {
    // Set default payment method when methods are loaded
    if (paymentMethods.length > 0 && !selectedPaymentMethodId) {
      const defaultMethod = paymentMethods.find((method) => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      } else {
        setSelectedPaymentMethodId(paymentMethods[0].id);
      }
    }
  }, [paymentMethods, selectedPaymentMethodId]);

  /**
   * Handle payment confirmation
   * Requirements: 9.3, 9.4, 9.5
   */
  const handleConfirmPayment = async () => {
    if (!selectedPaymentMethodId) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    if (!stripe) {
      Alert.alert('Error', 'Payment system not initialized');
      return;
    }

    try {
      // Step 1: Create payment intent
      // Requirements: 1.3, 1.4
      const intentResult = await dispatch(
        createPaymentIntent({
          bookingId,
          workingHours,
          hourlyRate,
        })
      ).unwrap();

      // Step 2: Confirm payment with Stripe SDK
      // Requirements: 9.4
      const { error: stripeError } = await stripe.confirmPayment(
        intentResult.clientSecret,
        {
          paymentMethodType: 'Card',
          paymentMethodData: {
            paymentMethodId: selectedPaymentMethodId,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Step 3: Confirm payment on backend
      // Requirements: 1.5
      const payment = await dispatch(
        confirmPayment({
          paymentIntentId: intentResult.paymentIntentId,
          bookingId,
        })
      ).unwrap();

      // Navigate to confirmation screen
      // Requirements: 9.4
      navigation.navigate('PaymentConfirmation', {
        paymentId: payment.id,
        amount: payment.amount,
        jobTitle,
        workerName,
      });
    } catch (err: any) {
      // Requirements: 9.5
      console.error('Payment error:', err);
      Alert.alert(
        'Payment Failed',
        err.message ||
          'An error occurred while processing your payment. Please try again.',
        [
          {
            text: 'Retry',
            onPress: handleConfirmPayment,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  /**
   * Render payment method selection item
   * Requirements: 9.2
   */
  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedPaymentMethodId === method.id;

    return (
      <TouchableOpacity
        key={method.id}
        style={[
          styles.paymentMethodCard,
          isSelected && styles.paymentMethodSelected,
        ]}
        onPress={() => setSelectedPaymentMethodId(method.id)}
        activeOpacity={0.7}
      >
        <View style={styles.paymentMethodInfo}>
          <View style={styles.paymentMethodHeader}>
            <Ionicons
              name={method.type === 'card' ? 'card-outline' : 'wallet-outline'}
              size={24}
              color={isSelected ? Colors.primary[600] : Colors.neutral[600]}
            />
            <Text
              style={[
                styles.paymentMethodType,
                isSelected && styles.paymentMethodTypeSelected,
              ]}
            >
              {method.type === 'card'
                ? method.brand || 'Credit Card'
                : 'Payment Method'}
            </Text>
          </View>
          <Text style={styles.paymentMethodDetails}>
            {method.type === 'card' &&
              method.last4 &&
              `•••• •••• •••• ${method.last4}`}
            {method.type === 'card' && !method.last4 && 'Card on file'}
            {method.type === 'paypal' && method.email}
            {method.type === 'bank_account' &&
              method.bankName &&
              method.last4 &&
              `${method.bankName} ••••${method.last4}`}
            {method.type === 'bank_account' &&
              (!method.bankName || !method.last4) &&
              'Bank account on file'}
          </Text>
          {method.expiryMonth && method.expiryYear && (
            <Text style={styles.paymentMethodExpiry}>
              Expires {method.expiryMonth.toString().padStart(2, '0')}/
              {method.expiryYear}
            </Text>
          )}
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        <View
          style={[styles.radioButton, isSelected && styles.radioButtonSelected]}
        >
          {isSelected && <View style={styles.radioButtonInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoadingPaymentMethods || !paymentBreakdown) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={Gradients.primaryOrange}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Payment</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={Gradients.primaryOrange}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Job Details Section */}
        {/* Requirements: 1.2, 9.1, 10.1, 10.2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.card}>
            <View style={styles.jobHeader}>
              <Ionicons
                name="briefcase-outline"
                size={24}
                color={Colors.primary[600]}
              />
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle}>{jobTitle}</Text>
                <Text style={styles.workerName}>Worker: {workerName}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.jobDetailsRow}>
              <View style={styles.jobDetailItem}>
                <Text style={styles.jobDetailLabel}>Working Hours</Text>
                <Text style={styles.jobDetailValue}>{workingHours} hrs</Text>
              </View>
              <View style={styles.jobDetailItem}>
                <Text style={styles.jobDetailLabel}>Hourly Rate</Text>
                <Text style={styles.jobDetailValue}>
                  ${hourlyRate.toFixed(2)}/hr
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Breakdown Section */}
        {/* Requirements: 10.3, 10.4, 10.5 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>
          <View style={styles.card}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Subtotal ({workingHours} hrs × ${hourlyRate.toFixed(2)})
              </Text>
              <Text style={styles.breakdownValue}>
                ${paymentBreakdown.subtotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Platform Fee ({paymentBreakdown.platformFeePercentage}%)
              </Text>
              <Text style={styles.breakdownValue}>
                ${paymentBreakdown.platformFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                ${paymentBreakdown.total.toFixed(2)}
              </Text>
            </View>
            <Text style={styles.currencyNote}>
              {paymentBreakdown.currency.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        {/* Requirements: 9.2 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddPaymentMethod')}
            >
              <Text style={styles.addMethodLink}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.emptyState}>
                <Ionicons
                  name="card-outline"
                  size={48}
                  color={Colors.neutral[400]}
                />
                <Text style={styles.emptyStateText}>
                  No payment methods available
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Add a payment method to continue
                </Text>
                <Button
                  title="Add Payment Method"
                  onPress={() => navigation.navigate('AddPaymentMethod')}
                  style={styles.addMethodButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.paymentMethodsList}>
              {paymentMethods.filter((m) => m && m.id).map(renderPaymentMethod)}
            </View>
          )}
        </View>

        {/* Escrow Notice */}
        <View style={styles.noticeCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color={Colors.primary[600]}
          />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Secure Payment</Text>
            <Text style={styles.noticeText}>
              Your payment will be held securely in escrow until the job is
              completed and approved.
            </Text>
          </View>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm Payment Button */}
      {/* Requirements: 9.3 */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Button
          title={
            isProcessingPayment
              ? 'Processing...'
              : `Pay $${paymentBreakdown?.total.toFixed(2)}`
          }
          onPress={handleConfirmPayment}
          disabled={
            isProcessingPayment ||
            paymentMethods.length === 0 ||
            !selectedPaymentMethodId
          }
          style={styles.confirmButton}
        />
        {isProcessingPayment && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color={Colors.primary[600]} />
            <Text style={styles.processingText}>
              Processing your payment...
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  headerGradient: {
    paddingBottom: Spacing[4],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
  backButton: {
    marginRight: Spacing[3],
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[3],
  },
  addMethodLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.primary[600],
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  jobInfo: {
    marginLeft: Spacing[3],
    flex: 1,
  },
  jobTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  workerName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral[200],
    marginVertical: Spacing[3],
  },
  jobDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jobDetailItem: {
    flex: 1,
  },
  jobDetailLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
    marginBottom: Spacing[1],
  },
  jobDetailValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  breakdownLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[700],
  },
  breakdownValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500' as const,
    color: Colors.neutral[900],
  },
  totalLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700' as const,
    color: Colors.neutral[900],
  },
  totalValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: Colors.primary[600],
  },
  currencyNote: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
    textAlign: 'right',
    marginTop: Spacing[1],
  },
  paymentMethodsList: {
    gap: Spacing[3],
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  paymentMethodSelected: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  paymentMethodType: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginLeft: Spacing[2],
  },
  paymentMethodTypeSelected: {
    color: Colors.primary[700],
  },
  paymentMethodDetails: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[1],
  },
  paymentMethodExpiry: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
  },
  defaultBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.success[500],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  defaultText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing[3],
  },
  radioButtonSelected: {
    borderColor: Colors.primary[600],
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[600],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing[5],
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[700],
    marginTop: Spacing[3],
    marginBottom: Spacing[1],
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[500],
    marginBottom: Spacing[4],
  },
  addMethodButton: {
    minWidth: 200,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginTop: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  noticeContent: {
    flex: 1,
    marginLeft: Spacing[3],
  },
  noticeTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.primary[900],
    marginBottom: Spacing[1],
  },
  noticeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary[700],
    lineHeight: 18,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: '#DC2626',
    marginLeft: Spacing[3],
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
  },
  confirmButton: {
    width: '100%',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[3],
  },
  processingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginLeft: Spacing[2],
  },
});

export default PaymentScreen;
