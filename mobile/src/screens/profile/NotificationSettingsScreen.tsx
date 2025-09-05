import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { NotificationPreferences } from '../../types';
import notificationService from '../../services/notificationService';
import { useErrorHandler } from '../../hooks/useErrorHandler';

interface NotificationSettingsScreenProps {
  navigation: any;
}

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({
  navigation,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    jobUpdates: true,
    messages: true,
    payments: true,
    reviews: true,
    bookings: true,
    marketing: false,
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const { handleError } = useErrorHandler();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      setSaving(true);
      const updated = { ...preferences, ...newPreferences };
      await notificationService.updateNotificationPreferences(updated);
      setPreferences(updated);
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const handleTimeChange = (
    event: any,
    selectedTime: Date | undefined,
    type: 'start' | 'end'
  ) => {
    if (selectedTime) {
      const timeString = selectedTime.toTimeString().slice(0, 5);
      const key = type === 'start' ? 'quietHoursStart' : 'quietHoursEnd';
      updatePreferences({ [key]: timeString });
    }
    
    if (type === 'start') {
      setShowStartTimePicker(false);
    } else {
      setShowEndTimePicker(false);
    }
  };

  const clearNotificationHistory = async () => {
    Alert.alert(
      'Clear Notification History',
      'Are you sure you want to clear all notification history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.clearNotificationHistory();
              Alert.alert('Success', 'Notification history cleared successfully');
            } catch (error) {
              handleError(error);
            }
          },
        },
      ]
    );
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Push Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications on your device
              </Text>
            </View>
            <Switch
              value={preferences.pushEnabled}
              onValueChange={(value) => handleToggle('pushEnabled', value)}
              disabled={saving}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Job Updates</Text>
              <Text style={styles.settingDescription}>
                Status changes for your jobs
              </Text>
            </View>
            <Switch
              value={preferences.jobUpdates}
              onValueChange={(value) => handleToggle('jobUpdates', value)}
              disabled={saving || !preferences.pushEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Messages</Text>
              <Text style={styles.settingDescription}>
                New messages from clients or workers
              </Text>
            </View>
            <Switch
              value={preferences.messages}
              onValueChange={(value) => handleToggle('messages', value)}
              disabled={saving || !preferences.pushEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Payments</Text>
              <Text style={styles.settingDescription}>
                Payment confirmations and updates
              </Text>
            </View>
            <Switch
              value={preferences.payments}
              onValueChange={(value) => handleToggle('payments', value)}
              disabled={saving || !preferences.pushEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reviews</Text>
              <Text style={styles.settingDescription}>
                New reviews and ratings
              </Text>
            </View>
            <Switch
              value={preferences.reviews}
              onValueChange={(value) => handleToggle('reviews', value)}
              disabled={saving || !preferences.pushEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bookings</Text>
              <Text style={styles.settingDescription}>
                Booking confirmations and updates
              </Text>
            </View>
            <Switch
              value={preferences.bookings}
              onValueChange={(value) => handleToggle('bookings', value)}
              disabled={saving || !preferences.pushEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Marketing</Text>
              <Text style={styles.settingDescription}>
                Promotional offers and updates
              </Text>
            </View>
            <Switch
              value={preferences.marketing}
              onValueChange={(value) => handleToggle('marketing', value)}
              disabled={saving || !preferences.pushEnabled}
            />
          </View>
        </View>

        {/* Other Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Channels</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications via email
              </Text>
            </View>
            <Switch
              value={preferences.emailEnabled}
              onValueChange={(value) => handleToggle('emailEnabled', value)}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>SMS Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications via SMS
              </Text>
            </View>
            <Switch
              value={preferences.smsEnabled}
              onValueChange={(value) => handleToggle('smsEnabled', value)}
              disabled={saving}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
              <Text style={styles.settingDescription}>
                Disable notifications during specified hours
              </Text>
            </View>
            <Switch
              value={preferences.quietHoursEnabled}
              onValueChange={(value) => handleToggle('quietHoursEnabled', value)}
              disabled={saving}
            />
          </View>

          {preferences.quietHoursEnabled && (
            <>
              <TouchableOpacity
                style={styles.timeSettingItem}
                onPress={() => setShowStartTimePicker(true)}
                disabled={saving}
              >
                <Text style={styles.settingLabel}>Start Time</Text>
                <Text style={styles.timeValue}>{preferences.quietHoursStart}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timeSettingItem}
                onPress={() => setShowEndTimePicker(true)}
                disabled={saving}
              >
                <Text style={styles.settingLabel}>End Time</Text>
                <Text style={styles.timeValue}>{preferences.quietHoursEnd}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={clearNotificationHistory}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={styles.actionButtonText}>Clear Notification History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={parseTime(preferences.quietHoursStart)}
          mode="time"
          is24Hour={true}
          onChange={(event, time) => handleTimeChange(event, time, 'start')}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={parseTime(preferences.quietHoursEnd)}
          mode="time"
          is24Hour={true}
          onChange={(event, time) => handleTimeChange(event, time, 'end')}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  timeSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 12,
  },
});

export default NotificationSettingsScreen;