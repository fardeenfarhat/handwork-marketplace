import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { PaymentStackNavigationProp, PaymentHistory } from '@/types';
import { Button, LoadingSpinner } from '@/components/common';
import { Gradients, Colors, Spacing, BorderRadius, Typography } from '@/styles/DesignSystem';
import { RootState, AppDispatch } from '@/store';
import { fetchEarnings } from '@/store/slices/paymentSlice';
import { paymentService } from '@/services/paymentService';

const EarningsScreen: React.FC = () => {
  const navigation = useNavigation<PaymentStackNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  // Requirements: 4.1, 4.2, 4.3, 4.4
  const { earnings, isLoadingEarnings, error } = useSelector(
    (state: RootState) => state.payment
  );

  // Local state for transaction history
  // Requirements: 4.5
  const [transactions, setTransactions] = useState<PaymentHistory[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Load earnings and transaction data
   */
  const loadData = async () => {
    try {
      // Fetch earnings summary
      await dispatch(fetchEarnings()).unwrap();
      
      // Fetch transaction history
      await loadTransactions();
    } catch (err) {
      console.error('Error loading earnings data:', err);
    }
  };

  /**
   * Load transaction history
   * Requirements: 4.5
   */
  const loadTransactions = async () => {
    try {
      setIsLoadingTransactions(true);
      const history = await paymentService.getTransactionHistory();
      
      // Sort by date descending
      const sortedHistory = history.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setTransactions(sortedHistory);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  /**
   * Handle pull-to-refresh
   * Requirements: 4.5
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /**
   * Navigate to payout request screen
   * Requirements: 5.1
   */
  const handleRequestPayout = () => {
    navigation.navigate('PayoutRequest');
  };

  /**
   * Format currency value
   */
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
      case 'released':
        return Colors.success[500];
      case 'pending':
      case 'held':
        return Colors.warning[500];
      case 'failed':
      case 'refunded':
        return Colors.danger[500];
      default:
        return Colors.neutral[500];
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed':
      case 'released':
        return 'checkmark-circle';
      case 'pending':
      case 'held':
        return 'time';
      case 'failed':
      case 'refunded':
        return 'close-circle';
      default:
        return 'ellipse';
    }
  };

  /**
   * Render earnings summary card
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  const renderEarningsCard = (
    title: string,
    amount: number,
    icon: string,
    color: string,
    isProminent: boolean = false
  ) => {
    return (
      <View
        style={[
          styles.earningsCard,
          isProminent && styles.prominentCard,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon as any} size={24} color={color} />
          </View>
          <Text style={[styles.cardTitle, isProminent && styles.prominentTitle]}>
            {title}
          </Text>
        </View>
        <Text style={[styles.cardAmount, isProminent && styles.prominentAmount]}>
          {formatCurrency(amount)}
        </Text>
      </View>
    );
  };

  /**
   * Render transaction item
   * Requirements: 4.5
   */
  const renderTransactionItem = (transaction: PaymentHistory) => {
    const statusColor = getStatusColor(transaction.status);
    const statusIcon = getStatusIcon(transaction.status);

    return (
      <View key={transaction.id} style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View style={[styles.transactionIcon, { backgroundColor: `${statusColor}20` }]}>
            <Ionicons name={statusIcon as any} size={20} color={statusColor} />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>{transaction.description}</Text>
            {transaction.jobTitle && (
              <Text style={styles.transactionJob}>{transaction.jobTitle}</Text>
            )}
            <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              transaction.type === 'payment' || transaction.type === 'payout'
                ? styles.positiveAmount
                : styles.negativeAmount,
            ]}
          >
            {transaction.type === 'payment' || transaction.type === 'payout' ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {transaction.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoadingEarnings && !earnings) {
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
              <Text style={styles.headerTitle}>Earnings</Text>
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Earnings</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Earnings Summary Cards */}
        {/* Requirements: 4.1, 4.2, 4.3, 4.4 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          
          {/* Available Balance - Prominent */}
          {/* Requirements: 4.2 */}
          {renderEarningsCard(
            'Available Balance',
            earnings?.availableBalance || 0,
            'wallet',
            Colors.success[500],
            true
          )}

          {/* Other Summary Cards */}
          <View style={styles.cardsRow}>
            {/* Total Earned */}
            {/* Requirements: 4.1 */}
            {renderEarningsCard(
              'Total Earned',
              earnings?.totalEarned || 0,
              'trending-up',
              Colors.primary[600]
            )}

            {/* Pending Balance */}
            {/* Requirements: 4.3 */}
            {renderEarningsCard(
              'Pending',
              earnings?.pendingBalance || 0,
              'time',
              Colors.warning[500]
            )}
          </View>

          <View style={styles.cardsRow}>
            {/* Total Withdrawn */}
            {/* Requirements: 4.4 */}
            {renderEarningsCard(
              'Withdrawn',
              earnings?.totalWithdrawn || 0,
              'arrow-down-circle',
              Colors.secondary[500]
            )}

            {/* Platform Fees Paid */}
            {/* Requirements: 4.4 */}
            {renderEarningsCard(
              'Platform Fees',
              earnings?.platformFeesPaid || 0,
              'receipt',
              Colors.neutral[500]
            )}
          </View>
        </View>

        {/* Request Payout Button */}
        {/* Requirements: 5.1 */}
        <View style={styles.section}>
          <Button
            title="Request Payout"
            onPress={handleRequestPayout}
            disabled={(earnings?.availableBalance || 0) === 0}
            style={styles.payoutButton}
            icon={<Ionicons name="cash-outline" size={20} color="#FFFFFF" />}
          />
          {(earnings?.availableBalance || 0) === 0 && (
            <Text style={styles.disabledText}>
              No available balance to withdraw
            </Text>
          )}
        </View>

        {/* Transaction History */}
        {/* Requirements: 4.5 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          
          {isLoadingTransactions ? (
            <View style={styles.transactionsLoading}>
              <ActivityIndicator size="small" color={Colors.primary[600]} />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={Colors.neutral[300]} />
              <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyStateText}>
                Your payment transactions will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map(renderTransactionItem)}
            </View>
          )}
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={24} color={Colors.danger[500]} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
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
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[4],
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  prominentCard: {
    padding: Spacing[5],
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: Colors.success[50],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  cardTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500' as const,
    color: Colors.neutral[600],
  },
  prominentTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
  },
  cardAmount: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: Colors.neutral[900],
  },
  prominentAmount: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.success[600],
  },
  cardsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  payoutButton: {
    width: '100%',
  },
  disabledText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: Spacing[2],
  },
  transactionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[8],
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginLeft: Spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing[10],
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing[4],
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.neutral[700],
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
  },
  emptyStateText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  transactionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing[2],
    marginBottom: Spacing[4],
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  transactionJob: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
    marginBottom: Spacing[1],
  },
  transactionDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing[3],
  },
  transactionAmount: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700' as const,
    marginBottom: Spacing[1],
  },
  positiveAmount: {
    color: Colors.success[600],
  },
  negativeAmount: {
    color: Colors.danger[600],
  },
  statusBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    marginBottom: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.danger[500],
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.danger[600],
    marginLeft: Spacing[3],
  },
});

export default EarningsScreen;
