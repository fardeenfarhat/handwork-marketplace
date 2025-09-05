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
      // In a real app, this would fetch the worker profile from the API
      // For now, we'll use mock data
      const mockProfile: Partial<WorkerProfile> = {
        userId: user.id,
        bio: '',
        skills: [],
        serviceCategories: [],
        hourlyRate: 0,
        location: '',
        portfolioImages: [],
        kycStatus: 'pending',
        rating: 0,
        totalJobs: 0,
      };
      setProfile(mockProfile);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (profileData: Partial<WorkerProfile>) => {
    try {
      setIsLoading(true);
      
      // In a real app, this would call the API to update the worker profile
      // await apiService.updateWorkerProfile(profileData);
      
      // For now, we'll just simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProfile(prev => ({ ...prev, ...profileData }));
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
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