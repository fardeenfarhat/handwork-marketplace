import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NotificationPreferences, NotificationStackParamList } from '../../types';
import { Gradients, Colors, Spacing, BorderRadius, Typography, Shadows } from '@/styles/DesignSystem';
import apiService from '../../services/api';
import { useErrorHandler } from '../../hooks/useErrorHandler';

type NotificationSettingsNavigationProp = NativeStackNavigationProp<NotificationStackParamList, 'NotificationSettings'>;

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  enabled: boolean;
  settings: Array<{
    key: keyof NotificationPreferences;
    label: string;
    description: string;
    value: boolean;
  }>;
}

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NotificationSettingsNavigationProp>();
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
  const [refreshing, setRefreshing] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showQuietHoursModal, setShowQuietHoursModal] = useState(false);
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);
  const [animatedValues] = useState({
    fadeIn: new Animated.Value(0),
    slideIn: new Animated.Value(50),
  });
  const { handleError } = useErrorHandler();

  useEffect(() => {
    loadPreferences();
    
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(animatedValues.fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues.slideIn, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const notificationCategories: NotificationCategory[] = [
    {
      id: 'work',
      title: 'Work & Jobs',
      description: 'Updates about your jobs and applications',
      icon: 'briefcase',
      color: '#007AFF',
      enabled: preferences.jobUpdates,
      settings: [
        {
          key: 'jobUpdates',
          label: 'Job Updates',
          description: 'Status changes for your jobs and applications',
          value: preferences.jobUpdates,
        },
        {
          key: 'bookings',
          label: 'Bookings',
          description: 'Booking confirmations and updates',
          value: preferences.bookings,
        },
      ],
    },
    {
      id: 'communication',
      title: 'Communication',
      description: 'Messages and conversations',
      icon: 'chatbubbles',
      color: '#34C759',
      enabled: preferences.messages,
      settings: [
        {
          key: 'messages',
          label: 'Messages',
          description: 'New messages from clients or workers',
          value: preferences.messages,
        },
      ],
    },
    {
      id: 'financial',
      title: 'Payments & Finance',
      description: 'Payment confirmations and updates',
      icon: 'card',
      color: '#FF9500',
      enabled: preferences.payments,
      settings: [
        {
          key: 'payments',
          label: 'Payments',
          description: 'Payment confirmations and updates',
          value: preferences.payments,
        },
      ],
    },
    {
      id: 'social',
      title: 'Reviews & Social',
      description: 'Reviews, ratings, and social updates',
      icon: 'star',
      color: '#FFD700',
      enabled: preferences.reviews,
      settings: [
        {
          key: 'reviews',
          label: 'Reviews',
          description: 'New reviews and ratings',
          value: preferences.reviews,
        },
      ],
    },
    {
      id: 'marketing',
      title: 'Marketing & Promotions',
      description: 'Promotional offers and updates',
      icon: 'megaphone',
      color: '#FF3B30',
      enabled: preferences.marketing,
      settings: [
        {
          key: 'marketing',
          label: 'Marketing',
          description: 'Promotional offers and updates',
          value: preferences.marketing,
        },
      ],
    },
  ];

  const loadPreferences = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Add cache busting to ensure fresh data
      const prefs = await apiService.getNotificationPreferences();
      console.log('Loaded preferences from API:', prefs);
      
      // If we already have loaded initially and this isn't a manual refresh, 
      // only update if the API returned actual data
      if (hasLoadedInitially && !isRefresh && (!prefs || Object.keys(prefs as any).length === 0)) {
        console.log('Skipping update - no API data and already loaded initially');
        return;
      }
      
      // Only apply defaults for missing properties, not override existing ones
      const defaultPrefs = {
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
      };
      
      // Merge preferences, only using defaults for undefined/null values
      const mergedPrefs: any = {};
      Object.keys(defaultPrefs).forEach(key => {
        const prefKey = key as keyof NotificationPreferences;
        const apiValue = (prefs as any)?.[prefKey];
        
        // Use API value if it exists and is not null/undefined, otherwise use default
        if (apiValue !== null && apiValue !== undefined) {
          mergedPrefs[prefKey] = apiValue;
        } else {
          mergedPrefs[prefKey] = defaultPrefs[prefKey];
        }
      });
      
      setPreferences(mergedPrefs);
      setHasLoadedInitially(true);
    } catch (error) {
      handleError(error, 'Failed to load notification preferences');
      // On error, keep current preferences or use defaults if none exist
      setPreferences(prev => prev.jobUpdates !== undefined ? prev : {
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [handleError]);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      setSaving(true);
      const updated = { ...preferences, ...newPreferences };
      
      // Update the API first
      await apiService.updateNotificationPreferences(updated);
      
      // Only update local state after successful API call
      setPreferences(updated);
      
      // Optional: Show success feedback
      console.log('Preferences updated successfully:', updated);
    } catch (error) {
      handleError(error, 'Failed to update notification preferences');
      // Don't update local state if API call failed
      console.error('Failed to update preferences:', error);
    } finally {
      setSaving(false);
    }
  }, [preferences, handleError]);

  const handleToggle = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    updatePreferences({ [key]: value });
  }, [updatePreferences]);

  const handleRefresh = useCallback(() => {
    loadPreferences(true);
  }, [loadPreferences]);

  const getEnabledCount = useCallback(() => {
    const enabledSettings = [
      preferences.jobUpdates,
      preferences.messages,
      preferences.payments,
      preferences.reviews,
      preferences.bookings,
    ].filter(Boolean).length;
    return enabledSettings;
  }, [preferences]);

  const handleTimeChange = useCallback((
    event: any,
    selectedTime: Date | undefined,
    type: 'start' | 'end'
  ) => {
    // Always close the picker first
    if (type === 'start') {
      setShowStartTimePicker(false);
    } else {
      setShowEndTimePicker(false);
    }
    
    // Only update if we have a valid selected time and the event wasn't dismissed
    if (selectedTime && event?.type !== 'dismissed') {
      try {
        const hours = selectedTime.getHours();
        const minutes = selectedTime.getMinutes();
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const key = type === 'start' ? 'quietHoursStart' : 'quietHoursEnd';
        updatePreferences({ [key]: timeString });
      } catch (error) {
        console.error('Error handling time change:', error);
      }
    }
  }, [updatePreferences]);

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
              await apiService.clearNotificationHistory();
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
    try {
      if (!timeString || typeof timeString !== 'string') {
        const date = new Date();
        date.setHours(22, 0, 0, 0); // Default to 22:00
        return date;
      }
      
      const [hours, minutes] = timeString.split(':').map(Number);
      
      // Validate hours and minutes
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        const date = new Date();
        date.setHours(22, 0, 0, 0); // Default to 22:00
        return date;
      }
      
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch (error) {
      console.error('Error parsing time string:', timeString, error);
      const date = new Date();
      date.setHours(22, 0, 0, 0); // Default to 22:00
      return date;
    }
  };

  const renderCategoryCard = (category: NotificationCategory) => (
    <View key={category.id} style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
          <Ionicons name={category.icon} size={24} color={category.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
        <Switch
          value={category.enabled}
          onValueChange={(value) => handleToggle(category.settings[0].key, value)}
          disabled={saving || !preferences.pushEnabled}
          trackColor={{ false: '#E5E5EA', true: category.color + '40' }}
          thumbColor={category.enabled ? category.color : '#FFFFFF'}
        />
      </View>
      
      {category.settings.length > 1 && category.enabled && (
        <View style={styles.categorySettings}>
          {category.settings.slice(1).map((setting) => (
            <View key={setting.key} style={styles.subSettingItem}>
              <View style={styles.subSettingInfo}>
                <Text style={styles.subSettingLabel}>{setting.label}</Text>
                <Text style={styles.subSettingDescription}>{setting.description}</Text>
              </View>
              <Switch
                value={setting.value}
                onValueChange={(value) => handleToggle(setting.key, value)}
                disabled={saving || !preferences.pushEnabled}
                trackColor={{ false: '#E5E5EA', true: category.color + '40' }}
                thumbColor={setting.value ? category.color : '#FFFFFF'}
                style={styles.subSwitch}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderQuietHoursModal = () => (
    <Modal
      visible={showQuietHoursModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowQuietHoursModal(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => setShowQuietHoursModal(false)}
      >
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quiet Hours</Text>
            <TouchableOpacity
              onPress={() => setShowQuietHoursModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalDescription}>
            During quiet hours, you'll only receive urgent notifications like important messages and payment confirmations.
          </Text>

          <View style={styles.timePickerContainer}>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => {
                if (showQuietHoursModal) {
                  setShowStartTimePicker(true);
                }
              }}
            >
              <Text style={styles.timePickerLabel}>Start Time</Text>
              <Text style={styles.timePickerValue}>{preferences.quietHoursStart || '22:00'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => {
                if (showQuietHoursModal) {
                  setShowEndTimePicker(true);
                }
              }}
            >
              <Text style={styles.timePickerLabel}>End Time</Text>
              <Text style={styles.timePickerValue}>{preferences.quietHoursEnd || '08:00'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#F093FB', '#F5576C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Settings</Text>
                <Text style={styles.headerSubtitle}>Notification Preferences</Text>
              </View>
              <View style={styles.headerRight} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#F093FB', '#F5576C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Settings</Text>
              <Text style={styles.headerSubtitle}>Notification Preferences</Text>
            </View>
            <View style={styles.headerRight} />
          </View>

          {/* Stats in Header */}
          <View style={styles.headerStats}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{getEnabledCount()}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
            <View style={[styles.statCard, { flex: 1.5 }]}>
              <View style={styles.pushToggle}>
                <Ionicons 
                  name={preferences.pushEnabled ? "notifications" : "notifications-off"} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Switch
                  value={preferences.pushEnabled}
                  onValueChange={(value) => handleToggle('pushEnabled', value)}
                  disabled={saving}
                  trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.5)' }}
                  thumbColor="#FFFFFF"
                  style={styles.pushSwitch}
                />
              </View>
              <Text style={styles.statLabel}>Push</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: animatedValues.fadeIn,
            transform: [{ translateY: animatedValues.slideIn }],
          },
        ]}
      >
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Overview Card */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Ionicons name="notifications" size={32} color="#007AFF" />
              <View style={styles.overviewInfo}>
                <Text style={styles.overviewTitle}>Notification Center</Text>
                <Text style={styles.overviewSubtitle}>
                  {getEnabledCount()} of 5 categories enabled
                </Text>
              </View>
              <View style={styles.masterToggleContainer}>
                <Text style={styles.masterToggleLabel}>Push</Text>
                <Switch
                  value={preferences.pushEnabled}
                  onValueChange={(value) => handleToggle('pushEnabled', value)}
                  disabled={saving}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF40' }}
                  thumbColor={preferences.pushEnabled ? '#007AFF' : '#FFFFFF'}
                />
              </View>
            </View>
            
            {!preferences.pushEnabled && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={16} color="#FF9500" />
                <Text style={styles.warningText}>
                  Push notifications are disabled. Enable to receive notifications.
                </Text>
              </View>
            )}
          </View>

          {/* Notification Categories */}
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Notification Categories</Text>
            {notificationCategories.map(renderCategoryCard)}
          </View>

          {/* Delivery Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Methods</Text>
            
            <View style={styles.deliveryCard}>
              <View style={styles.deliveryMethod}>
                <View style={styles.deliveryMethodIcon}>
                  <Ionicons name="mail" size={20} color="#007AFF" />
                </View>
                <View style={styles.deliveryMethodInfo}>
                  <Text style={styles.deliveryMethodLabel}>Email</Text>
                  <Text style={styles.deliveryMethodDescription}>Weekly digest</Text>
                </View>
                <Switch
                  value={preferences.emailEnabled}
                  onValueChange={(value) => handleToggle('emailEnabled', value)}
                  disabled={saving}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF40' }}
                  thumbColor={preferences.emailEnabled ? '#007AFF' : '#FFFFFF'}
                />
              </View>

              <View style={styles.deliveryMethod}>
                <View style={styles.deliveryMethodIcon}>
                  <Ionicons name="chatbubble" size={20} color="#34C759" />
                </View>
                <View style={styles.deliveryMethodInfo}>
                  <Text style={styles.deliveryMethodLabel}>SMS</Text>
                  <Text style={styles.deliveryMethodDescription}>Urgent only</Text>
                </View>
                <Switch
                  value={preferences.smsEnabled}
                  onValueChange={(value) => handleToggle('smsEnabled', value)}
                  disabled={saving}
                  trackColor={{ false: '#E5E5EA', true: '#34C75940' }}
                  thumbColor={preferences.smsEnabled ? '#34C759' : '#FFFFFF'}
                />
              </View>
            </View>
          </View>

          {/* Schedule & Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule & Controls</Text>
            
            <TouchableOpacity
              style={styles.scheduleCard}
              onPress={() => {
                if (preferences.quietHoursEnabled) {
                  setShowQuietHoursModal(true);
                }
              }}
              disabled={saving}
            >
              <View style={styles.scheduleIcon}>
                <Ionicons 
                  name={preferences.quietHoursEnabled ? "moon" : "moon-outline"} 
                  size={20} 
                  color={preferences.quietHoursEnabled ? "#5856D6" : "#8E8E93"} 
                />
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleLabel}>Quiet Hours</Text>
                <Text style={styles.scheduleDescription}>
                  {preferences.quietHoursEnabled 
                    ? `${preferences.quietHoursStart || '22:00'} - ${preferences.quietHoursEnd || '08:00'}`
                    : 'Disabled'
                  }
                </Text>
              </View>
              <Switch
                value={preferences.quietHoursEnabled}
                onValueChange={(value) => handleToggle('quietHoursEnabled', value)}
                disabled={saving}
                trackColor={{ false: '#E5E5EA', true: '#5856D640' }}
                thumbColor={preferences.quietHoursEnabled ? '#5856D6' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Management</Text>
            
            <TouchableOpacity
              style={styles.actionCard}
              onPress={clearNotificationHistory}
              disabled={saving}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Clear History</Text>
                <Text style={styles.actionDescription}>Remove all notification history</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </Animated.View>

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

      {renderQuietHoursModal()}

      {saving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingContainer}>
            <ActivityIndicator size="small" color={Colors.primary[500]} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
  },
  // Gradient Header
  headerGradient: {
    paddingBottom: Spacing[5],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: Spacing[1],
  },
  headerRight: {
    width: 44,
    height: 44,
  },
  headerStats: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[4],
    gap: Spacing[2],
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: Spacing[1],
    fontWeight: '600' as const,
  },
  pushToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  pushSwitch: {
    transform: [{ scale: 0.9 }],
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[4],
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
  },
  
  // Sections
  categoriesSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  section: {
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[5],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[3],
  },
  
  // Category Cards
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing[3],
    overflow: 'hidden',
    ...Shadows.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  categoryDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  categorySettings: {
    backgroundColor: Colors.neutral[50],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  categorySettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  categorySettingInfo: {
    flex: 1,
    marginRight: Spacing[2],
  },
  categorySettingLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.neutral[800],
    marginBottom: Spacing[1],
  },
  categorySettingDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
    lineHeight: 16,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    justifyContent: 'center',
    backgroundColor: Colors.neutral[50],
  },
  expandButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.primary[500],
    marginRight: Spacing[1],
  },
  
  // Sub Settings (for expanded categories)
  subSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  subSettingInfo: {
    flex: 1,
    marginRight: Spacing[2],
  },
  subSettingLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.neutral[800],
    marginBottom: Spacing[1],
  },
  subSettingDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
    lineHeight: 16,
  },
  subSwitch: {
    transform: [{ scale: 0.9 }],
  },
  
  // Overview Card (for old UI compat)
  overviewCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    marginBottom: Spacing[3],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    ...Shadows.lg,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  overviewInfo: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  overviewSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  masterToggleContainer: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  masterToggleLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600' as const,
    color: Colors.neutral[600],
    textTransform: 'uppercase',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning[50],
    marginTop: Spacing[4],
    padding: Spacing[3],
    borderRadius: BorderRadius.lg,
    gap: Spacing[2],
  },
  warningText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.warning[600],
    lineHeight: 20,
  },
  
  // Delivery Methods
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  deliveryMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  deliveryMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  deliveryMethodInfo: {
    flex: 1,
  },
  deliveryMethodLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  deliveryMethodDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  
  // Schedule Card
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    ...Shadows.lg,
  },
  scheduleIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  scheduleDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  
  // Action Card
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    ...Shadows.lg,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.danger[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  actionDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
  },
  
  // Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[4],
    textAlign: 'center',
  },
  timePickerValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginHorizontal: Spacing[5],
    width: '85%',
    maxWidth: 400,
    ...Shadows.xl,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[5],
    textAlign: 'center',
  },
  timePickerContainer: {
    marginBottom: Spacing[4],
  },
  timePickerLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.neutral[700],
    marginBottom: Spacing[2],
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  timePickerText: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    fontWeight: '600' as const,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: Colors.neutral[200],
  },
  modalSaveButton: {
    backgroundColor: Colors.primary[500],
  },
  modalButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
  },
  modalCancelText: {
    color: Colors.neutral[700],
  },
  modalSaveText: {
    color: '#FFFFFF',
  },
  
  // Saving Overlay
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    ...Shadows.xl,
  },
  savingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    fontWeight: '600' as const,
  },
  
  bottomSpacing: {
    height: Spacing[6] * 2,
  },
});

export default NotificationSettingsScreen;
