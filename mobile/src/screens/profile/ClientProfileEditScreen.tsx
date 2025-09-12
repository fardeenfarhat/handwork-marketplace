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
      const clientProfile = await apiService.getClientProfile();
      setProfile(clientProfile);
    } catch (error) {
      console.error('Error loading client profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (profileData: Partial<ClientProfile>) => {
    try {
      setIsLoading(true);
      
      console.log('Saving client profile:', profileData);
      const updatedProfile = await apiService.updateClientProfile(profileData);
      
      setProfile(updatedProfile);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating client profile:', error);
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