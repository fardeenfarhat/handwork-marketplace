import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { ProfileStackParamList, WorkerProfile, ClientProfile } from '@/types';
import { ProfileViewer } from '@/components/profile';
import { Header } from '@/components/common';
import apiService from '@/services/api';

type UserProfileViewScreenRouteProp = RouteProp<ProfileStackParamList, 'UserProfileView'>;

export default function UserProfileViewScreen() {
  const route = useRoute<UserProfileViewScreenRouteProp>();
  const navigation = useNavigation();
  const { userId, userType } = route.params;

  const [profile, setProfile] = useState<WorkerProfile | ClientProfile | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, [userId, userType]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);

      // For now, create a placeholder profile since the backend endpoints 
      // for viewing other users' profiles are not implemented yet
      const placeholderProfile = {
        id: userId,
        user_id: userId,
        name: `${userType === 'worker' ? 'Worker' : 'Client'} #${userId}`,
        email: 'Email not available for privacy',
        first_name: 'User',
        last_name: `#${userId}`,
        role: userType,
        created_at: new Date().toISOString(),
        bio: `This ${userType} profile is currently limited for privacy protection. Full profile viewing features are being developed to balance transparency with user privacy.`,
        skills: userType === 'worker' ? ['Skills not available'] : [],
        hourly_rate: userType === 'worker' ? null : undefined,
        location: 'Location not available for privacy',
        phone: null,
        avatar_url: null,
        portfolio_images: [],
        certifications: userType === 'worker' ? [] : undefined,
        experience_level: userType === 'worker' ? 'Not specified' : undefined,
        rating: 0,
        total_reviews: 0,
        total_jobs: 0,
        company_name: userType === 'client' ? 'Company not specified' : undefined,
        industry: userType === 'client' ? 'Industry not specified' : undefined,
      };
      
      setProfile(placeholderProfile as any);
      
      // Try to load review count - this might work even if profile doesn't
      try {
        const reviewCountData = await apiService.getUserReviewCount(userId);
        setReviewCount(reviewCountData);
      } catch (reviewError) {
        console.log('Review count not available:', reviewError);
        setReviewCount(0);
      }

    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert(
        'Profile Access Restricted', 
        'User profiles are currently restricted for privacy protection. This feature is being developed to provide appropriate visibility while maintaining user privacy.',
        [
          {
            text: 'Understood',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Header title={`${userType === 'worker' ? 'Worker' : 'Client'} Profile`} showBackButton={true} />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingTitle}>Loading Profile</Text>
          <Text style={styles.loadingText}>Please wait while we fetch the profile information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={`${userType === 'worker' ? 'Worker' : 'Client'} Profile`} showBackButton={true} />
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Profile Unavailable</Text>
            <Text style={styles.errorMessage}>
              This profile is temporarily unavailable. The profile viewing feature is currently under development.
            </Text>
            <Text style={styles.errorSubtext}>
              Please try again later or contact support if this issue persists.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={`${userType === 'worker' ? 'Worker' : 'Client'} Profile`} showBackButton={true} />
      <ProfileViewer
        profile={profile}
        userType={userType}
        isOwnProfile={false}
        reviewCount={reviewCount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 250,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
});