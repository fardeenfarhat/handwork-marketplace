import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkerProfile, ClientProfile } from '@/types';

interface ProfileProgressProps {
  profile: Partial<WorkerProfile> | Partial<ClientProfile>;
  userType: 'worker' | 'client';
  onStepPress?: (step: string) => void;
}

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export default function ProfileProgress({
  profile,
  userType,
  onStepPress,
}: ProfileProgressProps) {
  const getWorkerSteps = (workerProfile: Partial<WorkerProfile>): ProgressStep[] => [
    {
      id: 'basic_info',
      title: 'Basic Information',
      description: 'Add bio, location, and hourly rate',
      completed: !!(workerProfile.bio && workerProfile.location && workerProfile.hourlyRate),
      required: true,
    },
    {
      id: 'skills',
      title: 'Skills & Categories',
      description: 'Select your skills and service categories',
      completed: !!(workerProfile.skills?.length && workerProfile.serviceCategories?.length),
      required: true,
    },
    {
      id: 'kyc',
      title: 'Identity Verification',
      description: 'Upload ID documents for verification',
      completed: workerProfile.kycStatus === 'approved',
      required: true,
    },
    {
      id: 'portfolio',
      title: 'Portfolio Images',
      description: 'Showcase your work with photos',
      completed: !!(workerProfile.portfolioImages?.length),
      required: false,
    },
  ];

  const getClientSteps = (clientProfile: Partial<ClientProfile>): ProgressStep[] => [
    {
      id: 'basic_info',
      title: 'Basic Information',
      description: 'Add description and location',
      completed: !!(clientProfile.description && clientProfile.location),
      required: true,
    },
    {
      id: 'company_info',
      title: 'Company Information',
      description: 'Add company name (optional)',
      completed: true, // This is optional, so always considered complete
      required: false,
    },
  ];

  const steps = userType === 'worker' 
    ? getWorkerSteps(profile as Partial<WorkerProfile>)
    : getClientSteps(profile as Partial<ClientProfile>);

  const completedSteps = steps.filter(step => step.completed).length;
  const requiredSteps = steps.filter(step => step.required);
  const completedRequiredSteps = requiredSteps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;
  const isProfileComplete = completedRequiredSteps === requiredSteps.length;

  const getStepIcon = (step: ProgressStep) => {
    if (step.completed) {
      return <Ionicons name="checkmark-circle" size={24} color="#34C759" />;
    } else if (step.required) {
      return <Ionicons name="ellipse-outline" size={24} color="#FF9500" />;
    } else {
      return <Ionicons name="ellipse-outline" size={24} color="#ccc" />;
    }
  };

  const getStepTextColor = (step: ProgressStep) => {
    if (step.completed) {
      return '#34C759';
    } else if (step.required) {
      return '#333';
    } else {
      return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile Completion</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {completedSteps}/{steps.length} completed
          </Text>
        </View>
      </View>

      {!isProfileComplete && (
        <View style={styles.statusContainer}>
          <Ionicons name="information-circle" size={20} color="#FF9500" />
          <Text style={styles.statusText}>
            Complete all required steps to start {userType === 'worker' ? 'finding jobs' : 'posting jobs'}
          </Text>
        </View>
      )}

      {isProfileComplete && (
        <View style={[styles.statusContainer, styles.completeContainer]}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={[styles.statusText, styles.completeText]}>
            Profile complete! You can now {userType === 'worker' ? 'browse and apply for jobs' : 'post jobs and hire workers'}
          </Text>
        </View>
      )}

      <View style={styles.stepsList}>
        {steps.map((step, index) => (
          <TouchableOpacity
            key={step.id}
            style={styles.stepItem}
            onPress={() => onStepPress?.(step.id)}
            disabled={!onStepPress}
          >
            <View style={styles.stepIcon}>
              {getStepIcon(step)}
            </View>
            
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { color: getStepTextColor(step) }]}>
                  {step.title}
                  {step.required && !step.completed && (
                    <Text style={styles.requiredIndicator}> *</Text>
                  )}
                </Text>
                {onStepPress && (
                  <Ionicons 
                    name="chevron-forward" 
                    size={16} 
                    color="#ccc" 
                  />
                )}
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          * Required steps must be completed
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  completeContainer: {
    backgroundColor: '#F0F9F0',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9500',
    lineHeight: 18,
  },
  completeText: {
    color: '#34C759',
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  stepIcon: {
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  requiredIndicator: {
    color: '#FF3B30',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});