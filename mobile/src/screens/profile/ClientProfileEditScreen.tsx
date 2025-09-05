import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ClientProfile } from '@/types';
import { ClientProfileForm } from '@/components/profile';
import apiService from '@/services/api';

export default function ClientProfileEditScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<Partial<ClientProfile>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // In a real app, this would fetch the client profile from the API
      // For now, we'll use mock data
      const mockProfile: Partial<ClientProfile> = {
        userId: user.id,
        companyName: '',
        description: '',
        location: '',
        rating: 0,
        totalJobsPosted: 0,
      };
      setProfile(mockProfile);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (profileData: Partial<ClientProfile>) => {
    try {
      setIsLoading(true);
      
      // In a real app, this would call the API to update the client profile
      // await apiService.updateClientProfile(profileData);
      
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
      <ClientProfileForm
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