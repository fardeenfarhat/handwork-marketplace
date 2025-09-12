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
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootState, AppDispatch } from '@/store';
import { logoutUser } from '@/store/slices/authSlice';
import { WorkerProfile, ClientProfile, ProfileStackParamList } from '@/types';
import { ProfileViewer, ProfileProgress } from '@/components/profile';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import apiService from '@/services/api';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
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
      
      console.log('🔄 Loading profile for user:', user.role);
      
      if (user.role === 'worker') {
        try {
          const workerProfile = await apiService.getWorkerProfile();
          console.log('✅ Worker profile loaded:', workerProfile);
          setProfile(workerProfile);
        } catch (profileError) {
          console.log('⚠️ Worker profile not found, creating default profile');
          // Create a default worker profile if none exists
          const defaultProfile: WorkerProfile = {
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
          setProfile(defaultProfile);
        }
      } else {
        try {
          const clientProfile = await apiService.getClientProfile();
          console.log('✅ Client profile loaded:', clientProfile);
          setProfile(clientProfile);
        } catch (profileError) {
          console.log('⚠️ Client profile not found, creating default profile');
          // Create a default client profile if none exists
          const defaultProfile: ClientProfile = {
            userId: user.id,
            companyName: '',
            description: '',
            location: '',
            rating: 0,
            totalJobsPosted: 0,
          };
          setProfile(defaultProfile);
        }
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      Alert.alert(
        'Profile Error', 
        'Unable to load profile. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: loadProfile },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logoutUser());
          },
        },
      ]
    );
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
        <View style={styles.headerTop}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
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