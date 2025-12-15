import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiService from '@/services/api';

interface StripeOnboardingDetails {
  connected: boolean;
  account_id?: string;
  email?: string;
  requirements?: any;
}

const BankAccountScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState<StripeOnboardingDetails>({ connected: false });
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const fetchOnboardingStatus = async () => {
    try {
      const resp = await apiService.getWorkerStripeAccount() as any;
      // Expecting { connected: boolean, account_id?: string, email?: string }
      setOnboarding({ connected: !!resp.connected, account_id: resp.account_id, email: resp.email, requirements: resp.requirements });
    } catch (error: any) {
      console.error('Error fetching Stripe onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    try {
      setConnecting(true);
      const resp = await apiService.createStripeOnboardingLink() as any;
      // resp should include { url }
      console.log('Onboarding response:', resp);
      
      if (resp && resp.url) {
        console.log('Opening URL:', resp.url);
        
        // Check if the URL can be opened
        const canOpen = await Linking.canOpenURL(resp.url);
        console.log('Can open URL:', canOpen);
        
        if (canOpen) {
          // Open the url in the system browser
          await Linking.openURL(resp.url);
          
          // Show a message to user
          Alert.alert(
            'Onboarding Started',
            'Please complete the Stripe onboarding in your browser. After completion, return here and tap "Refresh Connection Status".',
            [{ text: 'OK' }]
          );
        } else {
          // If can't open, show the URL to user
          Alert.alert(
            'Onboarding Link',
            'Please open this link in your browser:\n\n' + resp.url,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Copy Link', onPress: () => {
                // You might want to add clipboard functionality here
                console.log('URL to copy:', resp.url);
              }}
            ]
          );
        }
      } else {
        Alert.alert('Error', 'Failed to get onboarding link');
      }
    } catch (error: any) {
      console.error('Onboarding error', error);
      Alert.alert('Error', error?.message || 'Failed to start Stripe onboarding');
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshStatus = async () => {
    setLoading(true);
    await fetchOnboardingStatus();
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Stripe Account',
      'Are you sure you want to disconnect your Stripe account? You will need to reconnect to receive payouts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await apiService.disconnectStripeAccount();
              await fetchOnboardingStatus();
              Alert.alert('Success', 'Stripe account disconnected successfully');
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to disconnect account');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#11998E', '#38EF7D', '#06B49A']} style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#11998E', '#38EF7D', '#06B49A']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Stripe Connect</Text>
            <Text style={styles.headerSubtitle}>Connect your account for payouts</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons 
              name={onboarding.connected ? "checkmark-done" : "alert-circle"} 
              size={24} 
              color={onboarding.connected ? "#10b981" : "#f59e0b"} 
            />
            <Text style={styles.infoTitle}>
              {onboarding.connected ? 'Stripe Connected' : 'Connect with Stripe'}
            </Text>
          </View>
          {onboarding.connected ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account ID:</Text>
                <Text style={styles.infoValue}>{onboarding.account_id}</Text>
              </View>
              {onboarding.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{onboarding.email}</Text>
                </View>
              )}
              <Text style={styles.updateNote}>
                Your Stripe account is connected. Payouts will be sent to your connected account.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                To receive payouts you must connect your Stripe account. This will open Stripe's secure onboarding flow.
              </Text>
            </>
          )}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="card" size={18} color="#11998E" /> Payout Setup
          </Text>

          <View style={styles.testModeNotice}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.testModeText}>
              <Text style={{ fontWeight: '700' }}>Stripe Connect:</Text> Secure onboarding process managed by Stripe. Your bank details are handled directly by Stripe for maximum security.
            </Text>
          </View>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>Secure bank account verification</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="flash" size={20} color="#f59e0b" />
              <Text style={styles.featureText}>Fast payout processing</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="lock-closed" size={20} color="#667eea" />
              <Text style={styles.featureText}>PCI-compliant security</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="globe" size={20} color="#06b49a" />
              <Text style={styles.featureText}>International support</Text>
            </View>
          </View>
        </View>

        {!onboarding.connected ? (
          <TouchableOpacity onPress={handleStartOnboarding} disabled={connecting}>
            <LinearGradient
              colors={connecting ? ['#9ca3af', '#6b7280'] : ['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              {connecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="rocket" size={24} color="#fff" />
                  <Text style={styles.saveButtonText}>Connect with Stripe</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleRefreshStatus}>
            <LinearGradient
              colors={['#06b49a', '#11998e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Refresh Connection Status</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {onboarding.connected && (
          <TouchableOpacity onPress={handleDisconnect}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Disconnect Account</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Payouts are processed automatically after 14 days, or manually by admin.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginLeft: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  updateNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  testModeNotice: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  testModeText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    marginLeft: 10,
    lineHeight: 18,
  },
  featureList: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    marginLeft: 4,
  },
  securityNote: {
    flexDirection: 'row',
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#5b21b6',
    marginLeft: 12,
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  footer: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  footerText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
});

export default BankAccountScreen;
