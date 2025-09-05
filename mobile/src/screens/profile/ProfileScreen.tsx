import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootState } from '@/store';
import { WorkerProfile, ClientProfile, ProfileStackParamList } from '@/types';
import { ProfileViewer, ProfileProgress } from '@/components/profile';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import apiService from '@/services/api';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<WorkerProfile | ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'view' | 'progress'>('view');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // This would be replaced with actual API calls to get worker/client profile
      // For now, we'll create a mock profile based on user role
      if (user.role === 'worker') {
        const mockWorkerProfile: WorkerProfile = {
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
        setProfile(mockWorkerProfile);
      } else {
        const mockClientProfile: ClientProfile = {
          userId: user.id,
          companyName: '',
          description: '',
          location: '',
          rating: 0,
          totalJobsPosted: 0,
        };
        setProfile(mockClientProfile);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepPress = (step: string) => {
    // Navigate to appropriate screen based on step
    switch (step) {
      case 'basic_info':
      case 'skills':
        if (user?.role === 'worker') {
          navigation.navigate('WorkerProfileEdit');
        } else {
          navigation.navigate('ClientProfileEdit');
        }
        break;
      case 'kyc':
        navigation.navigate('KYCUpload');
        break;
      case 'portfolio':
        navigation.navigate('Portfolio');
        break;
      default:
        break;
    }
  };

  const handleEditProfile = () => {
    if (user?.role === 'worker') {
      navigation.navigate('WorkerProfileEdit');
    } else {
      navigation.navigate('ClientProfileEdit');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'view' && styles.activeTab]}
            onPress={() => setActiveTab('view')}
          >
            <Text style={[styles.tabText, activeTab === 'view' && styles.activeTabText]}>
              View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'progress' && styles.activeTab]}
            onPress={() => setActiveTab('progress')}
          >
            <Text style={[styles.tabText, activeTab === 'progress' && styles.activeTabText]}>
              Progress
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'view' ? (
          <ProfileViewer
            profile={profile}
            userType={user.role}
            isOwnProfile={true}
            onEdit={handleEditProfile}
          />
        ) : (
          <ProfileProgress
            profile={profile}
            userType={user.role}
            onStepPress={handleStepPress}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
});