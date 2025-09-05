import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { AuthStackParamList, RegisterData } from '@/types';
import { RootState, AppDispatch } from '@/store';
import { clearError } from '@/store/slices/authSlice';
import { validateRegisterForm } from '@/utils/validation';
import { useAuthWithRetry } from '@/hooks/useAuthWithRetry';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import AuthLoadingSpinner from '@/components/common/AuthLoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import SocialLogin from '@/components/auth/SocialLogin';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const { registerWithRetry, isRetrying, getLoadingMessage } = useAuthWithRetry();

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

  // Navigate to email verification after successful registration
  const { isAuthenticated, isEmailVerified, onboardingCompleted } = useSelector((state: RootState) => state.auth);
  
  useEffect(() => {
    console.log('🔄 REGISTER SCREEN: Navigation effect triggered');
    console.log('🔐 isAuthenticated:', isAuthenticated);
    console.log('📧 isEmailVerified:', isEmailVerified);
    console.log('🎯 onboardingCompleted:', onboardingCompleted);
    console.log('⏳ isLoading:', isLoading);
    
    if (isAuthenticated && !isLoading) {
      console.log('✅ User is authenticated and not loading');
      if (!isEmailVerified) {
        console.log('📧 Navigating to email verification...');
        navigation.navigate('EmailVerification', { email: formData.email });
      } else if (!onboardingCompleted) {
        console.log('🎯 Navigating to onboarding...');
        navigation.navigate('Onboarding', { role: formData.role });
      }
    } else {
      console.log('⏳ Still loading or not authenticated yet');
    }
  }, [isAuthenticated, isEmailVerified, onboardingCompleted, isLoading, navigation, formData.email, formData.role]);

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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Handwork Marketplace</Text>
          </View>

          {/* Error Display */}
          {error && (
            <ErrorDisplay
              error={error}
              onRetry={error.isRetryable ? handleRetry : undefined}
              onDismiss={handleErrorDismiss}
            />
          )}

          {/* Role Selection */}
          <View style={styles.roleSection}>
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
                  size={24}
                  color={formData.role === 'client' ? '#007AFF' : '#8E8E93'}
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
                  size={24}
                  color={formData.role === 'worker' ? '#007AFF' : '#8E8E93'}
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
          </View>

          {/* Registration Form */}
          <View style={styles.form}>
            <View style={styles.nameRow}>
              <Input
                label="First Name"
                placeholder="First name"
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                error={formErrors.firstName}
                autoCapitalize="words"
                containerStyle={styles.nameInput}
                leftIcon="person"
              />
              <Input
                label="Last Name"
                placeholder="Last name"
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                error={formErrors.lastName}
                autoCapitalize="words"
                containerStyle={styles.nameInput}
                leftIcon="person"
              />
            </View>

            <Input
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              error={formErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail"
            />

            <Input
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              error={formErrors.phone}
              keyboardType="phone-pad"
              autoComplete="tel"
              leftIcon="call"
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              error={formErrors.password}
              secureTextEntry={!showPassword}
              leftIcon="lock-closed"
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              error={formErrors.confirmPassword}
              secureTextEntry={!showConfirmPassword}
              leftIcon="lock-closed"
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={isLoading || isRetrying}
              disabled={isLoading || isRetrying}
              style={styles.registerButton}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login */}
          <SocialLogin
            onSuccess={handleSocialLoginSuccess}
            onError={handleSocialLoginError}
          />

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AuthLoadingSpinner overlay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  roleSection: {
    marginBottom: 32,
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  roleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  roleButtonTextActive: {
    color: '#007AFF',
  },
  roleButtonSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  registerButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#8E8E93',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
  loginText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
    textAlign: 'center',
  },
});