import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { useDispatch } from 'react-redux';
import { StackNavigationProp } from '@/types/navigation';
import { PaymentStackParamList } from '@/types';
import { Button, LoadingSpinner } from '@/components/common';
import { Gradients, Colors, Spacing, BorderRadius, Typography } from '@/styles/DesignSystem';
import { AppDispatch } from '@/store';
import { addPaymentMethod } from '@/store/slices/paymentSlice';
import ErrorBoundary from '@/components/ErrorBoundary';

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'AddPaymentMethod'>;

/**
 * AddPaymentMethodScreen - Screen for adding new payment methods using Stripe
 * Requirements: 2.1, 2.2
 */
const AddPaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { createPaymentMethod } = useStripe();
  
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  // Debug: Check if Stripe is initialized
  React.useEffect(() => {
    console.log('💳 AddPaymentMethodScreen mounted');
    console.log('💳 createPaymentMethod available:', !!createPaymentMethod);
  }, [createPaymentMethod]);

  /**
   * Handle card input changes and validation
   * Requirements: 2.1
   */
  const handleCardChange = (cardDetails: any) => {
    try {
      console.log('💳 Card details changed:', {
        complete: cardDetails.complete,
        validNumber: cardDetails.validNumber,
        validExpiryDate: cardDetails.validExpiryDate,
        validCVC: cardDetails.validCVC,
      });
      setCardComplete(cardDetails.complete);
    } catch (error) {
      console.error('❌ Error in handleCardChange:', error);
    }
  };

  /**
   * Handle adding payment method
   * Creates payment method token using Stripe SDK and saves to backend
   * Requirements: 2.1, 2.2
   */
  const handleAddPaymentMethod = async () => {
    // Validate card is complete
    if (!cardComplete) {
      Alert.alert('Invalid Card', 'Please enter complete card details');
      return;
    }

    setLoading(true);
    try {
      // Create payment method token using Stripe SDK
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Stripe error:', error);
        Alert.alert(
          'Card Error',
          error.message || 'Failed to process card details'
        );
        return;
      }

      if (!paymentMethod) {
        Alert.alert('Error', 'Failed to create payment method');
        return;
      }

      // Save payment method to backend
      console.log('💳 Saving payment method to backend:', paymentMethod.id);
      const result = await dispatch(addPaymentMethod(paymentMethod.id)).unwrap();
      console.log('💳 Payment method saved successfully:', result);

      // Show success message and navigate back
      Alert.alert(
        'Success',
        'Payment method added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('❌ Error adding payment method:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Error',
        error.message || 'Failed to add payment method. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <LinearGradient
          colors={Gradients.orangeBlue}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}>
          
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
                  <Text style={styles.headerTitle}>Add Payment Method</Text>
                  <Text style={styles.headerSubtitle}>Securely add your card</Text>
                </View>
              </View>
            </View>
            
          </SafeAreaView>
        </LinearGradient>
          
        <View style={styles.contentArea}>
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        </View>
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
        style={styles.gradient}>
        
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
                <Text style={styles.headerTitle}>Add Payment Method</Text>
                <Text style={styles.headerSubtitle}>Securely add your card</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.contentArea}>
        <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.success[500]} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Secure Payment</Text>
              <Text style={styles.infoText}>
                Your card details are encrypted and securely processed by Stripe. 
                We never store your full card number.
              </Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Card Information</Text>
            <Text style={styles.sectionSubtitle}>
              Enter your card details below
            </Text>
            
            <View style={styles.cardFieldWrapper}>
              <LinearGradient
                colors={['#FF6B35', '#4A90E2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardFieldGradient}
              >
                <View style={styles.cardFieldContainer}>
                  <CardField
                    postalCodeEnabled={false}
                    placeholders={{
                      number: '4242 4242 4242 4242',
                    }}
                    cardStyle={styles.cardFieldStyle}
                    style={styles.cardField}
                    onCardChange={handleCardChange}
                  />
                </View>
              </LinearGradient>
            </View>

            {!cardComplete && (
              <View style={styles.helperTextContainer}>
                <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.helperText}>
                  Use test card: 4242 4242 4242 4242
                </Text>
              </View>
            )}
          </View>

            <View style={styles.testCardsSection}>
              <View style={styles.testCardsAccent} />
              <View style={styles.testCardsContent}>
                <TouchableOpacity 
                  style={styles.testCardsHeader}
                  onPress={() => {}}
                >
                  <Ionicons name="help-circle-outline" size={20} color={Colors.primaryOrange} />
                  <Text style={styles.testCardsTitle}>Test Cards</Text>
                </TouchableOpacity>
                <Text style={styles.testCardsText}>
                  • 4242 4242 4242 4242 - Success{'\n'}
                  • 4000 0000 0000 0002 - Declined{'\n'}
                  • Use any future expiry date and any 3-digit CVC
                </Text>
              </View>
            </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
          <TouchableOpacity
            onPress={handleAddPaymentMethod}
            disabled={!cardComplete || loading}
            activeOpacity={0.8}
            style={[styles.gradientButtonWrapper, (!cardComplete || loading) && styles.disabledButton]}
          >
            <LinearGradient
              colors={(!cardComplete || loading) ? ['#9CA3AF', '#6B7280'] : ['#FF6B35', '#FF8C5A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons name="card-outline" size={22} color="#FFFFFF" />
              <Text style={styles.gradientButtonText}>{loading ? 'Processing...' : 'Add Card'}</Text>
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
  loadingText: {
    marginTop: Spacing[4],
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[700],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing[5],
    paddingBottom: Spacing[20],
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[4],
    marginBottom: Spacing[6],
    borderLeftWidth: 4,
    borderLeftColor: Colors.success[500],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.success[700],
    marginBottom: Spacing[1],
  },
  infoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[700],
    lineHeight: 20,
  },
  formSection: {
    marginBottom: Spacing[6],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[4],
  },
  cardFieldWrapper: {
    borderRadius: BorderRadius['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardFieldGradient: {
    padding: 2,
    borderRadius: BorderRadius['2xl'],
  },
  cardFieldContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  cardFieldStyle: {
    backgroundColor: '#FFFFFF',
    textColor: Colors.neutral[900],
    placeholderColor: Colors.neutral[400],
    borderWidth: 0,
    borderRadius: BorderRadius.lg,
  },
  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[2],
  },
  helperText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginLeft: Spacing[2],
  },
  testCardsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius['2xl'],
    marginTop: Spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  testCardsAccent: {
    height: 4,
    backgroundColor: Colors.primaryOrange,
  },
  testCardsContent: {
    padding: Spacing[4],
  },
  testCardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  testCardsTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginLeft: Spacing[2],
  },
  testCardsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    lineHeight: 22,
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
  gradientButtonWrapper: {
    width: '100%',
    borderRadius: BorderRadius['2xl'],
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    shadowColor: '#9CA3AF',
    shadowOpacity: 0.2,
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
});

export default AddPaymentMethodScreen;