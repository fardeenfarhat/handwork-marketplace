import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { PaymentStackParamList, Booking } from '@/types';
import { Button, Input, LoadingSpinner } from '@/components/common';
import apiService from '@/services/api';

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'CompletionVerification'>;
type RouteProps = RouteProp<PaymentStackParamList, 'CompletionVerification'>;

const CompletionVerificationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBookingData();
  }, []);

  const loadBookingData = async () => {
    try {
      const bookingData = await apiService.getBooking(bookingId);
      setBooking(bookingData as Booking);
    } catch (error) {
      console.error('Error loading booking data:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = () => {
    // Mock photo selection - in real app would use ImagePicker
    Alert.alert(
      'Add Photo',
      'Choose photo source',
      [
        { text: 'Camera', onPress: () => addMockPhoto('camera') },
        { text: 'Gallery', onPress: () => addMockPhoto('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const addMockPhoto = (source: string) => {
    const mockPhotoUri = `mock_photo_${Date.now()}_${source}.jpg`;
    setPhotos(prev => [...prev, mockPhotoUri]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCompletion = async () => {
    if (completionNotes.trim().length < 10) {
      Alert.alert('Error', 'Please provide detailed completion notes (minimum 10 characters)');
      return;
    }

    if (photos.length === 0) {
      Alert.alert('Error', 'Please add at least one completion photo');
      return;
    }

    setSubmitting(true);
    try {
      await apiService.completeBooking(bookingId, {
        notes: completionNotes.trim(),
        photos: photos,
      });

      Alert.alert(
        'Job Completed!',
        'Your completion has been submitted for client approval. Payment will be released once approved.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('JobTracking', { bookingId }),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting completion:', error);
      Alert.alert('Error', 'Failed to submit completion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPhoto = (photoUri: string, index: number) => (
    <View key={index} style={styles.photoContainer}>
      <View style={styles.photoPlaceholder}>
        <Text style={styles.photoText}>Photo {index + 1}</Text>
        <Text style={styles.photoUri}>{photoUri}</Text>
      </View>
      <TouchableOpacity
        style={styles.removePhotoButton}
        onPress={() => handleRemovePhoto(index)}
      >
        <Text style={styles.removePhotoText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Booking not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Complete Job</Text>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.card}>
            <Text style={styles.jobTitle}>{booking.jobTitle}</Text>
            <Text style={styles.clientName}>Client: {booking.clientName}</Text>
            <Text style={styles.agreedRate}>Rate: ${booking.agreedRate}/hour</Text>
          </View>
        </View>

        {/* Completion Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Notes *</Text>
          <Input
            value={completionNotes}
            onChangeText={setCompletionNotes}
            placeholder="Describe the work completed, any issues encountered, and recommendations for the client..."
            multiline
            numberOfLines={6}
            style={styles.notesInput}
          />
          <Text style={styles.characterCount}>
            {completionNotes.length} characters (minimum 10 required)
          </Text>
        </View>

        {/* Completion Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Photos *</Text>
          <Text style={styles.sectionSubtitle}>
            Add photos showing the completed work
          </Text>
          
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => renderPhoto(photo, index))}
            
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                <Text style={styles.addPhotoText}>+</Text>
                <Text style={styles.addPhotoLabel}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.photoLimit}>
            {photos.length}/5 photos added
          </Text>
        </View>

        {/* Guidelines */}
        <View style={styles.section}>
          <View style={styles.guidelinesCard}>
            <Text style={styles.guidelinesTitle}>Completion Guidelines</Text>
            <Text style={styles.guidelinesText}>
              • Provide detailed notes about the work completed{'\n'}
              • Include before/after photos when applicable{'\n'}
              • Mention any materials used or recommendations{'\n'}
              • Note any issues or additional work needed{'\n'}
              • Be professional and thorough in your documentation
            </Text>
          </View>
        </View>

        <Button
          title={submitting ? 'Submitting...' : 'Submit Completion'}
          onPress={handleSubmitCompletion}
          disabled={submitting || completionNotes.trim().length < 10 || photos.length === 0}
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  agreedRate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2196F3',
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  photoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  photoUri: {
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 32,
    color: '#999',
    marginBottom: 4,
  },
  addPhotoLabel: {
    fontSize: 12,
    color: '#666',
  },
  photoLimit: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  guidelinesCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  submitButton: {
    marginBottom: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 32,
  },
});

export default CompletionVerificationScreen;