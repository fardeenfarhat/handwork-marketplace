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
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';

import { JobFormData, JobsStackParamList } from '@/types';
import { apiService } from '@/services/api';
import { ErrorHandler } from '@/utils/errorHandler';
import { validateJobForm } from '@/utils/validation';
import { formatDate } from '@/utils/helpers';

const { width } = Dimensions.get('window');

type JobPostScreenNavigationProp = StackNavigationProp<
  JobsStackParamList,
  'JobPost'
>;

type JobPostScreenRouteProp = RouteProp<JobsStackParamList, 'JobPost'>;

const JOB_CATEGORIES = [
  'construction',
  'cleaning',
  'plumbing',
  'electrical',
  'hvac',
  'landscaping',
  'painting',
  'carpentry',
  'roofing',
  'flooring',
  'other',
];

function JobPostScreen() {
  const navigation = useNavigation<JobPostScreenNavigationProp>();
  const route = useRoute<JobPostScreenRouteProp>();
  const { jobId, isEdit } = route.params || {};

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    category: '',
    budgetMin: 0,
    budgetMax: 0,
    location: '',
    preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default to tomorrow
    requirements: [],
  });

  const [errors, setErrors] = useState<Partial<JobFormData>>({});
  const [loading, setLoading] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newRequirement, setNewRequirement] = useState('');

  // Load job data for editing
  useEffect(() => {
    if (isEdit && jobId) {
      loadJobData();
    }
  }, [isEdit, jobId]);

  const loadJobData = async () => {
    try {
      setLoadingJob(true);
      const jobData = await apiService.getJob(jobId!);
      
      // Convert job data to form format
      setFormData({
        title: jobData.title,
        description: jobData.description,
        category: jobData.category,
        budgetMin: jobData.budgetMin,
        budgetMax: jobData.budgetMax,
        location: jobData.location,
        latitude: jobData.latitude,
        longitude: jobData.longitude,
        preferredDate: jobData.preferredDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        requirements: jobData.requirements || [],
      });
    } catch (error) {
      console.error('Failed to load job for editing:', error);
      Alert.alert('Error', 'Could not load job data for editing.');
      navigation.goBack();
    } finally {
      setLoadingJob(false);
    }
  };

  const updateFormData = (field: keyof JobFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Ensure the date is properly formatted for the backend
      const isoString = selectedDate.toISOString();
      console.log('📅 Date selected:', selectedDate, 'ISO:', isoString);
      updateFormData('preferredDate', isoString);
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      updateFormData('requirements', [
        ...formData.requirements,
        newRequirement.trim(),
      ]);
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    const updatedRequirements = formData.requirements.filter(
      (_, i) => i !== index
    );
    updateFormData('requirements', updatedRequirements);
  };

  const handleSubmit = async () => {
    try {
      // Validate form
      const validationErrors = validateJobForm(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setLoading(true);

      // Prepare job data
      const jobData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budgetMin: formData.budgetMin,
        budgetMax: formData.budgetMax,
        location: formData.location,
        preferredDate: formData.preferredDate,
        requirements: formData.requirements,
      };

      console.log(
        '🔧 JOB POST: Submitting job data:',
        JSON.stringify(jobData, null, 2)
      );

      // Submit job (create or update)
      if (isEdit && jobId) {
        await apiService.updateJob(jobId, jobData);
      } else {
        await apiService.createJob(jobData);
      }

      Alert.alert('Success', isEdit ? 'Your job has been updated successfully!' : 'Your job has been posted successfully!', [
        {
          text: 'View My Jobs',
          onPress: () => {
            // Navigate specifically to JobManagement to see the new job
            navigation.navigate('JobManagement', { 
              refresh: true,
              initialTab: 'posted' 
            });
          },
        },
      ]);
    } catch (error) {
      ErrorHandler.handle(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loadingJob) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Background Gradient */}
        <LinearGradient
          colors={['#11998E', '#38EF7D', '#06B49A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading job data...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#11998E', '#38EF7D', '#06B49A']}
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
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconBadge}>
                <LinearGradient
                  colors={['#FFFFFF', '#F8F9FA']}
                  style={styles.headerIconGradient}
                >
                  <Icon name={isEdit ? "create-outline" : "add-circle-outline"} size={28} color="#11998E" />
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isEdit ? 'Edit Job' : 'Post a Job'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isEdit ? 'Update job details' : 'Create a new job posting'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionButton} onPress={() => navigation.goBack()}>
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Main Content Card */}
        <View style={styles.mainContentCard}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Helper Banner */}
              <View style={styles.helperBanner}>
                <View style={styles.helperIconContainer}>
                  <LinearGradient
                    colors={['#11998E', '#38EF7D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.helperIconGradient}
                  >
                    <Icon name="bulb-outline" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.helperText}>
                  Describe your project clearly to attract the right professionals
                </Text>
              </View>

              {/* Job Title */}
              <View style={styles.sectionGlass}>
                <Text style={styles.labelGlass}>Job Title *</Text>
                <View style={styles.inputGlass}>
                  <TextInput
                    style={[styles.input, errors.title ? styles.inputError : null]}
                    placeholder="e.g., Fix kitchen sink leak"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={formData.title}
                    onChangeText={(text) => updateFormData('title', text)}
                    maxLength={100}
                  />
                </View>
                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
              </View>

              {/* Category */}
              <View style={styles.sectionGlass}>
                <Text style={styles.labelGlass}>Category *</Text>
                <View style={styles.categoryGrid}>
                  {JOB_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChipGlass,
                        formData.category === category && styles.categoryChipSelected,
                      ]}
                      onPress={() => updateFormData('category', category)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          formData.category === category && styles.categoryChipTextSelected,
                        ]}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
              </View>

              {/* Description */}
              <View style={styles.sectionGlass}>
                <Text style={styles.labelGlass}>Description *</Text>
                <View style={styles.textAreaGlass}>
                  <TextInput
                    style={[styles.textArea, errors.description ? styles.inputError : null]}
                    placeholder="Describe the work that needs to be done, including any specific requirements or preferences..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={formData.description}
                    onChangeText={(text) => updateFormData('description', text)}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={1000}
                  />
                </View>
                <Text style={styles.characterCount}>{formData.description.length}/1000 characters</Text>
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
              </View>

              {/* Budget Range */}
              <View style={styles.sectionGlass}>
                <Text style={styles.labelGlass}>Budget Range *</Text>
                <View style={styles.budgetRow}>
                  <View style={styles.budgetInput}>
                    <Text style={styles.budgetLabel}>Minimum ($)</Text>
                    <View style={styles.inputGlass}>
                      <TextInput
                        style={[styles.input, errors.budgetMin ? styles.inputError : null]}
                        placeholder="0"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        keyboardType="numeric"
                        value={formData.budgetMin > 0 ? formData.budgetMin.toString() : ''}
                        onChangeText={(text) => updateFormData('budgetMin', parseInt(text) || 0)}
                      />
                    </View>
                  </View>
                  <View style={styles.budgetInput}>
                    <Text style={styles.budgetLabel}>Maximum ($)</Text>
                    <View style={styles.inputGlass}>
                      <TextInput
                        style={[styles.input, errors.budgetMax ? styles.inputError : null]}
                        placeholder="0"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        keyboardType="numeric"
                        value={formData.budgetMax > 0 ? formData.budgetMax.toString() : ''}
                        onChangeText={(text) => updateFormData('budgetMax', parseInt(text) || 0)}
                      />
                    </View>
                  </View>
                </View>
                {(errors.budgetMin || errors.budgetMax) && <Text style={styles.errorText}>{errors.budgetMin || errors.budgetMax}</Text>}
              </View>

              {/* Location */}
              <View style={styles.sectionGlass}>
                <Text style={styles.labelGlass}>Location *</Text>
                <View style={styles.inputGlass}>
                  <AddressAutocomplete
                    value={formData.location}
                    onChangeText={(text) => updateFormData('location', text)}
                    onAddressSelect={(address) => {
                      updateFormData('location', address.formattedAddress || address.address);
                      updateFormData('latitude', address.coordinates.latitude);
                      updateFormData('longitude', address.coordinates.longitude);
                    }}
                    placeholder="Enter address, city, or zip code"
                    style={[errors.location ? styles.inputError : null]}
                  />
                </View>
                {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
              </View>

              {/* Preferred Date */}
              <View style={styles.sectionGlass}>
                <Text style={styles.labelGlass}>Preferred Start Date *</Text>
                <TouchableOpacity
                  style={[styles.dateButtonGlass, errors.preferredDate ? styles.inputError : null]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar" size={20} color="#FFFFFF" />
                  <Text style={styles.dateButtonTextGlass}>{formatDateForDisplay(formData.preferredDate)}</Text>
                  <Icon name="chevron-down" size={20} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
                {errors.preferredDate && <Text style={styles.errorText}>{errors.preferredDate}</Text>}
              </View>

              {/* Requirements */}
              <View style={styles.sectionGlass}>
                <Text style={styles.labelGlass}>Requirements (Optional)</Text>
                <Text style={styles.sectionHelperText}>Add specific requirements or qualifications for this job</Text>
                <View style={styles.requirementInputRow}>
                  <View style={[styles.inputGlass, { flex: 1 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Must have own tools"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={newRequirement}
                      onChangeText={setNewRequirement}
                      onSubmitEditing={addRequirement}
                      returnKeyType="done"
                    />
                  </View>
                  <TouchableOpacity style={styles.addButtonGlass} onPress={addRequirement} disabled={!newRequirement.trim()}>
                    <Icon name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {formData.requirements.length > 0 && (
                  <View style={styles.requirementsList}>
                    {formData.requirements.map((requirement, index) => (
                      <View key={index} style={styles.requirementItemGlass}>
                        <Text style={styles.requirementText}>{requirement}</Text>
                        <TouchableOpacity style={styles.removeButtonGlass} onPress={() => removeRequirement(index)}>
                          <Icon name="close" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.footerGlass}>
              <TouchableOpacity
                style={[styles.submitButtonGlass, loading ? styles.submitButtonDisabled : null]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#11998E', '#38EF7D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? (isEdit ? 'Updating Job...' : 'Posting Job...') : (isEdit ? 'Update Job' : 'Post Job')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={new Date(formData.preferredDate)}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },

  // Background
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: Dimensions.get('window').height * 0.4,
  },

  // Decorative Elements
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Dimensions.get('window').height * 0.4,
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    top: 80,
    left: -40,
  },
  circle3: {
    width: 120,
    height: 120,
    top: 120,
    right: 80,
  },

  safeArea: {
    flex: 1,
  },

  // Header Section
  headerSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconBadge: {
    width: 56,
    height: 56,
    marginRight: Spacing[3],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  headerIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },

  // Main Content Card
  mainContentCard: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.neutral[50],
    paddingTop: Spacing[5],
    marginTop: Spacing[3],
  },

  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing[4],
  },

  // Helper Banner
  helperBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 153, 142, 0.1)',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing[4],
    borderLeftWidth: 3,
    borderLeftColor: '#11998E',
  },
  helperIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    marginRight: Spacing[3],
    overflow: 'hidden',
    ...Shadows.sm,
  },
  helperIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: '#11998E',
    fontWeight: Typography.fontWeight.medium as any,
    lineHeight: 20,
  },

  // Glass Sections
  sectionGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Shadows.base,
  },

  labelGlass: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
  },

  sectionHelperText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[3],
    lineHeight: 20,
  },

  // Input Glass
  inputGlass: {
    backgroundColor: 'rgba(17, 153, 142, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(17, 153, 142, 0.2)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
  },

  input: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    fontWeight: Typography.fontWeight.normal as any,
  },

  textAreaGlass: {
    backgroundColor: 'rgba(17, 153, 142, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(17, 153, 142, 0.2)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    minHeight: 120,
  },

  textArea: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    fontWeight: Typography.fontWeight.normal as any,
    minHeight: 100,
  },

  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },

  characterCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
    textAlign: 'right',
    marginTop: Spacing[1],
  },

  errorText: {
    fontSize: Typography.fontSize.sm,
    color: '#FF3B30',
    marginTop: Spacing[2],
    fontWeight: Typography.fontWeight.medium as any,
  },

  // Category Chips
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  categoryChipGlass: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(17, 153, 142, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(17, 153, 142, 0.2)',
  },
  categoryChipSelected: {
    backgroundColor: '#11998E',
    borderColor: '#11998E',
  },
  categoryChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: '#11998E',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.semibold as any,
  },

  // Budget
  budgetRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  budgetInput: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.neutral[700],
    marginBottom: Spacing[2],
  },

  // Date Button
  dateButtonGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(17, 153, 142, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(17, 153, 142, 0.2)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
  },
  dateButtonTextGlass: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    marginLeft: Spacing[2],
    fontWeight: Typography.fontWeight.normal as any,
  },

  // Requirements
  requirementInputRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    alignItems: 'center',
  },
  addButtonGlass: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: '#11998E',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.base,
  },
  requirementsList: {
    marginTop: Spacing[3],
    gap: Spacing[2],
  },
  requirementItemGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(17, 153, 142, 0.05)',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(17, 153, 142, 0.15)',
  },
  requirementText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[800],
    fontWeight: Typography.fontWeight.normal as any,
  },
  removeButtonGlass: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing[2],
  },

  // Footer & Submit
  footerGlass: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    backgroundColor: Colors.neutral[50],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  submitButtonGlass: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  submitButtonGradient: {
    paddingVertical: Spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing[3],
    fontSize: Typography.fontSize.base,
    color: '#FFFFFF',
    fontWeight: Typography.fontWeight.medium as any,
  },
});

export default JobPostScreen;
