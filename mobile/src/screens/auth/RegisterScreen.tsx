import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AuthStackParamList, RegisterData } from '@/types';
import { RootState, AppDispatch } from '@/store';
import { clearError } from '@/store/slices/authSlice';
import { validateRegisterForm } from '@/utils/validation';
import { useAuthWithRetry } from '@/hooks/useAuthWithRetry';
import { ModernInput } from '@/components/ui/ModernInput';
import { ModernButton } from '@/components/ui/ModernButton';
import { ModernCard } from '@/components/ui/ModernCard';
import AuthLoadingSpinner from '@/components/common/AuthLoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import SocialLogin from '@/components/auth/SocialLogin';
import { Colors, Gradients, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';

const { width } = Dimensions.get('window');

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const { registerWithRetry, isRetrying, getLoadingMessage } = useAuthWithRetry();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const roleAnim = useRef(new Animated.Value(0)).current;
  const [showErrorModal, setShowErrorModal] = useState(false);
  const errorModalAnim = useRef(new Animated.Value(0)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;

  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'client',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { isAuthenticated, isEmailVerified, onboardingCompleted } = useSelector((state: RootState) => state.auth);

  // Error modal effect
  useEffect(() => {
    if (error) {
      setShowErrorModal(true);
      // Shake animation
      Animated.sequence([
        Animated.timing(errorShakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Modal slide in animation
      Animated.spring(errorModalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      // Hide modal with animation
      Animated.timing(errorModalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowErrorModal(false));
    }
  }, [error]);

  useEffect(() => {
    // Clear any previous errors when component mounts
    dispatch(clearError());
    
    // Start animations
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

    // Delayed role animation
    setTimeout(() => {
      Animated.spring(roleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 300);
  }, [dispatch, fadeAnim, slideAnim, scaleAnim, roleAnim]);

  // Remove automatic navigation - let AppNavigator handle the flow
  useEffect(() => {
    console.log('🔄 REGISTER SCREEN: Navigation effect triggered');
    console.log('🔐 isAuthenticated:', isAuthenticated);
    console.log('📧 isEmailVerified:', isEmailVerified);
    console.log('🎯 onboardingCompleted:', onboardingCompleted);
    console.log('⏳ isLoading:', isLoading);
    
    // AppNavigator will handle navigation based on auth state
    // No manual navigation needed here
  }, [isAuthenticated, isEmailVerified, onboardingCompleted, isLoading]);

  const handleInputChange = (field: keyof RegisterData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRoleSelect = (role: 'client' | 'worker') => {
    setFormData(prev => ({ ...prev, role }));
    if (formErrors.role) {
      setFormErrors(prev => ({ ...prev, role: '' }));
    }
  };

  const handleRegister = async () => {
    console.log('🎯 REGISTER SCREEN: handleRegister called');
    console.log('📋 Form data:', JSON.stringify(formData, null, 2));
    
    console.log('✅ Validating form...');
    const validation = validateRegisterForm(formData);
    
    if (!validation.isValid) {
      console.log('❌ Form validation failed:', validation.errors);
      setFormErrors(validation.errors);
      return;
    }

    console.log('✅ Form validation passed');
    setFormErrors({});
    
    try {
      console.log('📞 Calling registerWithRetry...');
      await registerWithRetry(formData);
    } catch (error) {
      // Error is already handled by useAuthWithRetry hook
      console.log('Registration failed:', error);
    }
  };

  const getErrorMessage = (error: any) => {
    if (!error) return null;
    
    console.log('🔍 Error analysis:', {
      type: error.type,
      message: error.message,
      status: error.status,
      code: error.code
    });
    
    // Check for actual network connectivity issues (no response received)
    if (error.type === 'network' && !error.status) {
      return 'Network connection issue. Please check your internet and try again.';
    }
    
    // User already exists - 409 status
    if (error.status === 409 || error.message?.includes('already exists') || error.message?.includes('already registered')) {
      return 'An account with this email already exists. Please use a different email or sign in.';
    }
    
    // Authentication/authorization issues - 401/403 status
    if (error.status === 401 || error.status === 403) {
      return 'Invalid credentials. Please check your information and try again.';
    }
    
    // Server issues - 5xx status codes
    if (error.status >= 500) {
      return 'Server temporarily unavailable. Please try again later.';
    }
    
    // Validation errors - 400/422 status codes
    if (error.status === 400 || error.status === 422) {
      return error.message || 'Please check your information and try again.';
    }
    
    // If we have a status code, it's not a network error
    if (error.status) {
      return error.message || `Request failed (${error.status}). Please try again.`;
    }
    
    // True network errors (no status code)
    if (error.type === 'network' || error.code === 'NETWORK_ERROR' || 
        error.message?.includes('network') || error.message?.includes('connection')) {
      return 'Network connection issue. Please check your internet and try again.';
    }
    
    // Generic fallback
    return error.message || 'Registration failed. Please try again.';
  };

  const handleSocialLoginSuccess = () => {
    // Navigation will be handled by the auth state change
    console.log('Social login successful');
  };

  const handleSocialLoginError = (error: string) => {
    // Error handling is now managed by the enhanced error system
    console.log('Social login error:', error);
  };

  const handleRetry = () => {
    const validation = validateRegisterForm(formData);
    if (validation.isValid) {
      handleRegister();
    }
  };

  const handleErrorDismiss = () => {
    dispatch(clearError());
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={Gradients.orangeBlue}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />
      
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
            {/* Header - Outside Card */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={Gradients.primaryOrange}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person-add" size={32} color={Colors.text.inverse} />
                </LinearGradient>
              </View>
              
              <Text style={styles.title}>Join Our Community</Text>
              <Text style={styles.subtitle}>Start your journey with us today</Text>
            </View>

            <ModernCard style={styles.formCard}>
              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <View style={styles.errorContent}>
                    <Ionicons 
                      name="alert-circle" 
                      size={20} 
                      color={Colors.danger[500]} 
                      style={styles.errorIcon}
                    />
                    <Text style={styles.errorText}>{getErrorMessage(error)}</Text>
                  </View>
                  {error.isRetryable && (
                    <TouchableOpacity 
                      style={styles.retryButton}
                      onPress={handleRetry}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Role Selection */}
              <Animated.View 
                style={[
                  styles.roleSection,
                  {
                    opacity: roleAnim,
                    transform: [{ scale: roleAnim }]
                  }
                ]}
              >
                <Text style={styles.roleLabel}>I want to:</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'client' && styles.roleButtonActive,
                    ]}
                    onPress={() => handleRoleSelect('client')}
                  >
                    <Ionicons
                      name="business"
                      size={28}
                      color={formData.role === 'client' ? Colors.primary[500] : Colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'client' && styles.roleButtonTextActive,
                      ]}
                    >
                      Hire Workers
                    </Text>
                    <Text style={styles.roleButtonSubtext}>Post jobs and find skilled workers</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'worker' && styles.roleButtonActive,
                    ]}
                    onPress={() => handleRoleSelect('worker')}
                  >
                    <Ionicons
                      name="hammer"
                      size={28}
                      color={formData.role === 'worker' ? Colors.primary[500] : Colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'worker' && styles.roleButtonTextActive,
                      ]}
                    >
                      Find Work
                    </Text>
                    <Text style={styles.roleButtonSubtext}>Browse jobs and offer services</Text>
                  </TouchableOpacity>
                </View>
                {formErrors.role && <Text style={styles.errorText}>{formErrors.role}</Text>}
              </Animated.View>

              {/* Registration Form */}
              <View style={styles.form}>
                <View style={styles.nameRow}>
                  <ModernInput
                    placeholder="First name"
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    error={formErrors.firstName}
                    style={styles.nameInput}
                  />
                  <ModernInput
                    placeholder="Last name"
                    value={formData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    error={formErrors.lastName}
                    style={styles.nameInput}
                  />
                </View>

                <ModernInput
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  error={formErrors.email}
                  keyboardType="email-address"
                />

                <ModernInput
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  error={formErrors.phone}
                  keyboardType="phone-pad"
                />

                <ModernInput
                  placeholder="Create a password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  error={formErrors.password}
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                <ModernInput
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  error={formErrors.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  rightIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                <ModernButton
                  title={isLoading || isRetrying ? "Creating Account..." : "Create Account"}
                  onPress={handleRegister}
                  loading={isLoading || isRetrying}
                  disabled={isLoading || isRetrying}
                  variant="gradient"
                  size="lg"
                  style={styles.registerButton}
                />
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Buttons */}
              <View style={styles.socialContainer}>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-apple" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
            </ModernCard>

            {/* Login Link - Outside Card */}
            <Animated.View 
              style={[
                styles.loginContainer,
                { opacity: fadeAnim }
              ]}
            >
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      <AuthLoadingSpinner overlay />
      
      {/* Fancy Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleErrorDismiss}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.errorModal,
              {
                opacity: errorModalAnim,
                transform: [
                  {
                    scale: errorModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                  {
                    translateY: errorModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                  { translateX: errorShakeAnim },
                ],
              },
            ]}
          >
            {/* Modal Header */}
            <LinearGradient
              colors={[Colors.danger[500], Colors.danger[600]]}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={32} color="white" />
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleErrorDismiss}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>
            
            {/* Modal Body */}
            <View style={styles.modalBody}>
              <Text style={styles.errorTitle}>Registration Failed</Text>
              <Text style={styles.errorMessage}>{getErrorMessage(error)}</Text>
              
              <View style={styles.modalButtons}>
                {error?.isRetryable && (
                  <TouchableOpacity 
                    style={styles.retryModalButton}
                    onPress={handleRetry}
                  >
                    <LinearGradient
                      colors={[Colors.primary[500], Colors.primary[600]]}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="refresh" size={16} color="white" style={{ marginRight: 8 }} />
                      <Text style={styles.retryModalButtonText}>Try Again</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.dismissModalButton}
                  onPress={handleErrorDismiss}
                >
                  <Text style={styles.dismissModalButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
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
    top: -120,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: '40%',
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
  },
  formCard: {
    margin: 0,
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 32,
    position: 'relative',
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 0,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  roleSection: {
    marginBottom: 32,
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  roleButton: {
    flex: 1,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  roleButtonActive: {
    borderColor: Colors.primary[500],
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.primary[500],
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  roleButtonTextActive: {
    color: Colors.primary[500],
  },
  roleButtonSubtext: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.7,
  },
  form: {
    marginBottom: 32,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
  },
  registerButton: {
    marginTop: 20,
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral[200],
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  loginText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loginLink: {
    fontSize: 16,
    color: 'white',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger[500],
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.danger[500],
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Fancy Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing[6],
  },
  errorModal: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    maxWidth: width * 0.9,
    width: '100%',
    overflow: 'hidden',
    ...Shadows.xl,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[5],
    minHeight: 80,
  },
  errorIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[6],
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[800],
    marginBottom: Spacing[3],
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing[6],
  },
  modalButtons: {
    gap: Spacing[3],
  },
  retryModalButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[6],
  },
  retryModalButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.text.inverse,
  },
  dismissModalButton: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[6],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
  },
  dismissModalButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.neutral[600],
  },
});