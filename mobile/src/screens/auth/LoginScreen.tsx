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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';

import { AuthStackParamList, LoginCredentials } from '@/types';
import { RootState, AppDispatch } from '@/store';
import { clearError } from '@/store/slices/authSlice';
import { validateLoginForm } from '@/utils/validation';
import { useAuthWithRetry } from '@/hooks/useAuthWithRetry';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import AuthLoadingSpinner from '@/components/common/AuthLoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import SocialLogin from '@/components/auth/SocialLogin';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login'
>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const { loginWithRetry, isRetrying, getLoadingMessage } = useAuthWithRetry();

  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogin = async () => {
    const validation = validateLoginForm(formData.email, formData.password);

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});

    try {
      await loginWithRetry(formData);

      // Store remember me preference
      if (rememberMe) {
        const { secureStorage } = await import('@/services/storage');
        await secureStorage.setItem('remember_me', 'true');
      }
    } catch (error) {
      // Error is already handled by useAuthWithRetry hook
      console.log('Login failed:', error);
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
    if (formData.email && formData.password) {
      handleLogin();
    }
  };

  const handleErrorDismiss = () => {
    dispatch(clearError());
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            {/* Development Clear Storage Button */}
            {__DEV__ && (
              <TouchableOpacity
                onPress={async () => {
                  console.log('🔧 DEV: Clearing stored auth...');
                  const { secureStorage } = await import('@/services/storage');
                  await secureStorage.removeItem('access_token');
                  await secureStorage.removeItem('refresh_token');
                  dispatch(clearError());
                  console.log('✅ DEV: Storage cleared - app will reset');
                }}
                style={styles.devClearButton}
              >
                <Text style={styles.devClearText}>
                  [DEV] Clear Storage & Start Fresh
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Error Display */}
          {error && (
            <ErrorDisplay
              error={error}
              onRetry={error.isRetryable ? handleRetry : undefined}
              onDismiss={handleErrorDismiss}
            />
          )}

          {/* Login Form */}
          <View style={styles.form}>
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
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              error={formErrors.password}
              secureTextEntry={!showPassword}
              autoComplete="password"
              leftIcon="lock-closed"
            />

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <Ionicons
                  name={rememberMe ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={rememberMe ? '#007AFF' : '#8E8E93'}
                />
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={navigateToForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading || isRetrying}
              disabled={isLoading || isRetrying}
              style={styles.loginButton}
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

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.registerLink}>Sign Up</Text>
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
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  forgotPassword: {
    // alignSelf: 'flex-end', // removed since it's now in a row
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  loginButton: {
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
  registerText: {
    fontSize: 16,
    color: '#666',
  },
  registerLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  devClearButton: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  devClearText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});
