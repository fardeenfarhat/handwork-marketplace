import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { AuthStackParamList } from '@/types';
import { AppDispatch, RootState } from '@/store';
import { setEmailVerified } from '@/store/slices/authSlice';
import { validateVerificationCode } from '@/utils/validation';
import apiService from '@/services/api';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

type EmailVerificationScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'EmailVerification'>;
type EmailVerificationScreenRouteProp = RouteProp<AuthStackParamList, 'EmailVerification'>;

export default function EmailVerificationScreen() {
  const navigation = useNavigation<EmailVerificationScreenNavigationProp>();
  const route = useRoute<EmailVerificationScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Get email from route params or user state
  const email = route.params?.email || user?.email || '';
  
  console.log('📧 EMAIL VERIFICATION SCREEN: Component mounted');
  console.log('📧 Email from params:', email);
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [fullToken, setFullToken] = useState('');
  const [useFullToken, setUseFullToken] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    // Clear any previous error
    setError('');
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every(digit => digit !== '') && value) {
      handleVerifyEmail(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyEmail = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || (useFullToken ? fullToken.trim() : code.join(''));
    
    console.log('📧 EMAIL VERIFICATION: handleVerifyEmail called');
    console.log('🔢 Code to verify:', codeToVerify);
    console.log('🔄 Using full token mode:', useFullToken);
    
    // Skip validation for full token mode
    if (!useFullToken) {
      const validation = validateVerificationCode(codeToVerify);
      if (!validation.isValid) {
        console.log('❌ Code validation failed:', validation.errors);
        Alert.alert('Invalid Code', validation.errors.code);
        return;
      }
    }

    if (!codeToVerify) {
      setError('Please enter a verification code');
      return;
    }

    console.log('✅ Code validation passed');
    setIsLoading(true);
    try {
      console.log('📞 Calling apiService.verifyEmail...');
      await apiService.verifyEmail(codeToVerify);
      console.log('✅ Email verification API call successful');
      
      console.log('🔄 Dispatching setEmailVerified(true)...');
      dispatch(setEmailVerified(true));
      console.log('✅ Email verified state updated');
      
      Alert.alert(
        'Email Verified',
        'Your email has been successfully verified!',
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('🧭 Email verified - AppNavigator will handle navigation to onboarding');
              // AppNavigator will automatically navigate to onboarding based on auth state
            },
          },
        ]
      );
    } catch (error: any) {
      console.log('💥 Email verification failed:', error);
      const errorMessage = error.message || 'Invalid verification code. Please try again.';
      setError(errorMessage);
      
      // Show alert for critical errors, but use inline error for validation issues
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('server')) {
        Alert.alert('Verification Failed', errorMessage);
      }
      
      // Clear the code on error
      if (useFullToken) {
        setFullToken('');
      } else {
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address not found. Please go back and try again.');
      return;
    }
    
    setIsResending(true);
    try {
      const response = await apiService.resendVerification('email', email);
      console.log('📧 RESEND RESPONSE:', JSON.stringify(response, null, 2));
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      setTimer(60);
      setCanResend(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                // If can't go back, navigate to login
                navigation.navigate('Login');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={48} color="#007AFF" />
          </View>
          
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
        </View>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {!useFullToken ? (
            <>
              <View style={styles.codeInputs}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => inputRefs.current[index] = ref}
                    style={[
                      styles.codeInput,
                      digit ? styles.codeInputFilled : null,
                      error ? styles.codeInputError : null,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleCodeChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={index === 0}
                  />
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.switchModeButton}
                onPress={() => setUseFullToken(true)}
              >
                <Text style={styles.switchModeText}>
                  Having trouble? Paste full token instead
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.fullTokenInput, error ? styles.codeInputError : null]}
                value={fullToken}
                onChangeText={setFullToken}
                placeholder="Paste your verification token here"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <TouchableOpacity
                style={styles.switchModeButton}
                onPress={() => {
                  setUseFullToken(false);
                  setFullToken('');
                }}
              >
                <Text style={styles.switchModeText}>
                  Use 6-digit code instead
                </Text>
              </TouchableOpacity>
            </>
          )}
          
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          
          <Button
            title="Verify Email"
            onPress={() => handleVerifyEmail()}
            loading={isLoading}
            disabled={isLoading || (useFullToken ? !fullToken.trim() : code.some(digit => !digit))}
            style={styles.verifyButton}
          />
        </View>

        {/* Resend Code */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          
          {canResend ? (
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={isResending}
              style={styles.resendButton}
            >
              <Text style={styles.resendButtonText}>
                {isResending ? 'Sending...' : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend in {formatTimer(timer)}
            </Text>
          )}
        </View>

        {/* Help */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Check your spam folder if you don't see the email
          </Text>
          
          {/* Development Skip Button */}
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => {
                console.log('🔧 DEV: Skipping email verification...');
                dispatch(setEmailVerified(true));
                Alert.alert(
                  'Email Verified (DEV)',
                  'Email verification skipped for development!',
                  [
                    {
                      text: 'Continue',
                      onPress: () => {
                        console.log('🧭 DEV Email verified - AppNavigator will handle navigation to onboarding');
                        // AppNavigator will automatically navigate to onboarding based on auth state
                      },
                    },
                  ]
                );
              }}
              style={styles.devSkipButton}
            >
              <Text style={styles.devSkipText}>
                [DEV] Skip Verification
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {(isLoading || isResending) && (
        <LoadingSpinner 
          overlay 
          text={isLoading ? 'Verifying...' : 'Sending code...'} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  },
  email: {
    fontWeight: '600',
    color: '#007AFF',
  },
  codeContainer: {
    marginBottom: 32,
  },
  codeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  codeInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  codeInputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  verifyButton: {
    marginTop: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  timerText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  devSkipButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    alignItems: 'center',
  },
  devSkipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  switchModeButton: {
    marginVertical: 16,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  fullTokenInput: {
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    marginBottom: 16,
  },
});