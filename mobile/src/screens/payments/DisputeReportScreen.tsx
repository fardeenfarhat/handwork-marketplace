import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { PaymentStackParamList, Booking, DisputeType } from '@/types';
import { Button, Input, LoadingSpinner } from '@/components/common';
import apiService from '@/services/api';

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'DisputeReport'>;
type RouteProps = RouteProp<PaymentStackParamList, 'DisputeReport'>;

const DisputeReportScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [disputeType, setDisputeType] = useState<DisputeType>('quality');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const disputeTypes: { type: DisputeType; label: string; description: string }[] = [
    {
      type: 'payment',
      label: 'Payment Issue',
      description: 'Issues with payment processing or amounts'
    },
    {
      type: 'quality',
      label: 'Work Quality',
      description: 'Work not completed to expected standards'
    },
    {
      type: 'no_show',
      label: 'No Show',
      description: 'Worker or client did not show up as scheduled'
    },
    {
      type: 'other',
      label: 'Other',
      description: 'Other issues not covered above'
    },
  ];

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

  const handleAddEvidence = () => {
    Alert.alert(
      'Add Evidence',
      'Choose evidence type',
      [
        { text: 'Photo', onPress: () => addMockEvidence('photo') },
        { text: 'Document', onPress: () => addMockEvidence('document') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const addMockEvidence = (type: string) => {
    const mockEvidenceUri = `mock_${type}_${Date.now()}.${type === 'photo' ? 'jpg' : 'pdf'}`;
    setEvidence(prev => [...prev, mockEvidenceUri]);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidence(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDispute = async () => {
    if (description.trim().length < 20) {
      Alert.alert('Error', 'Please provide a detailed description (minimum 20 characters)');
      return;
    }

    setSubmitting(true);
    try {
      const disputeData = {
        bookingId,
        type: disputeType,
        description: description.trim(),
        evidence: evidence,
      };

      const dispute = await apiService.createDispute(disputeData);

      Alert.alert(
        'Dispute Reported',
        'Your dispute has been submitted and will be reviewed by our team. You will receive updates via email and in-app notifications.',
        [
          {
            text: 'View Dispute',
            onPress: () => navigation.navigate('DisputeDetail', { disputeId: (dispute as any).id }),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting dispute:', error);
      Alert.alert('Error', 'Failed to submit dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDisputeTypeOption = (option: typeof disputeTypes[0]) => (
    <TouchableOpacity
      key={option.type}
      style={[
        styles.disputeTypeOption,
        disputeType === option.type && styles.disputeTypeSelected,
      ]}
      onPress={() => setDisputeType(option.type)}
    >
      <View style={styles.disputeTypeHeader}>
        <View style={[
          styles.radioButton,
          disputeType === option.type && styles.radioButtonSelected,
        ]}>
          {disputeType === option.type && <View style={styles.radioButtonInner} />}
        </View>
        <Text style={styles.disputeTypeLabel}>{option.label}</Text>
      </View>
      <Text style={styles.disputeTypeDescription}>{option.description}</Text>
    </TouchableOpacity>
  );

  const renderEvidenceItem = (evidenceUri: string, index: number) => (
    <View key={index} style={styles.evidenceItem}>
      <View style={styles.evidenceInfo}>
        <Text style={styles.evidenceType}>
          {evidenceUri.includes('photo') ? '📷' : '📄'} Evidence {index + 1}
        </Text>
        <Text style={styles.evidenceUri}>{evidenceUri}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeEvidenceButton}
        onPress={() => handleRemoveEvidence(index)}
      >
        <Text style={styles.removeEvidenceText}>Remove</Text>
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
        <Text style={styles.title}>Report Dispute</Text>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.card}>
            <Text style={styles.jobTitle}>{booking.jobTitle}</Text>
            <Text style={styles.bookingInfo}>
              {booking.workerName} • {booking.clientName}
            </Text>
            <Text style={styles.bookingInfo}>
              Rate: ${booking.agreedRate}/hour
            </Text>
            <Text style={styles.bookingInfo}>
              Status: {booking.status}
            </Text>
          </View>
        </View>

        {/* Dispute Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is the issue? *</Text>
          <View style={styles.disputeTypes}>
            {disputeTypes.map(renderDisputeTypeOption)}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Description *</Text>
          <Text style={styles.sectionSubtitle}>
            Please provide a detailed explanation of the issue
          </Text>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in detail, including what happened, when it occurred, and how it affected you..."
            multiline
            numberOfLines={6}
            style={styles.descriptionInput}
          />
          <Text style={styles.characterCount}>
            {description.length} characters (minimum 20 required)
          </Text>
        </View>

        {/* Evidence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supporting Evidence</Text>
          <Text style={styles.sectionSubtitle}>
            Add photos, documents, or other evidence to support your dispute
          </Text>
          
          {evidence.length > 0 && (
            <View style={styles.evidenceList}>
              {evidence.map((item, index) => renderEvidenceItem(item, index))}
            </View>
          )}
          
          <TouchableOpacity style={styles.addEvidenceButton} onPress={handleAddEvidence}>
            <Text style={styles.addEvidenceText}>+ Add Evidence</Text>
          </TouchableOpacity>
        </View>

        {/* Guidelines */}
        <View style={styles.section}>
          <View style={styles.guidelinesCard}>
            <Text style={styles.guidelinesTitle}>Dispute Guidelines</Text>
            <Text style={styles.guidelinesText}>
              • Be honest and provide accurate information{'\n'}
              • Include all relevant details and evidence{'\n'}
              • Our team will review within 24-48 hours{'\n'}
              • Both parties will be contacted for their side{'\n'}
              • Resolution may take 3-7 business days{'\n'}
              • False disputes may result in account penalties
            </Text>
          </View>
        </View>

        <Button
          title={submitting ? 'Submitting...' : 'Submit Dispute'}
          onPress={handleSubmitDispute}
          disabled={submitting || description.trim().length < 20}
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
  bookingInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  disputeTypes: {
    gap: 12,
  },
  disputeTypeOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  disputeTypeSelected: {
    borderColor: '#2196F3',
  },
  disputeTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: '#2196F3',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
  },
  disputeTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  disputeTypeDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 32,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  evidenceList: {
    marginBottom: 12,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  evidenceInfo: {
    flex: 1,
  },
  evidenceType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  evidenceUri: {
    fontSize: 12,
    color: '#666',
  },
  removeEvidenceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f44336',
    borderRadius: 4,
  },
  removeEvidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addEvidenceButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addEvidenceText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  guidelinesCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#856404',
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

export default DisputeReportScreen;