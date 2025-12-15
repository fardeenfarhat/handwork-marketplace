import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { ClientProfile } from '@/types';
import { ModernButton } from '@/components/ui/ModernButton';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';

interface ClientProfileFormProps {
  profile?: Partial<ClientProfile>;
  onSave: (profile: Partial<ClientProfile>) => Promise<void>;
  isLoading?: boolean;
}

export default function ClientProfileForm({
  profile = {},
  onSave,
  isLoading = false,
}: ClientProfileFormProps) {
  const [formData, setFormData] = useState({
    companyName: profile.companyName || '',
    description: profile.description || '',
    location: profile.location || '',
  });

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        companyName: profile.companyName || '',
        description: profile.description || '',
        location: profile.location || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!formData.location.trim()) {
      Alert.alert('Error', 'Please enter your location');
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Name (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Your company or business name"
          value={formData.companyName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, companyName: text }))}
        />
        <Text style={styles.helpText}>
          Leave blank if you're hiring as an individual
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About You/Your Business</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Tell workers about yourself, your business, and the types of projects you typically need help with..."
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="City, State"
          value={formData.location}
          onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
        />
        <Text style={styles.helpText}>
          This helps workers find jobs in their area
        </Text>
      </View>

      <ModernButton
        title="Save Profile"
        onPress={handleSave}
        style={styles.saveButton}
        loading={isLoading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Spacing[3],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700' as const,
    marginBottom: Spacing[3],
    color: Colors.neutral[900],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontSize: Typography.fontSize.base,
    backgroundColor: Colors.neutral[50],
    color: Colors.neutral[900],
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontSize: Typography.fontSize.base,
    backgroundColor: Colors.neutral[50],
    color: Colors.neutral[900],
    minHeight: 120,
  },
  helpText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginTop: Spacing[2],
    fontStyle: 'italic',
  },
  saveButton: {
    marginHorizontal: Spacing[5],
    marginVertical: Spacing[5],
  },
});