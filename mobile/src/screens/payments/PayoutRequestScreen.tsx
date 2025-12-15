import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { PaymentStackNavigationProp } from '@/types';
import { Button, LoadingSpinner } from '@/components/common';
import { Gradients, Colors, Spacing, BorderRadius, Typography } from '@/styles/DesignSystem';
import { RootState, AppDispatch } from '@/store';
import { requestPayout } from '@/store/slices/paymentSlice';

/**
 * PayoutRequestScreen - Worker payout request screen
 * Requirements: 5.1, 5.2
 */
const PayoutRequestScreen: React.FC = () => {
  const navigation = useNavigation<PaymentStackNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  // Requirements: 5.1
  const { earnings, isLoading } = useSelector((state: RootState) => state.payment);

  // Local state
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableBalance = earnings?.availableBalance || 0;

  /**
   * Format currency value
   */
  const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };

  /**
   * Validate amount input
   * Requirements: 5.1
   */
  const validateAmount = (value: string): boolean => {
    setAmountError('');

    // Check if empty
    if (!value || value.trim() === '') {
      setAmountError('Please enter an amount');
      return false;
    }

    // Parse amount
    const numericAmount = parseFloat(value);

    // Check if valid number
    if (isNaN(numericAmount)) {
      setAmountError('Please enter a valid amount');
      return false;
    }

    // Check if positive
    if (numericAmount <= 0) {
      setAmountError('Amount must be greater than zero');
      return false;
    }

    // Check if exceeds available balance
    // Requirements: 5.1
    if (numericAmount > availableBalance) {
      setAmountError(`Amount cannot exceed available balance (${formatCurrency(availableBalance)})`);
      return false;
    }

    return true;
  };

  /**
   * Handle amount input change
   */
  const handleAmountChange = (text: string) => {
    // Allow only numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }

    setAmount(cleaned);
    
    // Clear error when user starts typing
    if (amountError) {
      setAmountError('');
    }
  };

  /**
   * Set amount to maximum available balance
   */
  const handleMaxAmount = () => {
    setAmount(availableBalance.toFixed(2));
    setAmountError('');
  };

  /**
   * Handle payout submission
   * Requirements: 5.1, 5.2
   */
  const handleSubmit = async () => {
    // Validate amount
    if (!validateAmount(amount)) {
      return;
    }

    const numericAmount = parseFloat(amount);

    // Show confirmation dialog
    Alert.alert(
      'Confirm Payout Request',
      `Request payout of ${formatCurrency(numericAmount)}?\n\nFunds will be transferred to your bank account within 2-5 business days.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsSubmitting(true);

              // Call requestPayout API
              // Requirements: 5.1, 5.2
              await dispatch(requestPayout(numericAmount)).unwrap();

              // Show success message
              // Requirements: 5.2
              Alert.alert(
                'Payout Requested',
                `Your payout request of ${formatCurrency(numericAmount)} has been submitted successfully. You will receive the funds in your bank account within 2-5 business days.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate back to earnings screen
                      // Requirements: 5.2
                      navigation.goBack();
                    },
                  },
                ]
              );
            } catch (error: any) {
              // Handle errors
              // Requirements: 5.2
              const errorMessage = error?.message || 'Failed to request payout. Please try again.';
              
              Alert.alert(
                'Payout Request Failed',
                errorMessage,
                [{ text: 'OK' }]
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading && !earnings) {
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
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Request Payout</Text>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Request Payout</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Available Balance Card */}
        {/* Requirements: 5.1 */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="wallet" size={28} color={Colors.success[600]} />
            </View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>{formatCurrency(availableBalance)}</Text>
          <Text style={styles.balanceNote}>
            This is the amount you can withdraw to your bank account
          </Text>
        </View>

        {/* Payout Request Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Payout Amount</Text>

          {/* Amount Input */}
          {/* Requirements: 5.1 */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[styles.input, amountError ? styles.inputError : null]}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="decimal-pad"
                editable={!isSubmitting}
                maxLength={10}
              />
              <TouchableOpacity
                style={styles.maxButton}
                onPress={handleMaxAmount}
                disabled={isSubmitting}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>
            {amountError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger[500]} />
                <Text style={styles.errorText}>{amountError}</Text>
              </View>
            ) : null}
          </View>

          {/* Payout Method Info */}
          {/* Requirements: 5.1 */}
          <View style={styles.payoutMethodCard}>
            <View style={styles.payoutMethodHeader}>
              <Ionicons name="business" size={24} color={Colors.primary[600]} />
              <Text style={styles.payoutMethodTitle}>Payout Method</Text>
            </View>
            <View style={styles.payoutMethodInfo}>
              <View style={styles.payoutMethodRow}>
                <Text style={styles.payoutMethodLabel}>Method:</Text>
                <Text style={styles.payoutMethodValue}>Bank Account</Text>
              </View>
              <View style={styles.payoutMethodRow}>
                <Text style={styles.payoutMethodLabel}>Processing Time:</Text>
                <Text style={styles.payoutMethodValue}>2-5 business days</Text>
              </View>
            </View>
            <View style={styles.payoutMethodNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.neutral[600]} />
              <Text style={styles.payoutMethodNoteText}>
                Funds will be transferred to your connected bank account
              </Text>
            </View>
          </View>

          {/* Important Notes */}
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>Important Information</Text>
            <View style={styles.noteItem}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success[500]} />
              <Text style={styles.noteText}>
                Minimum payout amount is $10.00
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success[500]} />
              <Text style={styles.noteText}>
                No fees for standard payouts
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success[500]} />
              <Text style={styles.noteText}>
                You'll receive an email confirmation once processed
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Button
          title={isSubmitting ? 'Processing...' : 'Request Payout'}
          onPress={handleSubmit}
          disabled={isSubmitting || !amount || availableBalance === 0}
          loading={isSubmitting}
          style={styles.submitButton}
          icon={
            !isSubmitting ? (
              <Ionicons name="cash-outline" size={20} color="#FFFFFF" />
            ) : undefined
          }
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingBottom: Spacing[6],
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing[4],
    marginTop: Spacing[5],
    padding: Spacing[5],
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: Colors.success[50],
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  balanceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.success[500]}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  balanceLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
  },
  balanceAmount: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: '700' as const,
    color: Colors.success[600],
    marginBottom: Spacing[2],
  },
  balanceNote: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  formSection: {
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[5],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[4],
  },
  inputContainer: {
    marginBottom: Spacing[5],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    paddingHorizontal: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currencySymbol: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '600' as const,
    color: Colors.neutral[700],
    marginRight: Spacing[2],
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    paddingVertical: Spacing[4],
  },
  inputError: {
    color: Colors.danger[600],
  },
  maxButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
  },
  maxButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[2],
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.danger[500],
    marginLeft: Spacing[1],
    flex: 1,
  },
  payoutMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  payoutMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  payoutMethodTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginLeft: Spacing[2],
  },
  payoutMethodInfo: {
    marginBottom: Spacing[3],
  },
  payoutMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  payoutMethodLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  payoutMethodValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
  },
  payoutMethodNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.neutral[50],
    padding: Spacing[3],
    borderRadius: BorderRadius.md,
  },
  payoutMethodNoteText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
    marginLeft: Spacing[2],
    flex: 1,
    lineHeight: 18,
  },
  notesCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  notesTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[3],
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing[2],
  },
  noteText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[700],
    marginLeft: Spacing[2],
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    width: '100%',
  },
});

export default PayoutRequestScreen;
