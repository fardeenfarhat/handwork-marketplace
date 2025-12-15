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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootState, AppDispatch } from '@/store';
import { logoutUser, refreshUserProfile } from '@/store/slices/authSlice';
import { WorkerProfile, ClientProfile, ProfileStackParamList } from '@/types';
import { ProfileProgress } from '@/components/profile';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Header } from '@/components/common';
import apiService from '@/services/api';
import { ModernCard } from '@/components/ui/ModernCard';
import { ModernButton } from '@/components/ui/ModernButton';
import { Colors, Typography, Spacing, Gradients, Shadows, BorderRadius } from '@/styles/DesignSystem';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<WorkerProfile | ClientProfile | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'view' | 'progress'>('view');

  useEffect(() => {
    loadProfile();
  }, []);

  // Reload profile when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 PROFILE SCREEN: Screen focused, reloading profile...');
      loadProfile();
      // Also refresh the user data in Redux store
      dispatch(refreshUserProfile());
    }, [dispatch])
  );

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
            id: 0, // Temporary ID for new profiles
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
      
      // Fetch review count for the user
      try {
        const count = await apiService.getUserReviewCount(user.id);
        setReviewCount(count);
      } catch (reviewError) {
        console.log('⚠️ Could not fetch review count:', reviewError);
        setReviewCount(0);
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
        // KYC is only for workers
        if (user?.role === 'worker') {
          navigation.navigate('KYCUpload');
        }
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
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background.primary }]}>
      <View style={styles.headerWrapper}>
        <LinearGradient colors={Gradients.orangeBlue} style={styles.headerGradient}>
          <View style={styles.headerInner}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color={Colors.danger[500]} />
            </TouchableOpacity>
          </View>

          <ModernCard variant="elevated" style={styles.profileSummaryCardModern}>
            <View style={styles.profileRow}>
              <View style={styles.avatarModern}>
                <Ionicons name="person" size={42} color={Colors.primary[500]} />
                <View style={styles.onlineIndicatorModern} />
              </View>

              <View style={styles.profileInfoModern}>
                <Text style={styles.profileNameModern}>{user?.firstName} {user?.lastName}</Text>
                <Text style={styles.profileRoleModern}>{user?.role === 'worker' ? 'Service Provider' : 'Client'}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color={Colors.warning[500]} />
                  <Text style={styles.ratingTextModern}>{profile ? ((profile as any)?.rating ?? 0).toFixed(1) : '0.0'}</Text>
                  <Text style={styles.reviewCountModern}>({reviewCount} reviews)</Text>
                </View>
              </View>

              <View style={styles.actionsColumn}>
                <ModernButton title="Edit" onPress={handleEditProfile} size="sm" variant="outline" />
              </View>
            </View>
          </ModernCard>
        </LinearGradient>
      </View>

      <View style={styles.tabContainerModern}>
        <TouchableOpacity
          style={[styles.tabModern, activeTab === 'view' && styles.activeTabModern]}
          onPress={() => setActiveTab('view')}
        >
          <Ionicons name="eye-outline" size={18} color={activeTab === 'view' ? Colors.primary[500] : Colors.neutral[500]} />
          <Text style={[styles.tabTextModern, activeTab === 'view' && styles.activeTabTextModern]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabModern, activeTab === 'progress' && styles.activeTabModern]}
          onPress={() => setActiveTab('progress')}
        >
          <Ionicons name="trending-up-outline" size={18} color={activeTab === 'progress' ? Colors.primary[500] : Colors.neutral[500]} />
          <Text style={[styles.tabTextModern, activeTab === 'progress' && styles.activeTabTextModern]}>Progress</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'view' ? (
          <View style={styles.overviewModern}>
            <View style={styles.statsGridModern}>
              <ModernCard style={styles.statCardModern}>
                <Ionicons name="briefcase-outline" size={24} color={Colors.primary[500]} />
                <Text style={styles.statValueModern}>{user?.role === 'worker' ? (profile as any)?.totalJobs || 0 : (profile as any)?.totalJobsPosted || 0}</Text>
                <Text style={styles.statLabelModern}>{user?.role === 'worker' ? 'Jobs Completed' : 'Jobs Posted'}</Text>
              </ModernCard>

              <ModernCard style={styles.statCardModern}>
                <Ionicons name="star-outline" size={24} color={Colors.warning[500]} />
                <Text style={styles.statValueModern}>{reviewCount}</Text>
                <Text style={styles.statLabelModern}>Reviews</Text>
              </ModernCard>

              {user?.role === 'worker' && (
                <ModernCard style={styles.statCardModern}>
                  <Ionicons name={(profile as any)?.kycStatus === 'approved' ? 'shield-checkmark' : 'shield-outline'} size={24} color={(profile as any)?.kycStatus === 'approved' ? Colors.success[500] : Colors.warning[500]} />
                  <Text style={[styles.statValueModern, { color: (profile as any)?.kycStatus === 'approved' ? Colors.success[500] : Colors.warning[500] }]}>{(profile as any)?.kycStatus === 'approved' ? 'Verified' : 'Pending'}</Text>
                  <Text style={styles.statLabelModern}>KYC Status</Text>
                </ModernCard>
              )}
            </View>

            <View style={styles.quickActionsModern}>
              <Text style={styles.sectionTitleModern}>Quick Actions</Text>
              <View style={styles.quickActionsGridModern}>
                <TouchableOpacity style={styles.actionCardModern} onPress={() => (navigation as any).navigate('Reviews', { screen: 'ReviewsList', params: { userId: user.id } })}>
                  <Ionicons name="star" size={22} color={Colors.primary[500]} />
                  <Text style={styles.actionCardTitleModern}>My Reviews</Text>
                  <Text style={styles.actionCardSubtitleModern}>View feedback</Text>
                </TouchableOpacity>

                {user?.role === 'worker' && (
                  <TouchableOpacity style={styles.actionCardModern} onPress={() => navigation.navigate('Portfolio')}>
                    <Ionicons name="images-outline" size={22} color={Colors.warning[500]} />
                    <Text style={styles.actionCardTitleModern}>Portfolio</Text>
                    <Text style={styles.actionCardSubtitleModern}>Showcase work</Text>
                  </TouchableOpacity>
                )}

                {user?.role === 'worker' && ((profile as any)?.kycStatus !== 'approved' ? (
                  <TouchableOpacity style={styles.actionCardModern} onPress={() => navigation.navigate('KYCUpload')}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={Colors.warning[500]} />
                    <Text style={styles.actionCardTitleModern}>Complete KYC</Text>
                    <Text style={styles.actionCardSubtitleModern}>Verification needed</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.actionCardModern}>
                    <Ionicons name="shield-checkmark" size={22} color={Colors.success[500]} />
                    <Text style={styles.actionCardTitleModern}>Verified</Text>
                    <Text style={styles.actionCardSubtitleModern}>KYC complete</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.profileDetailsModern}>
              <Text style={styles.sectionTitleModern}>About</Text>
              <ModernCard style={styles.profileDetailsCardModern}>
                {user?.role === 'worker' ? (
                  <>
                    <View style={styles.detailRowModern}>
                      <View style={styles.detailLeftModern}><Ionicons name="person-outline" size={18} color={Colors.primary[500]} /></View>
                      <View style={styles.detailRightModern}>
                        <Text style={styles.detailLabelModern}>Bio</Text>
                        <Text style={styles.detailValueModern}>{(profile as any)?.bio || 'No bio added yet'}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRowModern}>
                      <View style={styles.detailLeftModern}><Ionicons name="location-outline" size={18} color={Colors.primary[500]} /></View>
                      <View style={styles.detailRightModern}>
                        <Text style={styles.detailLabelModern}>Location</Text>
                        <Text style={styles.detailValueModern}>{(profile as any)?.location || 'Location not specified'}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRowModern}>
                      <View style={styles.detailLeftModern}><Ionicons name="build-outline" size={18} color={Colors.primary[500]} /></View>
                      <View style={styles.detailRightModern}>
                        <Text style={styles.detailLabelModern}>Skills</Text>
                        <View style={styles.skillsRowModern}>{((profile as any)?.skills || []).length > 0 ? ((profile as any).skills.map((skill: string, i: number) => (<View key={i} style={styles.skillChipModern}><Text style={styles.skillTextModern}>{skill}</Text></View>))) : (<Text style={styles.emptyValueModern}>No skills added yet</Text>)}</View>
                      </View>
                    </View>

                    <View style={styles.detailRowModern}>
                      <View style={styles.detailLeftModern}><Ionicons name="cash-outline" size={18} color={Colors.primary[500]} /></View>
                      <View style={styles.detailRightModern}>
                        <Text style={styles.detailLabelModern}>Hourly Rate</Text>
                        <Text style={styles.detailValueModern}>${(profile as any)?.hourlyRate || 0}/hour</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.detailRowModern}>
                      <View style={styles.detailLeftModern}><Ionicons name="business-outline" size={18} color={Colors.primary[500]} /></View>
                      <View style={styles.detailRightModern}>
                        <Text style={styles.detailLabelModern}>Company</Text>
                        <Text style={styles.detailValueModern}>{(profile as any)?.companyName || 'No company specified'}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRowModern}>
                      <View style={styles.detailLeftModern}><Ionicons name="document-text-outline" size={18} color={Colors.primary[500]} /></View>
                      <View style={styles.detailRightModern}>
                        <Text style={styles.detailLabelModern}>Description</Text>
                        <Text style={styles.detailValueModern}>{(profile as any)?.description || 'No description added yet'}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRowModern}>
                      <View style={styles.detailLeftModern}><Ionicons name="location-outline" size={18} color={Colors.primary[500]} /></View>
                      <View style={styles.detailRightModern}>
                        <Text style={styles.detailLabelModern}>Location</Text>
                        <Text style={styles.detailValueModern}>{(profile as any)?.location || 'Location not specified'}</Text>
                      </View>
                    </View>
                  </>
                )}
              </ModernCard>
            </View>
          </View>
        ) : (
          <View style={styles.progressTab}>
            <ProfileProgress profile={profile} userType={user.role} onStepPress={handleStepPress} />
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },

  // Header Styles
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  logoutButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
  },

  // Profile Summary Card
  profileSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34C759',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  reviewCountText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  editButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },

  /* Modern UI Styles */
  headerWrapper: {
    marginBottom: Spacing.lg,
  },
  headerGradient: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profileSummaryCardModern: {
    marginTop: Spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarModern: {
    position: 'relative',
    width: 70,
    height: 70,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary[500],
  },
  onlineIndicatorModern: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success[500],
    borderWidth: 2,
    borderColor: Colors.neutral[0],
  },
  profileInfoModern: {
    flex: 1,
  },
  profileNameModern: {
    ...Typography.h3,
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  profileRoleModern: {
    ...Typography.bodyLarge,
    color: Colors.neutral[600],
    marginBottom: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingTextModern: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  reviewCountModern: {
    ...Typography.bodySmall,
    color: Colors.neutral[600],
  },
  actionsColumn: {
    alignItems: 'flex-end',
  },
  tabContainerModern: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    ...Shadows.sm,
  },
  tabModern: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  activeTabModern: {
    backgroundColor: Colors.primary[500],
  },
  tabTextModern: {
    ...Typography.bodyMedium,
    fontWeight: '500',
    color: Colors.neutral[600],
  },
  activeTabTextModern: {
    color: Colors.neutral[0],
    fontWeight: '600',
  },
  overviewModern: {
    paddingHorizontal: Spacing.lg,
  },
  statsGridModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCardModern: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  statValueModern: {
    ...Typography.h2,
    color: Colors.neutral[900],
  },
  statLabelModern: {
    ...Typography.bodySmall,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  quickActionsModern: {
    marginBottom: Spacing.xl,
  },
  sectionTitleModern: {
    ...Typography.h3,
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
  },
  quickActionsGridModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionCardModern: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.neutral[0],
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  actionCardTitleModern: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.neutral[900],
    textAlign: 'center',
  },
  actionCardSubtitleModern: {
    ...Typography.bodySmall,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  profileDetailsModern: {
    marginBottom: Spacing.xl,
  },
  profileDetailsCardModern: {
    gap: Spacing.md,
  },
  detailRowModern: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  detailLeftModern: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailRightModern: {
    flex: 1,
  },
  detailLabelModern: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: Spacing.xs,
  },
  detailValueModern: {
    ...Typography.bodyMedium,
    color: Colors.neutral[600],
    lineHeight: 22,
  },
  skillsRowModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  skillChipModern: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  skillTextModern: {
    ...Typography.bodySmall,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  emptyValueModern: {
    ...Typography.bodyMedium,
    color: Colors.neutral[400],
    fontStyle: 'italic',
  },

  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Content Styles
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  overviewTab: {
    padding: 16,
  },
  progressTab: {
    padding: 16,
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // Profile Details
  profileDetailsSection: {
    marginBottom: 24,
  },
  profileDetailsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailItem: {
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  detailValue: {
    fontSize: 15,
    color: '#666',
    marginLeft: 44,
    lineHeight: 22,
  },
  emptyValue: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 44,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  skillChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  skillText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
});