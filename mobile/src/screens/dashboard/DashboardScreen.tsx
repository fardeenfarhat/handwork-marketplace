import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '@/store';
import { MainTabNavigationProp } from '@/types';
import { apiService } from '../../services/api';
import { Gradients } from '@/styles/DesignSystem';

interface DashboardStats {
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  unreadMessages: number;
}

interface RecentActivity {
  id: string;
  type: 'job_applied' | 'job_completed' | 'message_received' | 'payment_received' | 'review_received';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
}

export default function DashboardScreen() {
  const navigation = useNavigation<MainTabNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  const isWorker = user?.role === 'worker';
  
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    completedJobs: 0,
    activeJobs: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalReviews: 0,
    unreadMessages: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} days ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  const fetchDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      
      // Fetch real dashboard data from API
      const dashboardData = await apiService.getDashboardData();
      
      setStats({
        totalJobs: dashboardData.stats.total_jobs || 0,
        completedJobs: dashboardData.stats.completed_jobs || 0,
        activeJobs: dashboardData.stats.active_jobs || 0,
        totalEarnings: dashboardData.stats.total_earnings || 0,
        averageRating: dashboardData.stats.average_rating || 0,
        totalReviews: dashboardData.stats.total_reviews || 0,
        unreadMessages: dashboardData.stats.unread_messages || 0,
      });
      
      // Transform backend activity data to match frontend format
      const activities = dashboardData.recent_activity?.map((activity: any) => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        timestamp: formatRelativeTime(activity.timestamp),
        amount: activity.amount,
      })) || [];
      
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert(
        'Loading Error',
        'Could not load dashboard data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };



  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleFindJobs = () => {
    if (isWorker) {
      // Workers: Navigate to Jobs tab to find work
      navigation.navigate('Jobs');
    } else {
      // Clients: Navigate to JobPost screen to post a job
      navigation.navigate('Jobs', {
        screen: 'JobPost'
      });
    }
  };

  const handleProfile = () => {
    // Navigate to Profile tab
    navigation.navigate('Profile');
  };

  const handleEarnings = () => {
    // Navigate to Payments tab (Earnings for workers, Payment Methods for clients)
    navigation.navigate('Payments');
  };

  const renderActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'job_applied':
        return <Ionicons name="briefcase" size={20} color="#007AFF" />;
      case 'job_completed':
        return <Ionicons name="checkmark-circle" size={20} color="#34C759" />;
      case 'message_received':
        return <Ionicons name="chatbubble" size={20} color="#FF9500" />;
      case 'payment_received':
        return <Ionicons name="card" size={20} color="#AF52DE" />;
      case 'review_received':
        return <Ionicons name="star" size={20} color="#FFD700" />;
      default:
        return <Ionicons name="information-circle" size={20} color="#666" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={Gradients.orangeBlue}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea}>
      {/* Decorative Circles */}
      <View style={styles.decorativeContainer}>
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>
            Welcome back, {user?.firstName}! 👋
          </Text>
          <Text style={styles.subtitle}>
            {isWorker 
              ? "Here's what's happening with your work" 
              : "Manage your projects and team"
            }
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* Key Stats Overview */}
        <View style={styles.statsOverview}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.primaryStatCard}>
              <View style={styles.primaryStatIcon}>
                <Ionicons 
                  name={isWorker ? "wallet" : "briefcase"} 
                  size={32} 
                  color={isWorker ? "#FF6B35" : "#4A90E2"} 
                />
              </View>
              <Text style={styles.primaryStatNumber}>
                {isWorker ? `$${stats.totalEarnings.toFixed(0)}` : stats.totalJobs}
              </Text>
              <Text style={styles.primaryStatLabel}>
                {isWorker ? "Total Earnings" : "Jobs Posted"}
              </Text>
              {isWorker && (
                <View style={styles.statTrend}>
                  <Ionicons name="trending-up" size={16} color="#34C759" />
                  <Text style={styles.trendText}>+12% this month</Text>
                </View>
              )}
              {!isWorker && stats.activeJobs > 0 && (
                <Text style={styles.primaryStatSubtext}>
                  {stats.activeJobs} active {stats.activeJobs === 1 ? 'job' : 'jobs'}
                </Text>
              )}
            </View>
            
            <View style={styles.statRow}>
              <View style={styles.smallStatCard}>
                <Ionicons 
                  name={isWorker ? "checkmark-circle" : "people"} 
                  size={24} 
                  color="#4A90E2" 
                  style={{marginBottom: 8}}
                />
                <Text style={styles.smallStatNumber}>
                  {isWorker ? stats.completedJobs : stats.completedJobs}
                </Text>
                <Text style={styles.smallStatLabel}>
                  {isWorker ? "Completed" : "Hired"}
                </Text>
              </View>
              <View style={styles.smallStatCard}>
                <Ionicons 
                  name={isWorker ? "star" : "star"} 
                  size={24} 
                  color="#FFD700" 
                  style={{marginBottom: 8}}
                />
                <Text style={styles.smallStatNumber}>
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '--'}
                </Text>
                <Text style={styles.smallStatLabel}>Rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.primaryActionCard} onPress={handleFindJobs}>
              <View style={styles.actionIconContainer}>
                <Ionicons 
                  name={isWorker ? "search" : "add-circle"} 
                  size={28} 
                  color="#fff" 
                />
              </View>
              <Text style={styles.primaryActionTitle}>
                {isWorker ? "Find New Jobs" : "Post a Job"}
              </Text>
              <Text style={styles.primaryActionSubtitle}>
                {isWorker 
                  ? "Discover opportunities near you" 
                  : "Get quality proposals quickly"
                }
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity style={styles.secondaryActionCard} onPress={handleProfile}>
                <Ionicons name="person-circle" size={32} color="#FF6B35" />
                <Text style={styles.secondaryActionTitle}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryActionCard} onPress={handleEarnings}>
                <Ionicons name="wallet" size={32} color="#4A90E2" />
                <Text style={styles.secondaryActionTitle}>
                  {isWorker ? "Earnings" : "Payments"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentActivity.map((activity) => (
            <TouchableOpacity key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                {renderActivityIcon(activity.type)}
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <Text style={styles.activityTimestamp}>{activity.timestamp}</Text>
              </View>
              {activity.amount && (
                <View style={styles.activityAmount}>
                  <Text style={styles.amountText}>+${activity.amount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips & Recommendations */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>
            {isWorker ? "Tips to Get More Jobs" : "Tips for Better Results"}
          </Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={24} color="#FF9500" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>
                {isWorker 
                  ? "Complete your profile to get 40% more job invites" 
                  : "Add detailed job descriptions to get better proposals"
                }
              </Text>
              <TouchableOpacity style={styles.tipAction}>
                <Text style={styles.tipActionText}>
                  {isWorker ? "Complete Profile" : "Learn More"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 200,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    top: '50%',
    right: -50,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  // Stats overview styles
  statsOverview: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryStatIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryStatNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 4,
  },
  primaryStatLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  primaryStatSubtext: {
    fontSize: 14,
    color: '#4A90E2',
    marginTop: 8,
    fontWeight: '500',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  statRow: {
    justifyContent: 'space-between',
    gap: 8,
  },
  smallStatCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  smallStatNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4A90E2',
    marginBottom: 4,
  },
  smallStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // Quick actions styles
  quickActions: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionGrid: {
    gap: 16,
  },
  primaryActionCard: {
    backgroundColor: '#FF6B35',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  actionIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryActionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  // Activity section styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activitySection: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  activityTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  activityAmount: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },

  // Tips section styles
  tipsSection: {
    padding: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  tipAction: {
    alignSelf: 'flex-start',
  },
  tipActionText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
  },
});