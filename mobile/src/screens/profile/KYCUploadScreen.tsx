import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { KYCUpload } from '@/components/profile';
import apiService from '@/services/api';

interface KYCDocument {
  id: string;
  type: 'id_front' | 'id_back' | 'selfie' | 'address_proof';
  uri: string;
  name: string;
  mimeType: string;
}

export default function KYCUploadScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    loadKYCStatus();
  }, []);

  const loadKYCStatus = async () => {
    if (!user) return;

    try {
      const kycData = await apiService.getKYCStatus();
      setKycStatus(kycData.status);
      setRejectionReason(kycData.rejectionReason || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load KYC status');
    }
  };

  const handleSubmitDocuments = async (documents: KYCDocument[]) => {
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      documents.forEach((doc, index) => {
        formData.append(`document_${index}`, {
          uri: doc.uri,
          type: doc.mimeType,
          name: doc.name,
        } as any);
        formData.append(`document_${index}_type`, doc.type);
      });
      
      const result = await apiService.uploadKYCDocuments(formData);
      
      setKycStatus(result.status);
      Alert.alert(
        'Documents Submitted',
        'Your documents have been submitted for review. You will be notified once the verification is complete.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit documents');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KYCUpload
        onSubmit={handleSubmitDocuments}
        isLoading={isLoading}
        kycStatus={kycStatus}
        rejectionReason={rejectionReason}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});