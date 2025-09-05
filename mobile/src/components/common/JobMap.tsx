import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import MapView, { Marker, Region, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Job } from '@/types';
import { LocationCoordinates } from '@/services/location';
import { useLocation } from '@/hooks/useLocation';

interface JobMapProps {
  jobs: Job[];
  onJobPress?: (job: Job) => void;
  showUserLocation?: boolean;
  initialRegion?: Region;
  style?: any;
  onRegionChange?: (region: Region) => void;
  selectedJobId?: number;
}

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export const JobMap: React.FC<JobMapProps> = ({
  jobs,
  onJobPress,
  showUserLocation = true,
  initialRegion,
  style,
  onRegionChange,
  selectedJobId,
}) => {
  const mapRef = useRef<MapView>(null);
  const { currentLocation, getCurrentLocation, hasPermission, requestPermission } = useLocation();
  const [region, setRegion] = useState<Region>(
    initialRegion || {
      latitude: 37.7749,
      longitude: -122.4194,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    }
  );

  useEffect(() => {
    if (showUserLocation && !hasPermission) {
      requestPermission();
    }
  }, [showUserLocation, hasPermission, requestPermission]);

  useEffect(() => {
    if (showUserLocation && hasPermission && !currentLocation) {
      getCurrentLocation();
    }
  }, [showUserLocation, hasPermission, currentLocation, getCurrentLocation]);

  useEffect(() => {
    if (currentLocation && !initialRegion) {
      const newRegion = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      setRegion(newRegion);
    }
  }, [currentLocation, initialRegion]);

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    onRegionChange?.(newRegion);
  };

  const centerOnUserLocation = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to center the map on your location.'
        );
        return;
      }
    }

    try {
      await getCurrentLocation();
      if (currentLocation && mapRef.current) {
        const newRegion = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        };
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to get your current location');
    }
  };

  const centerOnJob = (job: Job) => {
    if (job.latitude && job.longitude && mapRef.current) {
      const newRegion = {
        latitude: job.latitude,
        longitude: job.longitude,
        latitudeDelta: LATITUDE_DELTA / 4, // Zoom in more for individual job
        longitudeDelta: LONGITUDE_DELTA / 4,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const fitToJobs = () => {
    const jobsWithLocation = jobs.filter(job => job.latitude && job.longitude);
    
    if (jobsWithLocation.length === 0) return;

    if (jobsWithLocation.length === 1) {
      centerOnJob(jobsWithLocation[0]);
      return;
    }

    const coordinates = jobsWithLocation.map(job => ({
      latitude: job.latitude!,
      longitude: job.longitude!,
    }));

    if (currentLocation && showUserLocation) {
      coordinates.push(currentLocation);
    }

    if (mapRef.current) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const getMarkerColor = (job: Job): string => {
    if (job.id === selectedJobId) return '#FF6B6B';
    
    switch (job.status) {
      case 'open':
        return '#4CAF50';
      case 'assigned':
        return '#FF9800';
      case 'in_progress':
        return '#2196F3';
      case 'completed':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  const formatBudget = (min: number, max: number) => {
    return `$${min} - $${max}`;
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={showUserLocation && hasPermission}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
      >
        {jobs
          .filter(job => job.latitude && job.longitude)
          .map(job => (
            <Marker
              key={job.id}
              coordinate={{
                latitude: job.latitude!,
                longitude: job.longitude!,
              }}
              pinColor={getMarkerColor(job)}
              onPress={() => onJobPress?.(job)}
            >
              <Callout onPress={() => onJobPress?.(job)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {job.title}
                  </Text>
                  <Text style={styles.calloutCategory}>{job.category}</Text>
                  <Text style={styles.calloutBudget}>
                    {formatBudget(job.budgetMin, job.budgetMax)}
                  </Text>
                  <Text style={styles.calloutLocation} numberOfLines={1}>
                    {job.location}
                  </Text>
                  {job.distance && (
                    <Text style={styles.calloutDistance}>
                      {job.distance.toFixed(1)} miles away
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          ))}
      </MapView>

      {/* Map Controls */}
      <View style={styles.controls}>
        {showUserLocation && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={centerOnUserLocation}
          >
            <Text style={styles.controlButtonText}>📍</Text>
          </TouchableOpacity>
        )}
        
        {jobs.length > 0 && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={fitToJobs}
          >
            <Text style={styles.controlButtonText}>🎯</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Open</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Assigned</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.legendText}>In Progress</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column',
    gap: 8,
  },
  controlButton: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlButtonText: {
    fontSize: 18,
  },
  legend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#333',
  },
  callout: {
    width: 200,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  calloutBudget: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  calloutLocation: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  calloutDistance: {
    fontSize: 11,
    color: '#2196F3',
  },
});

export default JobMap;