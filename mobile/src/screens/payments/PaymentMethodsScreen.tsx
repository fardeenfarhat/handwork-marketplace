import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { StackNavigationProp } from '@/types/navigation';
import { PaymentStackParamList, PaymentMethod } from '@/types';
import { Button, LoadingSpinner } from '@/components/common';
import {
  Gradients,
  Colors,
  Spacing,
  BorderRadius,
  Typography,
} from '@/styles/DesignSystem';
import { RootState, AppDispatch } from '@/store';
import {
  fetchPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod as deletePaymentMethodAction,
} from '@/store/slices/paymentSlice';

type NavigationProp = StackNavigationProp<
  PaymentStackParamList,
  'PaymentMethods'
>;

const PaymentMethodsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const isFocused = useIsFocused();

  const { paymentMethods, isLoadingPaymentMethods } = useSelector(
    (state: RootState) => state.payment
  );

  useEffect(() => {
    if (isFocused) {
      loadPaymentMethods();
    }
  }, [isFocused]);

  const loadPaymentMethods = () => {
    dispatch(fetchPaymentMethods());
  };

  const handleRefresh = () => {
    loadPaymentMethods();
  };

  const handleDeletePaymentMethod = (paymentMethod: PaymentMethod) => {
    Alert.alert(
      'Delete Payment Method',
      `Are you sure you want to delete this ${getPaymentMethodLabel(
        paymentMethod.type
      )}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeletePaymentMethod(paymentMethod.id),
        },
      ]
    );
  };

  const confirmDeletePaymentMethod = async (paymentMethodId: string) => {
    try {
      await dispatch(deletePaymentMethodAction(paymentMethodId)).unwrap();
      Alert.alert('Success', 'Payment method deleted successfully');
    } catch (error) {
      console.error('Error deleting payment method:', error);
      Alert.alert('Error', 'Failed to delete payment method');
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      await dispatch(setDefaultPaymentMethod(paymentMethodId)).unwrap();
      Alert.alert('Success', 'Default payment method updated');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', 'Failed to update default payment method');
    }
  };

  const getPaymentMethodLabel = (type: string): string => {
    switch (type) {
      case 'card':
        return 'Credit Card';
      case 'paypal':
        return 'PayPal';
      case 'bank_account':
        return 'Bank Account';
      default:
        return 'Payment Method';
    }
  };

  const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => {
    // Safety check: don't render if item is invalid
    if (!item || !item.id || !item.type) {
      console.error(
        '🚨 PAYMENT METHODS SCREEN: Attempted to render invalid payment method:',
        JSON.stringify(item)
      );
      console.error('🚨 This is causing the last4 error!');
      return null;
    }

    console.log('✅ Rendering valid payment method:', item.id, item.type);

    return (
      <View style={styles.paymentMethodCard}>
        <LinearGradient
          colors={['#1e293b', '#334155', '#475569']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.creditCardGradient}
        >
          {/* Decorative Pattern */}
          <View style={styles.cardPattern} />
          <View style={styles.cardPattern2} />
          <View style={styles.cardAccentLine} />
          
          <View style={styles.cardContent}>
            {/* Top Row: Card Type and Default Badge */}
            <View style={styles.cardTopRow}>
              <View style={styles.cardChip}>
                <Ionicons name="card" size={28} color="rgba(255, 255, 255, 0.9)" />
              </View>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </View>

            {/* Card Number */}
            <Text style={styles.cardNumber}>
              {item.type === 'card' && item.last4 ? `•••• •••• •••• ${item.last4}` : 'Card on file'}
            </Text>

            {/* Bottom Row: Expiry and Brand */}
            <View style={styles.cardBottomRow}>
              <View style={styles.cardExpiryContainer}>
                {item.type === 'card' && item.expiryMonth && item.expiryYear && (
                  <>
                    <Text style={styles.cardLabel}>EXPIRES</Text>
                    <Text style={styles.cardExpiry}>
                      {item.expiryMonth.toString().padStart(2, '0')}/{item.expiryYear.toString().slice(-2)}
                    </Text>
                  </>
                )}
              </View>
              {item.type === 'card' && item.brand && (
                <View style={styles.cardBrandContainer}>
                  <Text style={styles.cardBrand}>{item.brand.toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>

        </LinearGradient>
        
        {/* Action Buttons Section */}
        <View style={styles.cardActionsContainer}>
          <View style={styles.paymentMethodActions}>
            {!item.isDefault && (
              <TouchableOpacity
                style={styles.setDefaultButton}
                onPress={() => handleSetDefault(item.id)}
              >
                <Ionicons name="star" size={18} color="#FF6B35" />
                <Text style={styles.setDefaultText}>Set as Default</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePaymentMethod(item)}
            >
              <Ionicons name="trash" size={18} color="#EF4444" />
              <Text style={styles.deleteText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Don't render anything if screen is not focused
  if (!isFocused) {
    return null;
  }

  if (isLoadingPaymentMethods) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <LinearGradient
          colors={Gradients.orangeBlue}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Decorative Circles */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />

          <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.iconContainer}>
                  <Ionicons name="card-outline" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>Payment Methods</Text>
                  <Text style={styles.headerSubtitle}>
                    Manage your payment options
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.loadingContainer}>
              <LoadingSpinner />
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={Gradients.orangeBlue}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative Circles */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Payment Methods</Text>
                <Text style={styles.headerSubtitle}>
                  Manage your payment options
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.contentArea}>
          {paymentMethods.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <View style={styles.iconGradient}>
                  <Ionicons
                    name="wallet-outline"
                    size={56}
                    color="#FFFFFF"
                  />
                </View>
              </View>
              <Text style={styles.emptyText}>No payment methods yet</Text>
              <Text style={styles.emptySubtext}>
                Add a payment method to make payments easier and faster
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddPaymentMethod')}
                activeOpacity={0.8}
                style={styles.emptyButtonWrapper}
              >
                <LinearGradient
                  colors={['#FF6B35', '#FF8C5A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.gradientButtonText}>Add Payment Method</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={
                Array.isArray(paymentMethods)
                  ? paymentMethods.filter((item) => item && item.id && item.type)
                  : []
              }
              renderItem={renderPaymentMethod}
              keyExtractor={(item) => item?.id || Math.random().toString()}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={isLoadingPaymentMethods}
                  onRefresh={handleRefresh}
                  tintColor={Colors.primaryOrange}
                />
              }
            />

          )}

        <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddPaymentMethod')}
            activeOpacity={0.8}
            style={styles.gradientButtonWrapper}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF8C5A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
              <Text style={styles.gradientButtonText}>Add Payment Method</Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[900],
  },
  gradient: {
    minHeight: 180,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: 100,
    left: -50,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    top: '40%',
    right: -30,
  },
  safeArea: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[1],
    paddingBottom: Spacing[2],
  },
  contentArea: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    marginTop: -24,
    paddingTop: Spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: Spacing[4],
    paddingBottom: Spacing[20],
  },
  paymentMethodCard: {
    borderRadius: BorderRadius['3xl'],
    marginBottom: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  creditCardGradient: {
    padding: Spacing[5],
    minHeight: 200,
    position: 'relative',
  },
  cardPattern: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -50,
    right: -50,
  },
  cardPattern2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    bottom: -30,
    left: -30,
  },
  cardAccentLine: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: 4,
    backgroundColor: '#FF6B35',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing[4],
  },
  cardChip: {
    width: 50,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  cardNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: Spacing[4],
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardExpiryContainer: {
    gap: Spacing[1],
  },
  cardLabel: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  cardExpiry: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  cardBrandContainer: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  cardBrand: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
    gap: 3,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  defaultText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  cardActionsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
  },
  paymentMethodActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  setDefaultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: '#FF6B35',
    gap: 6,
  },
  setDefaultText: {
    color: '#FF6B35',
    fontSize: Typography.fontSize.sm,
    fontWeight: '700' as const,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    gap: 6,
  },
  deleteText: {
    color: '#EF4444',
    fontSize: Typography.fontSize.sm,
    fontWeight: '700' as const,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[6],
  },
  emptyIconContainer: {
    marginBottom: Spacing[6],
  },
  emptyText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing[8],
    paddingHorizontal: Spacing[4],
  },
  emptyButtonWrapper: {
    minWidth: 240,
  },
  gradientButtonWrapper: {
    width: '100%',
    borderRadius: BorderRadius['2xl'],
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[6],
    borderRadius: BorderRadius['2xl'],
    gap: Spacing[2],
  },
  gradientButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default PaymentMethodsScreen;
