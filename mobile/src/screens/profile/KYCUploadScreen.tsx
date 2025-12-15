import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { KYCUpload } from '@/components/profile';
import apiService from '@/services/api';
import { Colors, Gradients, Typography, Spacing, BorderRadius } from '@/styles/DesignSystem';

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
  const [kycStatus, setKycStatus] = useState<'pending' | 'approved' | 'rejected' | undefined>(undefined);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    loadKYCStatus();
  }, []);

  const loadKYCStatus = async () => {
    if (!user) return;

    try {
      const kycData = await apiService.getKYCStatus() as any;
      setKycStatus(kycData.status);
      setRejectionReason(kycData.rejectionReason || '');
    } catch (error) {
      // If no KYC status exists, leave as undefined (allows new submissions)
      console.log('No KYC status found - allowing new submission');
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
      
      const result = await apiService.uploadKYCDocuments(formData) as any;
      
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

  const getHeaderIcon = () => {
    if (kycStatus === 'approved') return 'checkmark-circle';
    if (kycStatus === 'rejected') return 'close-circle';
    return 'shield-checkmark-outline';
  };

  const getHeaderText = () => {
    if (kycStatus === 'approved') return 'Verified';
    if (kycStatus === 'rejected') return 'Action Required';
    return 'Verify Identity';
  };

  const getHeaderSubtext = () => {
    if (kycStatus === 'approved') return 'Your identity has been confirmed';
    if (kycStatus === 'rejected') return 'Please resubmit your documents';
    return 'Secure verification in minutes';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dynamic Gradient Header */}
      <LinearGradient
        colors={
          kycStatus === 'approved'
            ? ['#34C759', '#30D158']
            : kycStatus === 'rejected'
            ? ['#FF3B30', '#FF453A']
            : Gradients.primaryBlue
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.iconContainer}>
                <Ionicons name={getHeaderIcon()} size={32} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>{getHeaderText()}</Text>
                <Text style={styles.headerSubtitle}>{getHeaderSubtext()}</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KYCUpload
        onSubmit={handleSubmitDocuments}
        isLoading={isLoading}
        kycStatus={kycStatus}
        rejectionReason={rejectionReason}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingBottom: Spacing[6],
  },
  headerContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: Spacing[1],
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.95)',
  },
});