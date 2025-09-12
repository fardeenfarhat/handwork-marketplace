import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { WorkerProfile } from '@/types';
import { WorkerProfileForm } from '@/components/profile';
import apiService from '@/services/api';

export default function WorkerProfileEditScreen() {
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
    <SafeAreaView style={styles.container}>
      <WorkerProfileForm
        profile={profile}
        onSave={handleSaveProfile}
        isLoading={isLoading}
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