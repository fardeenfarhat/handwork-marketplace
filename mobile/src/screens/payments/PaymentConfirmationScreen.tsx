import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';

import { PaymentStackParamList } from '@/types';
import { Button } from '@/components/common';
import { Colors, Spacing, BorderRadius, Typography } from '@/styles/DesignSystem';
import { StackNavigationProp } from '@/types/navigation';

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'PaymentConfirmation'>;
type RouteProps = RouteProp<PaymentStackParamList, 'PaymentConfirmation'>;

/**
 * PaymentConfirmationScreen - Display payment success confirmation
 * Requirements: 9.4
 */
const PaymentConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const { paymentId, amount, jobTitle, workerName } = route.params;

  const handleViewJobDetails = () => {
    // Navigate to job tracking screen
    // Requirements: 9.4
    navigation.navigate('JobTracking', { bookingId: paymentId });
  };

  const handleBackToDashboard = () => {
    // Navigate back to main dashboard tab
    // Requirements: 9.4
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Dashboard');
    } else {
      // Fallback: go back to previous screen
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#22C55E', '#16A34A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Payment Successful!</Text>
            <Text style={styles.headerSubtitle}>
              Your payment has been processed securely
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Transaction Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Job</Text>
              <Text style={styles.detailValue}>{jobTitle}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Worker</Text>
              <Text style={styles.detailValue}>{workerName}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount Paid</Text>
              <Text style={styles.amountValue}>${amount.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment ID</Text>
              <Text style={styles.detailValue}>#{paymentId}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Held in Escrow</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Escrow Information */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary[600]} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Payment Held Securely</Text>
            <Text style={styles.infoText}>
              Your payment is being held in escrow and will be released to the worker once you
              confirm the job is completed satisfactorily. This protects both you and the worker.
            </Text>
          </View>
        </View>

        {/* What's Next */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's Next?</Text>
          <View style={styles.card}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Worker Starts Job</Text>
                <Text style={styles.stepDescription}>
                  The worker will begin working on your job according to the agreed schedule.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Track Progress</Text>
                <Text style={styles.stepDescription}>
                  Monitor the job progress and communicate with the worker through the app.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Release Payment</Text>
                <Text style={styles.stepDescription}>
                  Once satisfied with the work, release the payment to the worker.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Button
          title="View Job Details"
          onPress={handleViewJobDetails}
          style={styles.primaryButton}
        />
        <TouchableOpacity onPress={handleBackToDashboard} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
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
    paddingBottom: Spacing[6],
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
  },
  successIconContainer: {
    marginBottom: Spacing[4],
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: Spacing[2],
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[3],
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  detailLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500' as const,
    color: Colors.neutral[900],
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing[3],
  },
  amountValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: Colors.success[600],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral[200],
  },
  statusBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginTop: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing[3],
  },
  infoTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.primary[900],
    marginBottom: Spacing[1],
  },
  infoText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary[700],
    lineHeight: 18,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: Spacing[4],
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  stepNumberText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  stepDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
  },
  primaryButton: {
    width: '100%',
    marginBottom: Spacing[3],
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: Spacing[3],
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.primary[600],
  },
});

export default PaymentConfirmationScreen;
