import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AuthStackParamList } from '@/types';
import { AppDispatch, RootState } from '@/store';
import { setOnboardingCompleted } from '@/store/slices/authSlice';
import { ModernButton } from '@/components/ui/ModernButton';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/styles/DesignSystem';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;
type OnboardingScreenRouteProp = RouteProp<AuthStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const clientSteps: OnboardingStep[] = [
  {
    id: 'post-jobs',
    title: 'Post Your Jobs',
    description: 'Create detailed job postings with descriptions, budgets, and requirements to attract the right workers.',
    icon: 'add-circle',
    color: '#007AFF',
  },
  {
    id: 'find-workers',
    title: 'Find Skilled Workers',
    description: 'Browse worker profiles, check ratings and reviews, and invite the best candidates for your projects.',
    icon: 'people',
    color: '#34C759',
  },
  {
    id: 'secure-payments',
    title: 'Secure Payments',
    description: 'Pay safely through our escrow system. Funds are held securely and released when work is completed.',
    icon: 'shield-checkmark',
    color: '#FF9500',
  },
  {
    id: 'track-progress',
    title: 'Track Progress',
    description: 'Monitor job progress, communicate with workers, and approve completed work through the app.',
    icon: 'checkmark-circle',
    color: '#30D158',
  },
];

const workerSteps: OnboardingStep[] = [
  {
    id: 'complete-profile',
    title: 'Complete Your Profile',
    description: 'Add your skills, experience, and portfolio to showcase your expertise to potential clients.',
    icon: 'person-circle',
    color: '#007AFF',
  },
  {
    id: 'browse-jobs',
    title: 'Browse Available Jobs',
    description: 'Find jobs that match your skills and location. Apply to projects that interest you.',
    icon: 'search',
    color: '#34C759',
  },
  {
    id: 'get-hired',
    title: 'Get Hired',
    description: 'Communicate with clients, negotiate terms, and get hired for projects that fit your schedule.',
    icon: 'people-circle',
    color: '#FF9500',
  },
  {
    id: 'earn-money',
    title: 'Complete Work & Earn',
    description: 'Deliver quality work, get paid securely, and build your reputation with positive reviews.',
    icon: 'card',
    color: '#30D158',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const route = useRoute<OnboardingScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const role = route.params?.role || user?.role || 'client';
  
  const [currentStep, setCurrentStep] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
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
  }, []);

  React.useEffect(() => {
    // Animate progress
    Animated.spring(progressAnim, {
      toValue: currentStep,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);
  
  const steps = role === 'client' ? clientSteps : workerSteps;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    dispatch(setOnboardingCompleted(true));
  };

  const currentStepData = steps[currentStep];

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Welcome {role === 'client' ? 'Client' : 'Worker'}!
            </Text>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.skipButtonGradient}
              >
                <Text style={styles.skipText}>Skip</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, steps.length - 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentStep + 1} / {steps.length}
            </Text>
          </View>

          {/* Step Content */}
          <View style={styles.stepContent}>
            <View style={styles.stepInner}>
              {/* Icon Container */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
                  style={styles.iconGradient}
                >
                  <Ionicons
                    name={currentStepData.icon}
                    size={80}
                    color={currentStepData.color}
                  />
                </LinearGradient>
              </View>

              <Text style={styles.stepTitle}>{currentStepData.title}</Text>
              <Text style={styles.stepDescription}>{currentStepData.description}</Text>

              {/* Step Dots */}
              <View style={styles.dotsContainer}>
                {steps.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === currentStep && styles.dotActive,
                    ]}
                  />
                ))}
              </View>

              {/* Role-specific tips */}
              {currentStep === 0 && (
                <View style={styles.tipsCard}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
                    style={styles.tipsGradient}
                  >
                    <Text style={styles.tipsTitle}>
                      {role === 'worker' ? 'Pro Tips:' : 'Best Practices:'}
                    </Text>
                    
                    {role === 'worker' ? (
                      <>
                        <View style={styles.tipItem}>
                          <View style={styles.tipIconContainer}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.success[500]} />
                          </View>
                          <Text style={styles.tipText}>Upload high-quality portfolio images</Text>
                        </View>
                        <View style={styles.tipItem}>
                          <View style={styles.tipIconContainer}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.success[500]} />
                          </View>
                          <Text style={styles.tipText}>Complete KYC verification for more jobs</Text>
                        </View>
                        <View style={styles.tipItem}>
                          <View style={styles.tipIconContainer}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.success[500]} />
                          </View>
                          <Text style={styles.tipText}>Set competitive hourly rates</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.tipItem}>
                          <View style={styles.tipIconContainer}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.success[500]} />
                          </View>
                          <Text style={styles.tipText}>Provide clear job descriptions</Text>
                        </View>
                        <View style={styles.tipItem}>
                          <View style={styles.tipIconContainer}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.success[500]} />
                          </View>
                          <Text style={styles.tipText}>Set realistic budgets and timelines</Text>
                        </View>
                        <View style={styles.tipItem}>
                          <View style={styles.tipIconContainer}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.success[500]} />
                          </View>
                          <Text style={styles.tipText}>Check worker ratings and reviews</Text>
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </View>
              )}
            </View>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            {currentStep > 0 ? (
              <TouchableOpacity
                onPress={handlePrevious}
                style={styles.navButton}
              >
                <View style={styles.previousButton}>
                  <Text style={styles.previousButtonText}>Previous</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.navButton} />
            )}
            
            <ModernButton
              title={isLastStep ? 'Get Started' : 'Next'}
              onPress={handleNext}
              style={styles.navButton}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
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
    height: 500,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -120,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    top: 200,
    left: -60,
  },
  circle3: {
    width: 150,
    height: 150,
    top: 400,
    right: 60,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  skipButton: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  skipButtonGradient: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: Typography.fontSize.base,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  progressContainer: {
    marginBottom: Spacing[6],
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing[2],
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  stepContent: {
    flex: 1,
  },
  stepInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: Spacing[6],
  },
  iconGradient: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xl,
  },
  stepTitle: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing[4],
  },
  stepDescription: {
    fontSize: Typography.fontSize.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[5],
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[6],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  tipsCard: {
    width: '100%',
    marginTop: Spacing[4],
  },
  tipsGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    ...Shadows.lg,
  },
  tipsTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[4],
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  tipIconContainer: {
    marginRight: Spacing[2],
  },
  tipText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[700],
    lineHeight: 24,
  },
  navigation: {
    flexDirection: 'row',
    gap: Spacing[3],
    paddingTop: Spacing[4],
  },
  navButton: {
    flex: 1,
  },
  previousButton: {
    height: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  previousButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});