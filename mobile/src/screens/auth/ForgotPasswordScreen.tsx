import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { AuthStackParamList, ForgotPasswordData } from '@/types';
import { validateForgotPasswordForm } from '@/utils/validation';
import apiService from '@/services/api';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();

  const [formData, setFormData] = useState<ForgotPasswordData>({
    email: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

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
      Alert.alert(
        'Email Sent',
        'We\'ve sent a password reset link to your email address. Please check your inbox and follow the instructions.',
        [{ text: 'OK' }]
      );
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
      Alert.alert('Email Sent', 'Password reset email has been sent again.');
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={48} color="#007AFF" />
            </View>
            
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              {isEmailSent
                ? 'We\'ve sent a password reset link to your email'
                : 'Enter your email address and we\'ll send you a link to reset your password'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              error={formErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail"
              editable={!isEmailSent}
            />

            {!isEmailSent ? (
              <Button
                title="Send Reset Link"
                onPress={handleForgotPassword}
                loading={isLoading}
                disabled={isLoading || !formData.email.trim()}
                style={styles.submitButton}
              />
            ) : (
              <View style={styles.emailSentActions}>
                <Button
                  title="Resend Email"
                  onPress={handleResendEmail}
                  variant="outline"
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.resendButton}
                />
                
                <Button
                  title="Back to Login"
                  onPress={navigateToLogin}
                  style={styles.backToLoginButton}
                />
              </View>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Remember your password?{' '}
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.helpLink}>Sign In</Text>
              </TouchableOpacity>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {isLoading && <LoadingSpinner overlay text="Sending reset email..." />}
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: -16,
    top: -20,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    marginBottom: 32,
  },
  submitButton: {
    marginTop: 8,
  },
  emailSentActions: {
    gap: 12,
  },
  resendButton: {
    marginTop: 8,
  },
  backToLoginButton: {
    marginTop: 8,
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  helpLink: {
    color: '#007AFF',
    fontWeight: '600',
  },
});