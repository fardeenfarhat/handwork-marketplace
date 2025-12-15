import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AuthStackParamList } from '@/types';
import { AppDispatch, RootState } from '@/store';
import { setEmailVerified } from '@/store/slices/authSlice';
import { validateVerificationCode } from '@/utils/validation';
import apiService from '@/services/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ModernButton } from '@/components/ui/ModernButton';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/styles/DesignSystem';

type EmailVerificationScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'EmailVerification'>;
type EmailVerificationScreenRouteProp = RouteProp<AuthStackParamList, 'EmailVerification'>;

export default function EmailVerificationScreen() {
  const navigation = useNavigation<EmailVerificationScreenNavigationProp>();
  const route = useRoute<EmailVerificationScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const email = route.params?.email || user?.email || '';
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [fullToken, setFullToken] = useState('');
  const [useFullToken, setUseFullToken] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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
    if (value.length > 1) return;
    
    setError('');
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

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
    
    if (!useFullToken) {
      const validation = validateVerificationCode(codeToVerify);
      if (!validation.isValid) {
        Alert.alert('Invalid Code', validation.errors.code);
        return;
      }
    }

    if (!codeToVerify) {
      setError('Please enter a verification code');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.verifyEmail(codeToVerify);
      dispatch(setEmailVerified(true));
      
      Alert.alert(
        'Email Verified',
        'Your email has been successfully verified!',
        [{ text: 'Continue', onPress: () => {} }]
      );
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid verification code. Please try again.';
      setError(errorMessage);
      
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('server')) {
        Alert.alert('Verification Failed', errorMessage);
      }
      
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
      await apiService.resendVerification('email', email);
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
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Login');
                  }
                }}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                  style={styles.backButtonGradient}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              {/* Icon Container */}
              <Animated.View 
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F8F9FA']}
                  style={styles.iconGradient}
                >
                  <Ionicons name="mail" size={60} color={Colors.primary[500]} />
                </LinearGradient>
              </Animated.View>

              {/* Title */}
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to
              </Text>
              <Text style={styles.email}>{email}</Text>

              {/* Code Input Card */}
              <View style={styles.cardContainer}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
                  style={styles.card}
                >
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

                      {error ? (
                        <View style={styles.errorContainer}>
                          <Ionicons name="alert-circle" size={16} color={Colors.danger[500]} />
                          <Text style={styles.errorText}>{error}</Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        style={styles.switchModeButton}
                        onPress={() => setUseFullToken(true)}
                      >
                        <Text style={styles.switchModeText}>
                          Paste full token instead
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
                        placeholderTextColor={Colors.neutral[400]}
                        multiline
                        numberOfLines={3}
                        autoFocus
                      />

                      {error ? (
                        <View style={styles.errorContainer}>
                          <Ionicons name="alert-circle" size={16} color={Colors.danger[500]} />
                          <Text style={styles.errorText}>{error}</Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        style={styles.switchModeButton}
                        onPress={() => setUseFullToken(false)}
                      >
                        <Text style={styles.switchModeText}>
                          Use 6-digit code instead
                        </Text>
                      </TouchableOpacity>

                      <ModernButton
                        title="Verify Token"
                        onPress={() => handleVerifyEmail()}
                        loading={isLoading}
                        style={styles.verifyButton}
                      />
                    </>
                  )}
                </LinearGradient>
              </View>

              {/* Resend Code */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendCode} disabled={isResending}>
                    <LinearGradient
                      colors={Gradients.primaryOrange}
                      style={styles.resendButtonGradient}
                    >
                      <Text style={styles.resendButtonText}>
                        {isResending ? 'Sending...' : 'Resend Code'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.timerText}>Resend in {formatTimer(timer)}</Text>
                )}
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 250,
    height: 250,
    top: -100,
    right: -80,
  },
  circle2: {
    width: 180,
    height: 180,
    top: 150,
    left: -50,
  },
  circle3: {
    width: 120,
    height: 120,
    top: 300,
    right: 80,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
  },
  content: {
    flex: 1,
  },
  backButton: {
    width: 48,
    height: 48,
    marginBottom: Spacing[6],
  },
  backButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: Spacing[5],
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xl,
  },
  title: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing[1],
  },
  email: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing[6],
  },
  cardContainer: {
    marginBottom: Spacing[6],
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing[6],
    ...Shadows.lg,
  },
  codeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
  },
  codeInput: {
    width: 50,
    height: 60,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    backgroundColor: '#FFFFFF',
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  codeInputError: {
    borderColor: Colors.danger[500],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[3],
    paddingHorizontal: Spacing[2],
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.danger[500],
    fontWeight: '500' as const,
  },
  verifyButton: {
    marginTop: Spacing[3],
  },
  resendContainer: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  resendText: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  resendButtonGradient: {
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.lg,
  },
  resendButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  timerText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  switchModeButton: {
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  switchModeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary[500],
    fontWeight: '600' as const,
  },
  fullTokenInput: {
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    backgroundColor: '#FFFFFF',
    padding: Spacing[4],
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    textAlignVertical: 'top',
    marginBottom: Spacing[4],
    minHeight: 100,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});