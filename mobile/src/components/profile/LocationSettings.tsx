import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocation } from '@/hooks/useLocation';
import { locationService } from '@/services/location';

interface LocationSettingsProps {
  onSettingsChange?: (settings: LocationPrivacySettings) => void;
}

export interface LocationPrivacySettings {
  shareLocation: boolean;
  shareExactLocation: boolean;
  locationRadius: number; // in miles
  trackingEnabled: boolean;
  showDistanceToJobs: boolean;
  allowLocationBasedRecommendations: boolean;
}

const RADIUS_OPTIONS = [
  { value: 1, label: '1 mile' },
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
];

export const LocationSettings: React.FC<LocationSettingsProps> = ({
  onSettingsChange,
}) => {
  const {
    hasPermission,
    requestPermission,
    currentLocation,
    startTracking,
    stopTracking,
  } = useLocation();

  const [settings, setSettings] = useState<LocationPrivacySettings>({
    shareLocation: false,
    shareExactLocation: false,
    locationRadius: 10,
    trackingEnabled: false,
    showDistanceToJobs: true,
    allowLocationBasedRecommendations: true,
  });

  useEffect(() => {
    // Load saved settings from storage
    loadSettings();
  }, []);

  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const loadSettings = async () => {
    try {
      // In a real app, load from AsyncStorage or API
      // For now, use defaults
      const hasLocationPermission =
        await locationService.checkLocationPermission();
      setSettings((prev) => ({
        ...prev,
        shareLocation: hasLocationPermission,
        trackingEnabled: hasLocationPermission,
      }));
    } catch (error) {
      console.error('Error loading location settings:', error);
    }
  };

  const saveSettings = async (newSettings: LocationPrivacySettings) => {
    try {
      // In a real app, save to AsyncStorage or API
      console.log('Saving location settings:', newSettings);
    } catch (error) {
      console.error('Error saving location settings:', error);
    }
  };

  const updateSetting = (key: keyof LocationPrivacySettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleLocationPermissionToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermission();
      if (granted) {
        updateSetting('shareLocation', true);
        updateSetting('trackingEnabled', true);
      } else {
        Alert.alert(
          'Permission Required',
          'Location permission is required to enable location sharing. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Settings',
              onPress: () => {
                /* Open settings */
              },
            },
          ]
        );
      }
    } else {
      updateSetting('shareLocation', false);
      updateSetting('shareExactLocation', false);
      updateSetting('trackingEnabled', false);
      stopTracking();
    }
  };

  const handleTrackingToggle = async (enabled: boolean) => {
    if (enabled && hasPermission) {
      try {
        await startTracking();
        updateSetting('trackingEnabled', true);
      } catch (error) {
        Alert.alert('Error', 'Failed to start location tracking');
      }
    } else {
      stopTracking();
      updateSetting('trackingEnabled', false);
    }
  };

  const clearLocationData = () => {
    Alert.alert(
      'Clear Location Data',
      'This will remove all stored location data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Clear cached location data
            locationService.cleanup();
            Alert.alert('Success', 'Location data has been cleared');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Sharing</Text>
        <Text style={styles.sectionDescription}>
          Control how your location is shared with the app and other users
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Share Location</Text>
            <Text style={styles.settingDescription}>
              Allow the app to access your location for job recommendations
            </Text>
          </View>
          <Switch
            value={settings.shareLocation}
            onValueChange={handleLocationPermissionToggle}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.shareLocation ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        {settings.shareLocation && (
          <>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Share Exact Location</Text>
                <Text style={styles.settingDescription}>
                  Share your precise location instead of approximate area
                </Text>
              </View>
              <Switch
                value={settings.shareExactLocation}
                onValueChange={(value) =>
                  updateSetting('shareExactLocation', value)
                }
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={settings.shareExactLocation ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Location Radius</Text>
                <Text style={styles.settingDescription}>
                  How precise your location appears to others
                </Text>
              </View>
            </View>

            <View style={styles.radiusOptions}>
              {RADIUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radiusOption,
                    settings.locationRadius === option.value &&
                      styles.radiusOptionSelected,
                  ]}
                  onPress={() => updateSetting('locationRadius', option.value)}
                >
                  <Text
                    style={[
                      styles.radiusOptionText,
                      settings.locationRadius === option.value &&
                        styles.radiusOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Tracking</Text>
        <Text style={styles.sectionDescription}>
          Control how the app tracks your location for better job matching
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Background Tracking</Text>
            <Text style={styles.settingDescription}>
              Keep location updated in the background for real-time job alerts
            </Text>
          </View>
          <Switch
            value={settings.trackingEnabled && hasPermission}
            onValueChange={handleTrackingToggle}
            disabled={!settings.shareLocation}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.trackingEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Show Distance to Jobs</Text>
            <Text style={styles.settingDescription}>
              Display how far away jobs are from your location
            </Text>
          </View>
          <Switch
            value={settings.showDistanceToJobs}
            onValueChange={(value) =>
              updateSetting('showDistanceToJobs', value)
            }
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.showDistanceToJobs ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>
              Location-Based Recommendations
            </Text>
            <Text style={styles.settingDescription}>
              Get job recommendations based on your location and travel patterns
            </Text>
          </View>
          <Switch
            value={settings.allowLocationBasedRecommendations}
            onValueChange={(value) =>
              updateSetting('allowLocationBasedRecommendations', value)
            }
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={
              settings.allowLocationBasedRecommendations ? '#f5dd4b' : '#f4f3f4'
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Location</Text>
        {currentLocation ? (
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              Latitude: {currentLocation.latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Longitude: {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text style={styles.locationNote}>
              Your location is being used to find nearby jobs
            </Text>
          </View>
        ) : (
          <Text style={styles.noLocationText}>
            Location not available. Enable location sharing to see your current
            position.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Controls</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={clearLocationData}
        >
          <Text style={styles.actionButtonText}>Clear Location Data</Text>
        </TouchableOpacity>

        <View style={styles.privacyNote}>
          <Text style={styles.privacyNoteText}>
            Your location data is encrypted and only used to improve your job
            matching experience. You can disable location sharing at any time.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  radiusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  radiusOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  radiusOptionText: {
    fontSize: 14,
    color: '#666',
  },
  radiusOptionTextSelected: {
    color: '#fff',
  },
  locationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  locationNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noLocationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  actionButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  privacyNote: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  privacyNoteText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 16,
  },
});

export default LocationSettings;
