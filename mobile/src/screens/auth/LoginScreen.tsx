import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthStackParamList, LoginCredentials } from '@/types';
import { RootState, AppDispatch } from '@/store';
import { clearError } from '@/store/slices/authSlice';
import { validateLoginForm } from '@/utils/validation';
import { useAuthWithRetry } from '@/hooks/useAuthWithRetry';
import { ModernButton } from '@/components/ui/ModernButton';
import { ModernInput } from '@/components/ui/ModernInput';
import { ModernCard } from '@/components/ui/ModernCard';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/styles/DesignSystem';

const { width, height } = Dimensions.get('window');

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const { loginWithRetry, isRetrying, getLoadingMessage } = useAuthWithRetry();

  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [showErrorModal, setShowErrorModal] = useState(false);
  const errorModalAnim = useRef(new Animated.Value(0)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    // Clear any previous errors when component mounts
    dispatch(clearError());
    
    // Suppress default error handling
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Filter out React Native's default auth error modals
      const message = args[0]?.toString() || '';
      if (message.includes('Authentication') || 
          message.includes('Login error') || 
          message.includes('Network request failed')) {
        return; // Suppress these errors to prevent system modals
      }
      originalConsoleError(...args);
    };
    
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

    return () => {
      // Restore original console.error on cleanup
      console.error = originalConsoleError;
    };
  }, []);

  // Show error modal when error occurs
  useEffect(() => {
    console.log('🔍 Error effect triggered:', { error, showErrorModal });
    if (error) {
      console.log('✅ Setting showErrorModal to true');
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
    }
    // Don't auto-hide the modal when error is cleared by navigation
    // Only hide when user explicitly dismisses it
  }, [error]);

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Don't clear auth error here - let user dismiss it manually via modal
  };

  const handleErrorDismiss = () => {
    console.log('🚫 User dismissed error modal');
    // Hide modal with animation first
    Animated.timing(errorModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowErrorModal(false);
      // Clear the error after animation completes
      dispatch(clearError());
    });
  };

  const handleRetry = () => {
    dispatch(clearError());
    if (formData.email && formData.password) {
      handleLogin();
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
    
    // Authentication issues (wrong credentials) - 401 status
    if (error.status === 401 || error.type === 'authentication' || 
        error.message?.includes('Incorrect email or password') ||
        error.message?.includes('Invalid credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    // User not found - 404 status
    if (error.status === 404 || error.message?.includes('User not found')) {
      return 'No account found with this email. Please check your email or sign up.';
    }
    
    // Account locked/disabled - 403 status
    if (error.status === 403 || error.message?.includes('Account locked') || error.message?.includes('Account disabled')) {
      return 'Account temporarily locked. Please contact support or try again later.';
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
    return error.message || 'Login failed. Please try again.';
  };

  const handleLogin = async () => {
    // Clear any previous modal state
    setShowErrorModal(false);
    
    // Validate form
    const validation = validateLoginForm(formData.email, formData.password);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    try {
      await loginWithRetry(formData);
    } catch (err: any) {
      // Error is handled by the auth slice, just log it
      console.log('🔴 Login attempt failed:', {
        message: err?.message,
        type: err?.type,
        status: err?.status || err?.statusCode
      });
      // Don't throw or show additional error - our modal will handle it
    }
  };

  const handleRegisterNavigation = () => {
    navigation.navigate('Register');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[500]} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={Gradients.orangeBlue}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeContainer}>
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section */}
            <Animated.View
              style={[
                styles.headerSection,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#FFFFFF', '#F8F9FA']}
                  style={styles.logoGradient}
                >
                  <Ionicons name="hammer" size={40} color={Colors.primary[500]} />
                </LinearGradient>
              </View>
              
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>
                Sign in to continue to your HandWork account
              </Text>
            </Animated.View>

            {/* Login Form */}
            <Animated.View
              style={[
                styles.formSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <ModernCard variant="elevated" style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Sign In</Text>
                  <Text style={styles.formSubtitle}>Enter your credentials to access your account</Text>
                </View>

                {/* Email Input */}
                <ModernInput
                  label="Email Address"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  leftIcon="mail-outline"
                  error={validationErrors.email}
                  variant="floating"
                />

                {/* Password Input */}
                <ModernInput
                  label="Password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  secureTextEntry={!showPassword}
                  leftIcon="lock-closed-outline"
                  rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  error={validationErrors.password}
                  variant="floating"
                />

                {/* Forgot Password */}
                <TouchableOpacity style={styles.forgotPassword} onPress={navigateToForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <ModernButton
                  title="Sign In"
                  onPress={handleLogin}
                  variant="gradient"
                  size="lg"
                  loading={isLoading || isRetrying}
                  gradient={Gradients.primaryOrange}
                  style={styles.loginButton}
                />

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Login */}
                <View style={styles.socialContainer}>
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-google" size={24} color={Colors.danger[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-apple" size={24} color={Colors.neutral[700]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-facebook" size={24} color={Colors.secondary[500]} />
                  </TouchableOpacity>
                </View>
              </ModernCard>
            </Animated.View>

            {/* Bottom Section */}
            <Animated.View
              style={[
                styles.bottomSection,
                { opacity: fadeAnim },
              ]}
            >
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account?</Text>
                <TouchableOpacity onPress={handleRegisterNavigation}>
                  <Text style={styles.registerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* Loading Message */}
              {(isLoading || isRetrying) && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>{getLoadingMessage()}</Text>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
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
              <Text style={styles.errorTitle}>Oops! Login Failed</Text>
              <Text style={styles.errorMessage}>
                {getErrorMessage(error)}
              </Text>
              <Text style={styles.errorSubMessage}>
                Don't worry, this happens sometimes. Please try again or check your internet connection.
              </Text>
              
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
    backgroundColor: Colors.primary[500],
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 200,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    top: height * 0.3,
    left: width * 0.8,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[8],
    paddingBottom: Spacing[6],
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing[8],
    paddingTop: Spacing[6],
  },
  logoContainer: {
    marginBottom: Spacing[6],
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  welcomeTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  welcomeSubtitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.normal as any,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 400,
  },
  formCard: {
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[8],
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: Spacing[8],
  },
  formTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[800],
    marginBottom: Spacing[3],
  },
  formSubtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal as any,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -Spacing[3],
    marginBottom: Spacing[8],
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  loginButton: {
    marginBottom: Spacing[6],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral[300],
  },
  dividerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[500],
    paddingHorizontal: Spacing[4],
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing[6],
    marginBottom: Spacing[6],
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.base,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  bottomSection: {
    paddingTop: Spacing[6],
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing[6],
  },
  registerText: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: Spacing[2],
  },
  registerLink: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: Spacing[4],
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
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
    color: Colors.neutral[700],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing[3],
    fontWeight: Typography.fontWeight.medium as any,
  },
  errorSubMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing[6],
    fontStyle: 'italic',
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