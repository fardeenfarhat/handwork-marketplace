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
      // In a real app, this would fetch the KYC status from the API
      // For now, we'll use mock data
      setKycStatus('pending');
      setRejectionReason('');
    } catch (error) {
      Alert.alert('Error', 'Failed to load KYC status');
    }
  };

  const handleSubmitDocuments = async (documents: KYCDocument[]) => {
    try {
      setIsLoading(true);
      
      // In a real app, this would upload documents to the API
      // const formData = new FormData();
      // documents.forEach((doc, index) => {
      //   formData.append(`document_${index}`, {
      //     uri: doc.uri,
      //     type: doc.mimeType,
      //     name: doc.name,
      //   } as any);
      //   formData.append(`document_${index}_type`, doc.type);
      // });
      // await apiService.uploadKYCDocuments(formData);
      
      // For now, we'll just simulate the API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setKycStatus('pending');
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