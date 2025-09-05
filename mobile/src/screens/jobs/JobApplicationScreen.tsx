import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { MockDateTimePicker as DateTimePicker } from '@/components/common/MockDateTimePicker';
import { MockIcon as Icon } from '@/components/common/MockIcon';

import { Job, JobsStackParamList } from '@/types';
import { apiService } from '@/services/api';
import { ErrorHandler } from '@/utils/errorHandler';

type JobApplicationScreenRouteProp = RouteProp<JobsStackParamList, 'JobApplication'>;
type JobApplicationScreenNavigationProp = StackNavigationProp<JobsStackParamList, 'JobApplication'>;

interface ApplicationFormData {
  message: string;
  proposedRate: number;
  proposedStartDate: string;
}

interface ApplicationFormErrors {
  message?: string;
  proposedRate?: string;
  proposedStartDate?: string;
}

function JobApplicationScreen() {
  const navigation = useNavigation<JobApplicationScreenNavigationProp>();
  const route = useRoute<JobApplicationScreenRouteProp>();
  const { jobId } = route.params;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState<ApplicationFormData>({
    message: '',
    proposedRate: 0,
    proposedStartDate: new Date().toISOString(),
  });

  const [errors, setErrors] = useState<ApplicationFormErrors>({});

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const jobData = await apiService.getJob(jobId);
      setJob(jobData);
      // Set initial proposed rate to job's minimum budget
      setFormData(prev => ({ ...prev, proposedRate: jobData.budgetMin }));
    } catch (error) {
      ErrorHandler.handle(error);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof ApplicationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof ApplicationFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      updateFormData('proposedStartDate', selectedDate.toISOString());
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ApplicationFormErrors = {};

    if (!formData.message.trim()) {
      newErrors.message = 'Please provide a message explaining why you\'re the right fit';
    } else if (formData.message.length < 50) {
      newErrors.message = 'Message should be at least 50 characters long';
    }

    if (!formData.proposedRate || formData.proposedRate <= 0) {
      newErrors.proposedRate = 'Please enter a valid rate';
    } else if (job && formData.proposedRate > job.budgetMax * 1.5) {
      newErrors.proposedRate = 'Proposed rate is significantly higher than budget range';
    }

    const startDate = new Date(formData.proposedStartDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      newErrors.proposedStartDate = 'Start date cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      await apiService.applyToJob(jobId, {
        message: formData.message,
        proposedRate: formData.proposedRate,
        proposedStartDate: formData.proposedStartDate,
      });

      Alert.alert(
        'Application Submitted',
        'Your application has been sent to the client. You\'ll be notified if they\'re interested.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      ErrorHandler.handle(error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatBudget = (min: number, max: number) => {
    return `$${min} - $${max}`;
  };

  if (loading || !job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Job Summary */}
          <View style={styles.jobSummary}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobCategory}>{job.category}</Text>
            <View style={styles.jobDetails}>
              <View style={styles.detailRow}>
                <Icon name="attach-money" size={16} color="#4CAF50" />
                <Text style={styles.budget}>{formatBudget(job.budgetMin, job.budgetMax)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="location-on" size={16} color="#2196F3" />
                <Text style={styles.location}>{job.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="schedule" size={16} color="#FF9800" />
                <Text style={styles.preferredDate}>
                  Preferred: {formatDate(job.preferredDate)}
                </Text>
              </View>
            </View>
          </View>

          {/* Application Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Application</Text>

            {/* Cover Message */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Cover Message *</Text>
              <Text style={styles.helperText}>
                Explain why you're the right person for this job. Include relevant experience and qualifications.
              </Text>
              <TextInput
                style={[styles.textArea, errors.message ? styles.inputError : null]}
                placeholder="Hi! I'm interested in your job posting. I have experience with..."
                value={formData.message}
                onChangeText={(text) => updateFormData('message', text)}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                maxLength={1000}
              />
              <View style={styles.characterCountRow}>
                <Text style={styles.characterCount}>
                  {formData.message.length}/1000 characters
                </Text>
                <Text style={styles.minimumLength}>
                  Minimum 50 characters
                </Text>
              </View>
              {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
            </View>

            {/* Proposed Rate */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Rate *</Text>
              <Text style={styles.helperText}>
                Budget range: {formatBudget(job.budgetMin, job.budgetMax)}
              </Text>
              <View style={styles.rateInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.rateInput, errors.proposedRate ? styles.inputError : null]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={formData.proposedRate > 0 ? formData.proposedRate.toString() : ''}
                  onChangeText={(text) => updateFormData('proposedRate', parseInt(text) || 0)}
                />
                <Text style={styles.rateLabel}>total</Text>
              </View>
              {formData.proposedRate > 0 && (
                <View style={styles.rateComparison}>
                  {formData.proposedRate < job.budgetMin && (
                    <Text style={styles.rateBelowBudget}>
                      ⚠️ Below minimum budget
                    </Text>
                  )}
                  {formData.proposedRate >= job.budgetMin && formData.proposedRate <= job.budgetMax && (
                    <Text style={styles.rateInBudget}>
                      ✅ Within budget range
                    </Text>
                  )}
                  {formData.proposedRate > job.budgetMax && formData.proposedRate <= job.budgetMax * 1.2 && (
                    <Text style={styles.rateAboveBudget}>
                      ⚠️ Above maximum budget
                    </Text>
                  )}
                  {formData.proposedRate > job.budgetMax * 1.2 && (
                    <Text style={styles.rateWayAboveBudget}>
                      ❌ Significantly above budget
                    </Text>
                  )}
                </View>
              )}
              {errors.proposedRate && <Text style={styles.errorText}>{errors.proposedRate}</Text>}
            </View>

            {/* Proposed Start Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>When can you start? *</Text>
              <Text style={styles.helperText}>
                Client prefers: {formatDate(job.preferredDate)}
              </Text>
              <TouchableOpacity
                style={[styles.dateButton, errors.proposedStartDate ? styles.inputError : null]}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="event" size={20} color="#666" />
                <Text style={styles.dateButtonText}>
                  {formatDate(formData.proposedStartDate)}
                </Text>
                <Icon name="keyboard-arrow-down" size={20} color="#666" />
              </TouchableOpacity>
              {errors.proposedStartDate && (
                <Text style={styles.errorText}>{errors.proposedStartDate}</Text>
              )}
            </View>

            {/* Application Tips */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>💡 Tips for a strong application:</Text>
              <Text style={styles.tipItem}>• Highlight relevant experience and skills</Text>
              <Text style={styles.tipItem}>• Mention any certifications or licenses</Text>
              <Text style={styles.tipItem}>• Be specific about your approach to the job</Text>
              <Text style={styles.tipItem}>• Ask clarifying questions if needed</Text>
              <Text style={styles.tipItem}>• Be professional and courteous</Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting Application...' : 'Submit Application'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={new Date(formData.proposedStartDate)}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  jobSummary: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  jobCategory: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: 12,
  },
  jobDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budget: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 4,
  },
  location: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 4,
  },
  preferredDate: {
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 120,
  },
  inputError: {
    borderColor: '#F44336',
  },
  characterCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
  },
  minimumLength: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 4,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  rateInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    borderWidth: 0,
  },
  rateLabel: {
    fontSize: 14,
    color: '#666',
  },
  rateComparison: {
    marginTop: 8,
  },
  rateBelowBudget: {
    fontSize: 14,
    color: '#FF9800',
  },
  rateInBudget: {
    fontSize: 14,
    color: '#4CAF50',
  },
  rateAboveBudget: {
    fontSize: 14,
    color: '#FF9800',
  },
  rateWayAboveBudget: {
    fontSize: 14,
    color: '#F44336',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  tipsContainer: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default JobApplicationScreen;