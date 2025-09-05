import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { MockDateTimePicker as DateTimePicker } from '@/components/common/MockDateTimePicker';
import { MockIcon as Icon } from '@/components/common/MockIcon';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';

import { JobFormData, JobsStackParamList } from '@/types';
import { apiService } from '@/services/api';
import { ErrorHandler } from '@/utils/errorHandler';
import { validateJobForm } from '@/utils/validation';

type JobPostScreenNavigationProp = StackNavigationProp<JobsStackParamList, 'JobPost'>;

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

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    category: '',
    budgetMin: 0,
    budgetMax: 0,
    location: '',
    preferredDate: new Date().toISOString(),
    requirements: [],
  });

  const [errors, setErrors] = useState<Partial<JobFormData>>({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newRequirement, setNewRequirement] = useState('');

  const updateFormData = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      updateFormData('preferredDate', selectedDate.toISOString());
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      updateFormData('requirements', [...formData.requirements, newRequirement.trim()]);
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    const updatedRequirements = formData.requirements.filter((_, i) => i !== index);
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

      // Submit job
      await apiService.createJob({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budgetMin: formData.budgetMin,
        budgetMax: formData.budgetMax,
        location: formData.location,
        preferredDate: formData.preferredDate,
        requirements: formData.requirements,
      });

      Alert.alert(
        'Success',
        'Your job has been posted successfully!',
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
      setLoading(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Post a Job</Text>
            <Text style={styles.subtitle}>
              Describe your project to find the right worker
            </Text>
          </View>

          {/* Job Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Job Title *</Text>
            <TextInput
              style={[styles.input, errors.title ? styles.inputError : null]}
              placeholder="e.g., Fix kitchen sink leak"
              value={formData.title}
              onChangeText={(text) => updateFormData('title', text)}
              maxLength={100}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryGrid}>
              {JOB_CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
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
          <View style={styles.section}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.textArea, errors.description ? styles.inputError : null]}
              placeholder="Describe the work that needs to be done, including any specific requirements or preferences..."
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {formData.description.length}/1000 characters
            </Text>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Budget Range */}
          <View style={styles.section}>
            <Text style={styles.label}>Budget Range *</Text>
            <View style={styles.budgetRow}>
              <View style={styles.budgetInput}>
                <Text style={styles.budgetLabel}>Minimum ($)</Text>
                <TextInput
                  style={[styles.input, errors.budgetMin ? styles.inputError : null]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={formData.budgetMin > 0 ? formData.budgetMin.toString() : ''}
                  onChangeText={(text) => updateFormData('budgetMin', parseInt(text) || 0)}
                />
              </View>
              <View style={styles.budgetInput}>
                <Text style={styles.budgetLabel}>Maximum ($)</Text>
                <TextInput
                  style={[styles.input, errors.budgetMax ? styles.inputError : null]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={formData.budgetMax > 0 ? formData.budgetMax.toString() : ''}
                  onChangeText={(text) => updateFormData('budgetMax', parseInt(text) || 0)}
                />
              </View>
            </View>
            {(errors.budgetMin || errors.budgetMax) && (
              <Text style={styles.errorText}>
                {errors.budgetMin || errors.budgetMax}
              </Text>
            )}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Location *</Text>
            <AddressAutocomplete
              value={formData.location}
              onChangeText={(text) => updateFormData('location', text)}
              onAddressSelect={(address) => {
                updateFormData('location', address.formattedAddress || address.address);
                // Store coordinates for later use
                updateFormData('latitude', address.coordinates.latitude);
                updateFormData('longitude', address.coordinates.longitude);
              }}
              placeholder="Enter address, city, or zip code"
              style={[errors.location ? styles.inputError : null]}
            />
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>

          {/* Preferred Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Preferred Start Date *</Text>
            <TouchableOpacity
              style={[styles.dateButton, errors.preferredDate ? styles.inputError : null]}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="event" size={20} color="#666" />
              <Text style={styles.dateButtonText}>
                {formatDate(formData.preferredDate)}
              </Text>
              <Icon name="keyboard-arrow-down" size={20} color="#666" />
            </TouchableOpacity>
            {errors.preferredDate && <Text style={styles.errorText}>{errors.preferredDate}</Text>}
          </View>

          {/* Requirements */}
          <View style={styles.section}>
            <Text style={styles.label}>Requirements (Optional)</Text>
            <Text style={styles.helperText}>
              Add specific requirements or qualifications for this job
            </Text>
            
            <View style={styles.requirementInput}>
              <TextInput
                style={styles.input}
                placeholder="e.g., Must have own tools"
                value={newRequirement}
                onChangeText={setNewRequirement}
                onSubmitEditing={addRequirement}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={addRequirement}
                disabled={!newRequirement.trim()}
              >
                <Icon name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {formData.requirements.length > 0 && (
              <View style={styles.requirementsList}>
                {formData.requirements.map((requirement, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <Text style={styles.requirementText}>{requirement}</Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeRequirement(index)}
                    >
                      <Icon name="close" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Posting Job...' : 'Post Job'}
            </Text>
          </TouchableOpacity>
        </View>

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
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#F44336',
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
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetInput: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
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
  requirementInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementsList: {
    marginTop: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  removeButton: {
    padding: 4,
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

export default JobPostScreen;