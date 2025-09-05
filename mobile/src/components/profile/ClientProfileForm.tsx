import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { ClientProfile } from '@/types';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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

      <Button
        title="Save Profile"
        onPress={handleSave}
        style={styles.saveButton}
        disabled={isLoading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  saveButton: {
    margin: 20,
  },
});