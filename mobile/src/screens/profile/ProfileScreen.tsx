import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  StatusBar,
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

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Animate entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  // Reload profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 PROFILE SCREEN: Screen focused, reloading profile...');
      loadProfile();
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
          const defaultProfile: ClientProfile = {
            id: 0,
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
      
      // Fetch review count
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
      <LinearGradient colors={Gradients.orangeBlue} style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!user || !profile) {
    return (
      <LinearGradient colors={Gradients.orangeBlue} style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={64} color="#FFFFFF" />
          <Text style={styles.errorText}>Unable to load profile</Text>
          <ModernButton title="Retry" onPress={loadProfile} variant="outline" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[500]} />
      
      {/* Gradient Background */}
      <LinearGradient colors={Gradients.orangeBlue} style={styles.gradientBackground}>
        {/* Decorative Circles */}
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LinearGradient
                colors={[Colors.danger[500], Colors.danger[600]]}
                style={styles.logoutGradient}
              >
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <ModernCard variant="elevated" style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarSection}>
                <LinearGradient
                  colors={Gradients.primaryOrange}
                  style={styles.avatarGradient}
                >
                  <Ionicons name="person" size={40} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.onlineIndicator} />
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.profileRole}>
                  {user?.role === 'worker' ? 'Service Provider' : 'Client'}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color={Colors.warning[500]} />
                  <Text style={styles.ratingText}>
                    {profile ? ((profile as any)?.rating ?? 0).toFixed(1) : '0.0'}
                  </Text>
                  <Text style={styles.reviewCount}>({reviewCount} reviews)</Text>
                </View>
              </View>

              <ModernButton
                title="Edit"
                onPress={handleEditProfile}
                size="sm"
                variant="primary"
                style={styles.editButton}
              />
            </View>
          </ModernCard>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <ModernCard variant="elevated" style={styles.statCard}>
              <LinearGradient
                colors={Gradients.primaryOrange}
                style={styles.statIconContainer}
              >
                <Ionicons name="briefcase-outline" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.statValue}>
                {user?.role === 'worker'
                  ? (profile as any)?.totalJobs || 0
                  : (profile as any)?.totalJobsPosted || 0}
              </Text>
              <Text style={styles.statLabel}>
                {user?.role === 'worker' ? 'Jobs Completed' : 'Jobs Posted'}
              </Text>
            </ModernCard>

            <ModernCard variant="elevated" style={styles.statCard}>
              <LinearGradient
                colors={Gradients.orangeWarm}
                style={styles.statIconContainer}
              >
                <Ionicons name="star-outline" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.statValue}>{reviewCount}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </ModernCard>

            {user?.role === 'worker' && (
              <ModernCard variant="elevated" style={styles.statCard}>
                <LinearGradient
                  colors={
                    (profile as any)?.kycStatus === 'approved'
                      ? Gradients.primaryBlue
                      : Gradients.orangeWarm
                  }
                  style={styles.statIconContainer}
                >
                  <Ionicons
                    name={
                      (profile as any)?.kycStatus === 'approved'
                        ? 'shield-checkmark'
                        : 'shield-outline'
                    }
                    size={24}
                    color="#FFFFFF"
                  />
                </LinearGradient>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        (profile as any)?.kycStatus === 'approved'
                          ? Colors.success[600]
                          : Colors.warning[600],
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {(profile as any)?.kycStatus === 'approved' ? 'Verified' : 'Pending'}
                </Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  KYC Status
                </Text>
              </ModernCard>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'view' && styles.activeTab]}
              onPress={() => setActiveTab('view')}
            >
              {activeTab === 'view' ? (
                <LinearGradient colors={Gradients.primaryOrange} style={styles.tabGradient}>
                  <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.activeTabText}>Overview</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTabContent}>
                  <Ionicons name="eye-outline" size={18} color={Colors.neutral[500]} />
                  <Text style={styles.tabText}>Overview</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'progress' && styles.activeTab]}
              onPress={() => setActiveTab('progress')}
            >
              {activeTab === 'progress' ? (
                <LinearGradient colors={Gradients.primaryOrange} style={styles.tabGradient}>
                  <Ionicons name="trending-up-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.activeTabText}>Progress</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTabContent}>
                  <Ionicons name="trending-up-outline" size={18} color={Colors.neutral[500]} />
                  <Text style={styles.tabText}>Progress</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'view' ? (
              <View style={styles.overview}>
                {/* Quick Actions */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                  <View style={styles.quickActionsGrid}>
                    <TouchableOpacity
                      style={styles.actionCard}
                      onPress={() =>
                        (navigation as any).navigate('Reviews', {
                          screen: 'ReviewsList',
                          params: { userId: user.id },
                        })
                      }
                    >
                      <LinearGradient
                        colors={Gradients.orangeWarm}
                        style={styles.actionIconContainer}
                      >
                        <Ionicons name="star" size={24} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={styles.actionCardTitle}>My Reviews</Text>
                      <Text style={styles.actionCardSubtitle}>View feedback</Text>
                    </TouchableOpacity>

                    {user?.role === 'worker' && (
                      <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Portfolio')}
                      >
                        <LinearGradient
                          colors={Gradients.primaryBlue}
                          style={styles.actionIconContainer}
                        >
                          <Ionicons name="images-outline" size={24} color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={styles.actionCardTitle}>Portfolio</Text>
                        <Text style={styles.actionCardSubtitle}>Showcase work</Text>
                      </TouchableOpacity>
                    )}

                    {user?.role === 'worker' &&
                      ((profile as any)?.kycStatus !== 'approved' ? (
                        <TouchableOpacity
                          style={styles.actionCard}
                          onPress={() => navigation.navigate('KYCUpload')}
                        >
                          <LinearGradient
                            colors={Gradients.orangeWarm}
                            style={styles.actionIconContainer}
                          >
                            <Ionicons
                              name="shield-checkmark-outline"
                              size={24}
                              color="#FFFFFF"
                            />
                          </LinearGradient>
                          <Text style={styles.actionCardTitle}>Complete KYC</Text>
                          <Text style={styles.actionCardSubtitle}>Verification needed</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.actionCard, styles.actionCardDisabled]}>
                          <LinearGradient
                            colors={Gradients.primaryBlue}
                            style={styles.actionIconContainer}
                          >
                            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
                          </LinearGradient>
                          <Text style={styles.actionCardTitle}>Verified</Text>
                          <Text style={styles.actionCardSubtitle}>KYC complete</Text>
                        </View>
                      ))}
                  </View>
                </View>

                {/* Profile Details */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <ModernCard variant="elevated" style={styles.detailsCard}>
                    {user?.role === 'worker' ? (
                      <>
                        <View style={styles.detailRow}>
                          <LinearGradient
                            colors={Gradients.primaryOrange}
                            style={styles.detailIconContainer}
                          >
                            <Ionicons name="person-outline" size={18} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Bio</Text>
                            <Text style={styles.detailValue}>
                              {(profile as any)?.bio || 'No bio added yet'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.detailRow}>
                          <LinearGradient
                            colors={Gradients.primaryBlue}
                            style={styles.detailIconContainer}
                          >
                            <Ionicons name="location-outline" size={18} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Location</Text>
                            <Text style={styles.detailValue}>
                              {(profile as any)?.location || 'Location not specified'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.detailRow}>
                          <LinearGradient
                            colors={Gradients.orangeWarm}
                            style={styles.detailIconContainer}
                          >
                            <Ionicons name="build-outline" size={18} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Skills</Text>
                            <View style={styles.skillsContainer}>
                              {((profile as any)?.skills || []).length > 0 ? (
                                (profile as any).skills.map((skill: string, i: number) => (
                                  <View key={i} style={styles.skillChip}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                  </View>
                                ))
                              ) : (
                                <Text style={styles.emptyValue}>No skills added yet</Text>
                              )}
                            </View>
                          </View>
                        </View>

                        <View style={styles.detailRow}>
                          <LinearGradient
                            colors={Gradients.primaryBlue}
                            style={styles.detailIconContainer}
                          >
                            <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Hourly Rate</Text>
                            <Text style={styles.detailValue}>
                              ${(profile as any)?.hourlyRate || 0}/hour
                            </Text>
                          </View>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.detailRow}>
                          <LinearGradient
                            colors={Gradients.primaryOrange}
                            style={styles.detailIconContainer}
                          >
                            <Ionicons name="business-outline" size={18} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Company</Text>
                            <Text style={styles.detailValue}>
                              {(profile as any)?.companyName || 'No company specified'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.detailRow}>
                          <LinearGradient
                            colors={Gradients.primaryBlue}
                            style={styles.detailIconContainer}
                          >
                            <Ionicons
                              name="document-text-outline"
                              size={18}
                              color="#FFFFFF"
                            />
                          </LinearGradient>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Description</Text>
                            <Text style={styles.detailValue}>
                              {(profile as any)?.description || 'No description added yet'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.detailRow}>
                          <LinearGradient
                            colors={Gradients.orangeWarm}
                            style={styles.detailIconContainer}
                          >
                            <Ionicons name="location-outline" size={18} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Location</Text>
                            <Text style={styles.detailValue}>
                              {(profile as any)?.location || 'Location not specified'}
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                  </ModernCard>
                </View>
              </View>
            ) : (
              <View style={styles.progressTab}>
                <ProfileProgress
                  profile={profile}
                  userType={user.role}
                  onStepPress={handleStepPress}
                />
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    top: 100,
    left: -30,
  },
  circle3: {
    width: 100,
    height: 100,
    top: 250,
    right: 50,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingTop: Spacing[2],
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  logoutButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  logoutGradient: {
    padding: Spacing[2],
    borderRadius: BorderRadius.full,
  },
  profileCard: {
    marginBottom: Spacing[4],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  avatarSection: {
    position: 'relative',
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success[500],
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  profileRole: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
    marginBottom: Spacing[1],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  ratingText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
  },
  reviewCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
  },
  editButton: {
    minWidth: 70,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: Spacing[4],
    gap: Spacing[2],
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[1],
  },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    textAlign: 'center',
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
    textAlign: 'center',
    width: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing[1],
    marginBottom: Spacing[4],
    ...Shadows.sm,
  },
  tab: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    gap: Spacing[1],
  },
  inactiveTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    gap: Spacing[1],
  },
  activeTab: {},
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500' as const,
    color: Colors.neutral[600],
  },
  activeTabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing[8],
  },
  overview: {
    gap: Spacing[4],
  },
  section: {
    marginBottom: Spacing[4],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: Spacing[3],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    ...Shadows.base,
  },
  actionCardDisabled: {
    opacity: 0.8,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  actionCardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    textAlign: 'center',
    marginBottom: Spacing[1],
  },
  actionCardSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  detailsCard: {
    gap: Spacing[4],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.neutral[700],
    marginBottom: Spacing[1],
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    lineHeight: 22,
  },
  emptyValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[400],
    fontStyle: 'italic',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginTop: Spacing[1],
  },
  skillChip: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  skillText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary[600],
    fontWeight: '500' as const,
  },
  progressTab: {
    paddingVertical: Spacing[4],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: Spacing[5],
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    alignItems: 'center',
    gap: Spacing[5],
    paddingHorizontal: Spacing[8],
  },
  errorText: {
    fontSize: Typography.fontSize.xl,
    color: '#FFFFFF',
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
