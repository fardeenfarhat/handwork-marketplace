import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkerProfile } from '@/types';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface WorkerProfileFormProps {
  profile?: Partial<WorkerProfile>;
  onSave: (profile: Partial<WorkerProfile>) => Promise<void>;
  isLoading?: boolean;
}

const SERVICE_CATEGORIES = [
  'Construction',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Cleaning',
  'Landscaping',
  'Painting',
  'Carpentry',
  'Roofing',
  'Flooring',
];

const COMMON_SKILLS = [
  'Residential Plumbing',
  'Commercial Electrical',
  'HVAC Installation',
  'Tile Work',
  'Drywall',
  'Painting',
  'Landscaping Design',
  'Tree Removal',
  'Concrete Work',
  'Roofing Repair',
];

export default function WorkerProfileForm({
  profile = {},
  onSave,
  isLoading = false,
}: WorkerProfileFormProps) {
  const [formData, setFormData] = useState({
    bio: profile.bio || '',
    hourlyRate: profile.hourlyRate?.toString() || '',
    location: profile.location || '',
    skills: profile.skills || [],
    serviceCategories: profile.serviceCategories || [],
  });

  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  const handleSave = async () => {
    if (!formData.bio.trim()) {
      Alert.alert('Error', 'Please enter a bio');
      return;
    }

    if (!formData.hourlyRate || isNaN(Number(formData.hourlyRate))) {
      Alert.alert('Error', 'Please enter a valid hourly rate');
      return;
    }

    if (!formData.location.trim()) {
      Alert.alert('Error', 'Please enter your location');
      return;
    }

    if (formData.skills.length === 0) {
      Alert.alert('Error', 'Please select at least one skill');
      return;
    }

    if (formData.serviceCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one service category');
      return;
    }

    try {
      await onSave({
        ...formData,
        hourlyRate: Number(formData.hourlyRate),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      serviceCategories: prev.serviceCategories.includes(category)
        ? prev.serviceCategories.filter(c => c !== category)
        : [...prev.serviceCategories, category],
    }));
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
        <Text style={styles.sectionTitle}>About You</Text>
        <TextInput
          style={styles.bioInput}
          placeholder="Tell clients about your experience, expertise, and what makes you unique..."
          value={formData.bio}
          onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hourly Rate</Text>
        <View style={styles.rateContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.rateInput}
            placeholder="0"
            value={formData.hourlyRate}
            onChangeText={(text) => setFormData(prev => ({ ...prev, hourlyRate: text }))}
            keyboardType="numeric"
          />
          <Text style={styles.rateLabel}>/hour</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="City, State"
          value={formData.location}
          onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowSkillsModal(true)}
        >
          <Text style={styles.selectorText}>
            {formData.skills.length > 0
              ? `${formData.skills.length} skills selected`
              : 'Select your skills'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        {formData.skills.length > 0 && (
          <View style={styles.selectedItems}>
            {formData.skills.map((skill, index) => (
              <View key={index} style={styles.selectedItem}>
                <Text style={styles.selectedItemText}>{skill}</Text>
                <TouchableOpacity onPress={() => toggleSkill(skill)}>
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Categories</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowCategoriesModal(true)}
        >
          <Text style={styles.selectorText}>
            {formData.serviceCategories.length > 0
              ? `${formData.serviceCategories.length} categories selected`
              : 'Select service categories'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        {formData.serviceCategories.length > 0 && (
          <View style={styles.selectedItems}>
            {formData.serviceCategories.map((category, index) => (
              <View key={index} style={styles.selectedItem}>
                <Text style={styles.selectedItemText}>{category}</Text>
                <TouchableOpacity onPress={() => toggleCategory(category)}>
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <Button
        title="Save Profile"
        onPress={handleSave}
        style={styles.saveButton}
        disabled={isLoading}
      />

      {/* Skills Selection Modal */}
      {showSkillsModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Skills</Text>
              <TouchableOpacity onPress={() => setShowSkillsModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {COMMON_SKILLS.map((skill, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalItem,
                    formData.skills.includes(skill) && styles.modalItemSelected,
                  ]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      formData.skills.includes(skill) && styles.modalItemTextSelected,
                    ]}
                  >
                    {skill}
                  </Text>
                  {formData.skills.includes(skill) && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Categories Selection Modal */}
      {showCategoriesModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Categories</Text>
              <TouchableOpacity onPress={() => setShowCategoriesModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {SERVICE_CATEGORIES.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalItem,
                    formData.serviceCategories.includes(category) && styles.modalItemSelected,
                  ]}
                  onPress={() => toggleCategory(category)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      formData.serviceCategories.includes(category) && styles.modalItemTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                  {formData.serviceCategories.includes(category) && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  bioInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingLeft: 12,
  },
  rateInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  rateLabel: {
    fontSize: 16,
    color: '#666',
    paddingRight: 12,
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
  },
  selectedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  selectedItemText: {
    fontSize: 14,
    color: '#007AFF',
  },
  saveButton: {
    margin: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
});