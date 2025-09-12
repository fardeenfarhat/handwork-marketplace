import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '@/store';
import { MainTabNavigationProp } from '@/types';

export default function DashboardScreen() {
  const navigation = useNavigation<MainTabNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  const isWorker = user?.role === 'worker';

  const handleFindJobs = () => {
    if (isWorker) {
      // Workers: Navigate to Jobs tab to find work
      navigation.navigate('Jobs');
    } else {
      // Clients: Navigate to JobPost screen to post a job
      navigation.navigate('Jobs', {
        screen: 'JobPost'
      } as any);
    }
  };

  const handleMessages = () => {
    navigation.navigate('Messages');
  };

  const handleProfile = () => {
    // Navigate to profile edit screen based on user role
    if (isWorker) {
      navigation.navigate('Profile', {
        screen: 'WorkerProfileEdit'
      } as any);
    } else {
      navigation.navigate('Profile', {
        screen: 'ClientProfileEdit'
      } as any);
    }
  };

  const handleEarnings = () => {
    // Navigate to payments/earnings section
    try {
      navigation.navigate('Payments');
    } catch (error) {
      // If Payments tab doesn't exist, navigate to Profile instead
      console.log('Payments tab not available, navigating to Profile');
      navigation.navigate('Profile');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Welcome back, {user?.firstName}! 👋
          </Text>
          <Text style={styles.subtitle}>
            {isWorker 
              ? "Ready to find your next job?" 
              : "Ready to hire skilled workers?"
            }
          </Text>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleFindJobs}>
              <Ionicons 
                name={isWorker ? "search" : "add-circle"} 
                size={32} 
                color="#007AFF" 
              />
              <Text style={styles.actionTitle}>
                {isWorker ? "Find Jobs" : "Post Job"}
              </Text>
              <Text style={styles.actionSubtitle}>
                {isWorker 
                  ? "Browse available opportunities" 
                  : "Hire skilled workers"
                }
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleMessages}>
              <Ionicons name="chatbubbles" size={32} color="#34C759" />
              <Text style={styles.actionTitle}>Messages</Text>
              <Text style={styles.actionSubtitle}>
                Check your conversations
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleProfile}>
              <Ionicons name="person" size={32} color="#FF9500" />
              <Text style={styles.actionTitle}>Profile</Text>
              <Text style={styles.actionSubtitle}>
                Update your information
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleEarnings}>
              <Ionicons name="card" size={32} color="#AF52DE" />
              <Text style={styles.actionTitle}>
                {isWorker ? "Earnings" : "Payments"}
              </Text>
              <Text style={styles.actionSubtitle}>
                {isWorker ? "Track your income" : "Manage payments"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>
                {isWorker ? "Jobs Completed" : "Jobs Posted"}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>⭐ 0.0</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  quickActions: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});