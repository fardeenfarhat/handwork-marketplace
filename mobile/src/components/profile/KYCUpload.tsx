import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface KYCDocument {
  id: string;
  type: 'id_front' | 'id_back' | 'selfie' | 'address_proof';
  uri: string;
  name: string;
  mimeType: string;
}

interface KYCUploadProps {
  onSubmit: (documents: KYCDocument[]) => Promise<void>;
  isLoading?: boolean;
  kycStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

const DOCUMENT_TYPES = [
  {
    type: 'id_front' as const,
    title: 'ID Front',
    description: 'Front side of your government-issued ID',
    icon: 'card-outline',
    required: true,
  },
  {
    type: 'id_back' as const,
    title: 'ID Back',
    description: 'Back side of your government-issued ID',
    icon: 'card-outline',
    required: true,
  },
  {
    type: 'selfie' as const,
    title: 'Selfie with ID',
    description: 'Photo of yourself holding your ID',
    icon: 'camera-outline',
    required: true,
  },
  {
    type: 'address_proof' as const,
    title: 'Address Proof',
    description: 'Utility bill or bank statement (last 3 months)',
    icon: 'document-outline',
    required: false,
  },
];

export default function KYCUpload({
  onSubmit,
  isLoading = false,
  kycStatus,
  rejectionReason,
}: KYCUploadProps) {
  const [documents, setDocuments] = useState<KYCDocument[]>([]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload documents.'
        );
        return false;
      }

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take photos.'
        );
        return false;
      }
    }
    return true;
  };

  const showImagePickerOptions = (documentType: KYCDocument['type']) => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add your document',
      [
        {
          text: 'Camera',
          onPress: () => takePhoto(documentType),
        },
        {
          text: 'Photo Library',
          onPress: () => pickImage(documentType),
        },
        {
          text: 'Document',
          onPress: () => pickDocument(documentType),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const takePhoto = async (documentType: KYCDocument['type']) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addDocument({
          id: Date.now().toString(),
          type: documentType,
          uri: asset.uri,
          name: `${documentType}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async (documentType: KYCDocument['type']) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addDocument({
          id: Date.now().toString(),
          type: documentType,
          uri: asset.uri,
          name: asset.fileName || `${documentType}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickDocument = async (documentType: KYCDocument['type']) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addDocument({
          id: Date.now().toString(),
          type: documentType,
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/pdf',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const addDocument = (document: KYCDocument) => {
    setDocuments(prev => {
      const filtered = prev.filter(doc => doc.type !== document.type);
      return [...filtered, document];
    });
  };

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const getDocumentForType = (type: KYCDocument['type']) => {
    return documents.find(doc => doc.type === type);
  };

  const handleSubmit = async () => {
    const requiredTypes = DOCUMENT_TYPES.filter(type => type.required).map(type => type.type);
    const missingRequired = requiredTypes.filter(type => !getDocumentForType(type));

    if (missingRequired.length > 0) {
      Alert.alert(
        'Missing Documents',
        'Please upload all required documents before submitting.'
      );
      return;
    }

    try {
      await onSubmit(documents);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit documents. Please try again.');
    }
  };

  const getStatusColor = () => {
    switch (kycStatus) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'pending':
        return '#FF9500';
      default:
        return '#666';
    }
  };

  const getStatusText = () => {
    switch (kycStatus) {
      case 'approved':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Under Review';
      default:
        return 'Not Submitted';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Uploading documents...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Identity Verification</Text>
        <Text style={styles.subtitle}>
          Upload your documents to verify your identity and start working
        </Text>
        
        {kycStatus && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        )}
        
        {kycStatus === 'rejected' && rejectionReason && (
          <View style={styles.rejectionNotice}>
            <Ionicons name="warning" size={20} color="#FF3B30" />
            <Text style={styles.rejectionText}>{rejectionReason}</Text>
          </View>
        )}
      </View>

      {DOCUMENT_TYPES.map((docType) => {
        const document = getDocumentForType(docType.type);
        
        return (
          <View key={docType.type} style={styles.documentSection}>
            <View style={styles.documentHeader}>
              <View style={styles.documentInfo}>
                <Ionicons name={docType.icon as any} size={24} color="#007AFF" />
                <View style={styles.documentText}>
                  <Text style={styles.documentTitle}>
                    {docType.title}
                    {docType.required && <Text style={styles.required}> *</Text>}
                  </Text>
                  <Text style={styles.documentDescription}>{docType.description}</Text>
                </View>
              </View>
              
              {document ? (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeDocument(document.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              ) : null}
            </View>

            {document ? (
              <View style={styles.documentPreview}>
                {document.mimeType.startsWith('image/') ? (
                  <Image source={{ uri: document.uri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.documentIcon}>
                    <Ionicons name="document" size={40} color="#666" />
                    <Text style={styles.documentName}>{document.name}</Text>
                  </View>
                )}
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  <Text style={styles.uploadedText}>Uploaded</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => showImagePickerOptions(docType.type)}
              >
                <Ionicons name="cloud-upload-outline" size={32} color="#007AFF" />
                <Text style={styles.uploadText}>Tap to upload</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your documents are encrypted and stored securely. We only use them for identity verification.
        </Text>
        
        <Button
          title="Submit for Verification"
          onPress={handleSubmit}
          disabled={isLoading || kycStatus === 'pending'}
          style={styles.submitButton}
        />
      </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  rejectionText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    lineHeight: 20,
  },
  documentSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  documentInfo: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  documentText: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  required: {
    color: '#FF3B30',
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  removeButton: {
    padding: 8,
  },
  documentPreview: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  documentIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 8,
  },
  documentName: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  uploadedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  uploadedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f8f9ff',
    gap: 8,
  },
  uploadText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  submitButton: {
    marginTop: 8,
  },
});