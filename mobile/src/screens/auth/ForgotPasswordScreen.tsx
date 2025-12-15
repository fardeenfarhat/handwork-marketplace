import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AuthStackParamList, ForgotPasswordData } from '@/types';
import { validateForgotPasswordForm } from '@/utils/validation';
import apiService from '@/services/api';
import { ModernInput } from '@/components/ui/ModernInput';
import { ModernButton } from '@/components/ui/ModernButton';
import { ModernCard } from '@/components/ui/ModernCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Colors, Gradients } from '@/styles/DesignSystem';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const [formData, setFormData] = useState<ForgotPasswordData>({
    email: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isEmailSent) {
      // Success animation
      Animated.spring(successAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [isEmailSent]);

  const handleInputChange = (field: keyof ForgotPasswordData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleForgotPassword = async () => {
    const validation = validateForgotPasswordForm(formData.email);
    
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setIsLoading(true);

    try {
      await apiService.forgotPassword(formData.email);
      setIsEmailSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!formData.email) return;
    
    setIsLoading(true);
    try {
      await apiService.forgotPassword(formData.email);
      Alert.alert('Success', 'Password reset email has been sent again.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={Gradients.orangeBlue}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ModernCard style={styles.formCard}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color={Colors.primary[500]} />
                </TouchableOpacity>
                
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={Gradients.primaryOrange}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="key-outline" size={36} color={Colors.text.inverse} />
                  </LinearGradient>
                </View>
                
                <Text style={styles.title}>
                  {isEmailSent ? 'Check Your Email!' : 'Reset Password'}
                </Text>
                <Text style={styles.subtitle}>
                  {isEmailSent
                    ? 'We\'ve sent a secure link to reset your password. Check your inbox and follow the instructions.'
                    : 'Don\'t worry! Enter your email address and we\'ll send you a secure link to reset your password.'}
                </Text>
              </View>

              {!isEmailSent ? (
                /* Initial Form */
                <View style={styles.form}>
                  <ModernInput
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    error={formErrors.email}
                    keyboardType="email-address"
                    style={styles.emailInput}
                  />

                  <ModernButton
                    title="Send Reset Link"
                    onPress={handleForgotPassword}
                    loading={isLoading}
                    disabled={isLoading || !formData.email.trim()}
                    variant="gradient"
                    size="lg"
                    style={styles.submitButton}
                  />
                </View>
              ) : (
                /* Success State */
                <Animated.View 
                  style={[
                    styles.successContainer,
                    {
                      opacity: successAnim,
                      transform: [{ scale: successAnim }]
                    }
                  ]}
                >
                  <View style={styles.successIndicator}>
                    <LinearGradient
                      colors={[Colors.success[500], '#34D399']}
                      style={styles.successCircle}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="checkmark" size={28} color={Colors.text.inverse} />
                    </LinearGradient>
                    <Text style={styles.successText}>Email sent successfully!</Text>
                    <Text style={styles.successSubtext}>
                      Check your inbox for the reset link
                    </Text>
                  </View>
                  
                  <View style={styles.actionButtons}>
                    <ModernButton
                      title="Resend Email"
                      onPress={handleResendEmail}
                      variant="primary"
                      loading={isLoading}
                      disabled={isLoading}
                      style={styles.resendButton}
                    />
                    
                    <ModernButton
                      title="Back to Login"
                      onPress={navigateToLogin}
                      variant="gradient"
                      style={styles.backToLoginButton}
                    />
                  </View>
                </Animated.View>
              )}

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <View style={styles.helpTextRow}>
                  <Text style={styles.helpText}>Remember your password? </Text>
                  <TouchableOpacity onPress={navigateToLogin}>
                    <Text style={styles.helpLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ModernCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      {isLoading && <LoadingSpinner overlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  content: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
    justifyContent: 'center',
  },
  formCard: {
    margin: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: -10,
    top: -10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    marginBottom: 32,
  },
  emailInput: {
    marginBottom: 24,
  },
  submitButton: {
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successContainer: {
    marginBottom: 32,
  },
  successIndicator: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.success[500],
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  successText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success[500],
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  actionButtons: {
    gap: 16,
  },
  resendButton: {
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backToLoginButton: {
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  helpContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  helpTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  helpLink: {
    fontSize: 16,
    color: Colors.primary[500],
    fontWeight: '700',
  },
});