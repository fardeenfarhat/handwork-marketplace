import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { AuthStackParamList } from '@/types';
import { AppDispatch } from '@/store';
import { setOnboardingCompleted } from '@/store/slices/authSlice';
import Button from '@/components/common/Button';

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
    icon: 'handshake',
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
  
  const { role } = route.params;
  
  console.log('🎯 ONBOARDING SCREEN: Component mounted');
  console.log('🎭 Role from params:', role);
  const [currentStep, setCurrentStep] = useState(0);
  
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
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Welcome {role === 'client' ? 'Client' : 'Worker'}!
          </Text>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Step Content */}
        <ScrollView
          contentContainerStyle={styles.stepContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: `${currentStepData.color}20` }]}>
              <Ionicons
                name={currentStepData.icon}
                size={64}
                color={currentStepData.color}
              />
            </View>
          </View>

          <Text style={styles.stepTitle}>{currentStepData.title}</Text>
          <Text style={styles.stepDescription}>{currentStepData.description}</Text>

          {/* Role-specific tips */}
          {role === 'worker' && currentStep === 0 && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Pro Tips:</Text>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.tipText}>Upload high-quality portfolio images</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.tipText}>Complete KYC verification for more jobs</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.tipText}>Set competitive hourly rates</Text>
              </View>
            </View>
          )}

          {role === 'client' && currentStep === 0 && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Best Practices:</Text>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.tipText}>Provide clear job descriptions</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.tipText}>Set realistic budgets and timelines</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.tipText}>Check worker ratings and reviews</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          <Button
            title="Previous"
            variant="outline"
            onPress={handlePrevious}
            disabled={currentStep === 0}
            style={[styles.navButton, styles.previousButton]}
          />
          
          <Button
            title={isLastStep ? 'Get Started' : 'Next'}
            onPress={handleNext}
            style={[styles.navButton, styles.nextButton]}
          />
        </View>
      </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
  },
  navButton: {
    flex: 1,
  },
  previousButton: {
    // Additional styles for previous button if needed
  },
  nextButton: {
    // Additional styles for next button if needed
  },
});