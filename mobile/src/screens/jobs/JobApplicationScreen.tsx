import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '@/components/ui/ModernCard';

import { Job, JobsStackParamList } from '@/types';
import { apiService } from '@/services/api';
import { ErrorHandler } from '@/utils/errorHandler';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/styles/DesignSystem';

const { height } = Dimensions.get('window');

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

  // Animation refs (disabled - set to final values)
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [formData, setFormData] = useState<ApplicationFormData>({
    message: '',
    proposedRate: 0,
    proposedStartDate: new Date().toISOString(),
  });

  const [errors, setErrors] = useState<ApplicationFormErrors>({});

  useEffect(() => {
    // Animations disabled for stability
    // Animated.parallel([
    //   Animated.timing(fadeAnim, {
    //     toValue: 1,
    //     duration: 600,
    //     useNativeDriver: true,
    //   }),
    //   Animated.timing(slideAnim, {
    //     toValue: 0,
    //     duration: 500,
    //     useNativeDriver: true,
    //   }),
    //   Animated.timing(scaleAnim, {
    //     toValue: 1,
    //     duration: 600,
    //     useNativeDriver: true,
    //   }),
    // ]).start();
  }, []);

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53', '#FFA07A']}
        style={styles.gradientBackground}
      >
        {/* Decorative Circles */}
        <View style={[styles.decorativeCircle, { width: 200, height: 200, top: -50, right: -50 }]} />
        <View style={[styles.decorativeCircle, { width: 150, height: 150, top: 80, left: -40 }]} />
        <View style={[styles.decorativeCircle, { width: 120, height: 120, bottom: -20, right: 60 }]} />

        {/* Header with Back Button */}
        <SafeAreaView edges={['top']}>
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <View style={styles.iconBadge}>
                <Ionicons name="document-text" size={24} color="#FF6B6B" />
              </View>
              <Text style={styles.headerTitle}>Apply for Job</Text>
            </View>

            <View style={{ width: 44 }} />
          </Animated.View>

          {/* Job Info Stats */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.statCard}>
              <Ionicons name="cash" size={20} color="#34C759" />
              <Text style={styles.statValue}>{formatBudget(job.budgetMin, job.budgetMax)}</Text>
              <Text style={styles.statLabel}>Budget</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="location" size={20} color="#007AFF" />
              <Text style={styles.statValue} numberOfLines={1}>{job.location}</Text>
              <Text style={styles.statLabel}>Location</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="time" size={20} color="#FF9500" />
              <Text style={styles.statValue}>
                {job.preferredDate
                  ? new Date(job.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Flexible'}
              </Text>
              <Text style={styles.statLabel}>Start Date</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content Card */}
      <Animated.View
        style={[
          styles.contentCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Job Title Card */}
            <ModernCard variant="elevated" style={styles.jobTitleCard}>
              <View style={styles.jobHeaderContainer}>
                <View style={styles.jobIconBadge}>
                  <Ionicons name="briefcase" size={24} color="#007AFF" />
                </View>
                <View style={styles.jobHeaderText}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{job.category}</Text>
                  </View>
                </View>
              </View>
            </ModernCard>

            {/* Cover Message */}
            <ModernCard variant="elevated" style={styles.formSection}>
              <View style={styles.labelContainer}>
                <View style={styles.formIconBadge}>
                  <Ionicons name="chatbubble" size={18} color="#007AFF" />
                </View>
                <Text style={styles.modernLabel}>Cover Message</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              </View>
              <Text style={styles.modernHelperText}>
                Tell the client why you're perfect for this job. Be specific about your experience and approach.
              </Text>
              <View style={[styles.modernInputContainer, errors.message ? styles.inputError : null]}>
                <TextInput
                  style={styles.modernTextArea}
                  placeholder="Hi! I'm excited about this opportunity because..."
                  placeholderTextColor="#8E8E93"
                  value={formData.message}
                  onChangeText={(text) => updateFormData('message', text)}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={1000}
                />
              </View>
              <View style={styles.inputFooter}>
                <Text style={[styles.characterCount, formData.message.length < 50 ? styles.warningText : null]}>
                  {formData.message.length}/1000 • Min 50 characters
                </Text>
              </View>
              {errors.message && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                  <Text style={styles.errorText}>{errors.message}</Text>
                </View>
              )}
            </ModernCard>

            {/* Proposed Rate */}
            <ModernCard variant="elevated" style={styles.formSection}>
              <View style={styles.labelContainer}>
                <View style={styles.formIconBadge}>
                  <Ionicons name="cash" size={18} color="#34C759" />
                </View>
                <Text style={styles.modernLabel}>Your Rate</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              </View>
              <Text style={styles.modernHelperText}>
                Client's budget: {formatBudget(job.budgetMin, job.budgetMax)}
              </Text>
              
              <View style={[styles.rateCard, errors.proposedRate ? styles.inputError : null]}>
                <View style={styles.rateInputRow}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.modernRateInput}
                    placeholder="Enter amount"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                    value={formData.proposedRate > 0 ? formData.proposedRate.toString() : ''}
                    onChangeText={(text) => updateFormData('proposedRate', parseInt(text) || 0)}
                  />
                  <Text style={styles.totalText}>total</Text>
                </View>
                
                {formData.proposedRate > 0 && (
                  <View style={styles.rateAnalysis}>
                    {formData.proposedRate < job.budgetMin && (
                      <View style={styles.rateStatus}>
                        <Ionicons name="warning" size={16} color="#FF9500" />
                        <Text style={styles.rateBelowBudget}>Below client's minimum budget</Text>
                      </View>
                    )}
                    {formData.proposedRate >= job.budgetMin && formData.proposedRate <= job.budgetMax && (
                      <View style={styles.rateStatus}>
                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                        <Text style={styles.rateInBudget}>Perfect! Within client's budget</Text>
                      </View>
                    )}
                    {formData.proposedRate > job.budgetMax && formData.proposedRate <= job.budgetMax * 1.2 && (
                      <View style={styles.rateStatus}>
                        <Ionicons name="information-circle" size={16} color="#FF9500" />
                        <Text style={styles.rateAboveBudget}>Above client's maximum budget</Text>
                      </View>
                    )}
                    {formData.proposedRate > job.budgetMax * 1.2 && (
                      <View style={styles.rateStatus}>
                        <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                        <Text style={styles.rateWayAboveBudget}>Significantly above budget</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              
              {errors.proposedRate && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                  <Text style={styles.errorText}>{errors.proposedRate}</Text>
                </View>
              )}
            </ModernCard>

            {/* Start Date */}
            <ModernCard variant="elevated" style={styles.formSection}>
              <View style={styles.labelContainer}>
                <View style={styles.formIconBadge}>
                  <Ionicons name="calendar" size={18} color="#FF9500" />
                </View>
                <Text style={styles.modernLabel}>Start Date</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              </View>
              <Text style={styles.modernHelperText}>
                Client prefers: {new Date(job.preferredDate).toLocaleDateString()}
              </Text>
              
              <TouchableOpacity
                style={[styles.modernDateButton, errors.proposedStartDate ? styles.inputError : null]}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.dateContent}>
                  <Ionicons name="calendar" size={20} color="#007AFF" />
                  <Text style={styles.modernDateText}>
                    {new Date(formData.proposedStartDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={24} color="#8E8E93" />
              </TouchableOpacity>
              
              {errors.proposedStartDate && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                  <Text style={styles.errorText}>{errors.proposedStartDate}</Text>
                </View>
              )}
            </ModernCard>

            {/* Pro Tips */}
            <ModernCard variant="elevated" style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <View style={styles.formIconBadge}>
                  <Ionicons name="bulb" size={20} color="#FF9500" />
                </View>
                <Text style={styles.tipsTitle}>Pro Tips</Text>
              </View>
              <View style={styles.tipsList}>
                <View style={styles.tip}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>Highlight specific relevant experience</Text>
                </View>
                <View style={styles.tip}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>Mention any certifications or portfolio</Text>
                </View>
                <View style={styles.tip}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>Ask thoughtful questions about the project</Text>
                </View>
                <View style={styles.tip}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>Be professional and enthusiastic</Text>
                </View>
              </View>
            </ModernCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Submit Button */}
      <View style={styles.submitFooter}>
        <TouchableOpacity
          style={[styles.modernSubmitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {submitting ? (
              <View style={styles.submitButtonContent}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </View>
            ) : (
              <View style={styles.submitButtonContent}>
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Application</Text>
              </View>
            )}
          </LinearGradient>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
  },

  // Gradient Header
  gradientBackground: {
    paddingBottom: Spacing[4],
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[4],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[2],
    ...Shadows.lg,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    gap: Spacing[2],
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[1],
  },
  statValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium as any,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },

  // Content Card
  contentCard: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: Spacing[3],
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing[4],
    paddingBottom: Spacing[2],
  },

  // Job Title Card
  jobTitleCard: {
    marginBottom: Spacing[3],
  },
  jobHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  jobHeaderText: {
    flex: 1,
  },
  jobTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
    letterSpacing: -0.5,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#007AFF',
    letterSpacing: 0.5,
  },

  // Form Section
  formSection: {
    marginBottom: Spacing[3],
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  formIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[2],
    ...Shadows.base,
  },
  modernLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[900],
    flex: 1,
  },
  requiredBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderRadius: BorderRadius.full,
  },
  requiredText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#FF3B30',
  },
  modernHelperText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal as any,
    color: Colors.neutral[600],
    marginBottom: Spacing[2],
    lineHeight: 20,
  },

  // Text Input
  modernInputContainer: {
    backgroundColor: Colors.neutral[50],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
  },
  modernTextArea: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal as any,
    color: Colors.neutral[900],
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing[2],
  },
  characterCount: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.normal as any,
    color: Colors.neutral[500],
  },
  warningText: {
    color: '#FF9500',
    fontWeight: Typography.fontWeight.semibold as any,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.02)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[2],
    gap: Spacing[1],
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: '#FF3B30',
  },

  // Rate Card
  rateCard: {
    backgroundColor: Colors.neutral[50],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
  },
  rateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  dollarSign: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: '#34C759',
    marginRight: Spacing[2],
  },
  modernRateInput: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    flex: 1,
    padding: 0,
  },
  totalText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.neutral[500],
  },
  rateAnalysis: {
    marginTop: Spacing[2],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  rateStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[2],
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.lg,
  },
  rateBelowBudget: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: '#FF9500',
  },
  rateInBudget: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: '#34C759',
  },
  rateAboveBudget: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: '#FF9500',
  },
  rateWayAboveBudget: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: '#FF3B30',
  },

  // Date Picker
  modernDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  modernDateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.neutral[900],
  },

  // Tips Card
  tipsCard: {
    marginBottom: Spacing[4],
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  tipsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.neutral[900],
    flex: 1,
    marginLeft: Spacing[2],
  },
  tipsList: {
    gap: Spacing[2],
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9500',
    marginTop: 8,
  },
  tipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal as any,
    color: Colors.neutral[700],
    lineHeight: 22,
    flex: 1,
  },

  // Submit Button
  submitFooter: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.neutral[50],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  modernSubmitButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  submitGradient: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[4],
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  submitButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});

export default JobApplicationScreen;