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
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { refreshUserProfile } from '@/store/slices/authSlice';
import { WorkerProfile } from '@/types';
import { WorkerProfileForm } from '@/components/profile';
import apiService from '@/services/api';
import { Colors, Gradients, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';

export default function WorkerProfileEditScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<Partial<WorkerProfile>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const workerProfile = await apiService.getWorkerProfile();
      setProfile(workerProfile);
    } catch (error) {
      console.error('Error loading worker profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (profileData: Partial<WorkerProfile>) => {
    try {
      setIsLoading(true);
      
      console.log('Saving worker profile:', profileData);
      const updatedProfile = await apiService.updateWorkerProfile(profileData);
      
      setProfile(updatedProfile);
      
      // Refresh user data in Redux store
      dispatch(refreshUserProfile());
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating worker profile:', error);
      Alert.alert('Error', 'Failed to update profile');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={Gradients.orangeBlue}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.iconContainer}>
                <Ionicons name="person-circle-outline" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Worker Profile</Text>
                <Text style={styles.headerSubtitle}>Showcase your skills and expertise</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <WorkerProfileForm
        profile={profile}
        onSave={handleSaveProfile}
        isLoading={isLoading}
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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