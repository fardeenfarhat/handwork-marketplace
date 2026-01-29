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
import { ClientProfile } from '@/types';
import { ClientProfileForm } from '@/components/profile';
import apiService from '@/services/api';
import { Colors, Gradients, Typography, Spacing, BorderRadius } from '@/styles/DesignSystem';

export default function ClientProfileEditScreen() {
  const dispatch = useDispatch<AppDispatch>();
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
      // Add user information to profile
      setProfile({
        ...clientProfile,
        firstName: user.firstName || (user as any).first_name || '',
        lastName: user.lastName || (user as any).last_name || '',
        email: user.email || '',
        phone: user.phone || '',
      } as any);
      console.log('Client profile loaded with user info:', {
        firstName: user.firstName || (user as any).first_name,
        lastName: user.lastName || (user as any).last_name,
        email: user.email,
        phone: user.phone,
      });
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
      
      // Separate user info from profile data
      const { firstName, lastName, email, phone, ...clientProfileData } = profileData as any;
      
      // Update user information if changed
      if (firstName || lastName || email || phone) {
        await apiService.updateUserInfo({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
        });
      }
      
      // Update client profile
      const updatedProfile = await apiService.updateClientProfile(clientProfileData);
      
      setProfile({
        ...updatedProfile,
        firstName,
        lastName,
        email,
        phone,
      } as any);
      
      // Refresh user data in Redux store
      dispatch(refreshUserProfile());
      
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={Gradients.primaryOrange}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.iconContainer}>
                <Ionicons name="briefcase-outline" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Client Profile</Text>
                <Text style={styles.headerSubtitle}>Build trust with service providers</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ClientProfileForm
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