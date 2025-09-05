import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with actual API key

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export interface GeocodeResult {
  address: string;
  coordinates: LocationCoordinates;
  placeId?: string;
  formattedAddress?: string;
}

export interface AddressSuggestion {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export interface TravelTimeResult {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  status: string;
}

class LocationService {
  private currentLocation: LocationCoordinates | null = null;
  private watchId: Location.LocationSubscription | null = null;
  private locationUpdateCallbacks: ((location: LocationCoordinates) => void)[] = [];

  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus === 'granted') {
        return true;
      }

      if (foregroundStatus === 'denied') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions in your device settings to find nearby jobs.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  async checkLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationCoordinates> {
    try {
      const hasPermission = await this.requestLocationPermission();
      
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      });

      const coordinates: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      this.currentLocation = coordinates;
      return coordinates;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw new Error('Unable to get current location');
    }
  }

  async startLocationTracking(): Promise<void> {
    try {
      const hasPermission = await this.requestLocationPermission();
      
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 100, // Update when moved 100 meters
        },
        (location) => {
          const coordinates: LocationCoordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          this.currentLocation = coordinates;
          
          // Notify all callbacks
          this.locationUpdateCallbacks.forEach(callback => {
            callback(coordinates);
          });
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw new Error('Unable to start location tracking');
    }
  }

  stopLocationTracking(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  onLocationUpdate(callback: (location: LocationCoordinates) => void): () => void {
    this.locationUpdateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.locationUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationUpdateCallbacks.splice(index, 1);
      }
    };
  }

  getCachedLocation(): LocationCoordinates | null {
    return this.currentLocation;
  }

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
        // Fallback to Expo's geocoding service
        const results = await Location.geocodeAsync(address);
        if (results.length > 0) {
          const result = results[0];
          return {
            address,
            coordinates: {
              latitude: result.latitude,
              longitude: result.longitude,
            },
            formattedAddress: address,
          };
        }
        return null;
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          address,
          coordinates: {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
          },
          placeId: result.place_id,
          formattedAddress: result.formatted_address,
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  async reverseGeocode(coordinates: LocationCoordinates): Promise<string | null> {
    try {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
        // Fallback to Expo's reverse geocoding service
        const results = await Location.reverseGeocodeAsync(coordinates);
        if (results.length > 0) {
          const result = results[0];
          return `${result.street || ''} ${result.city || ''}, ${result.region || ''} ${result.postalCode || ''}`.trim();
        }
        return null;
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  async getAddressSuggestions(input: string): Promise<AddressSuggestion[]> {
    try {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
        // Return empty array if no API key
        return [];
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&types=address`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.predictions.map((prediction: any) => ({
          description: prediction.description,
          placeId: prediction.place_id,
          mainText: prediction.structured_formatting.main_text,
          secondaryText: prediction.structured_formatting.secondary_text,
        }));
      }

      return [];
    } catch (error) {
      console.error('Error getting address suggestions:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<GeocodeResult | null> {
    try {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
        return null;
      }

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const result = data.result;
        return {
          address: result.formatted_address,
          coordinates: {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
          },
          placeId,
          formattedAddress: result.formatted_address,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  calculateDistance(
    from: LocationCoordinates,
    to: LocationCoordinates,
    unit: 'miles' | 'km' = 'miles'
  ): number {
    const R = unit === 'miles' ? 3959 : 6371; // Earth's radius in miles or kilometers
    const dLat = (to.latitude - from.latitude) * (Math.PI / 180);
    const dLon = (to.longitude - from.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.latitude * (Math.PI / 180)) *
        Math.cos(to.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getTravelTime(
    from: LocationCoordinates,
    to: LocationCoordinates,
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<TravelTimeResult | null> {
    try {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
        // Fallback to distance calculation with estimated time
        const distance = this.calculateDistance(from, to, 'miles');
        const avgSpeed = mode === 'walking' ? 3 : mode === 'transit' ? 25 : 35; // mph
        const timeInHours = distance / avgSpeed;
        const timeInSeconds = Math.round(timeInHours * 3600);
        
        return {
          distance: {
            text: `${distance.toFixed(1)} mi`,
            value: Math.round(distance * 1609.34), // Convert to meters
          },
          duration: {
            text: timeInHours < 1 
              ? `${Math.round(timeInHours * 60)} min`
              : `${Math.round(timeInHours * 10) / 10} hr`,
            value: timeInSeconds,
          },
          status: 'OK',
        };
      }

      const origin = `${from.latitude},${from.longitude}`;
      const destination = `${to.latitude},${to.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.rows.length > 0) {
        const element = data.rows[0].elements[0];
        if (element.status === 'OK') {
          return {
            distance: element.distance,
            duration: element.duration,
            status: element.status,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting travel time:', error);
      return null;
    }
  }

  isLocationWithinRadius(
    center: LocationCoordinates,
    point: LocationCoordinates,
    radiusMiles: number
  ): boolean {
    const distance = this.calculateDistance(center, point);
    return distance <= radiusMiles;
  }

  filterJobsByLocation(
    jobs: any[],
    userLocation: LocationCoordinates,
    radiusMiles?: number
  ): any[] {
    return jobs
      .map(job => {
        if (job.latitude && job.longitude) {
          const distance = this.calculateDistance(
            userLocation,
            { latitude: job.latitude, longitude: job.longitude }
          );
          return { ...job, distance };
        }
        return job;
      })
      .filter(job => {
        if (!radiusMiles || !job.distance) return true;
        return job.distance <= radiusMiles;
      })
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  openDirections(destination: string | LocationCoordinates) {
    let url: string;
    
    if (typeof destination === 'string') {
      url = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(destination)}`,
        android: `geo:0,0?q=${encodeURIComponent(destination)}`,
      }) || '';
    } else {
      url = Platform.select({
        ios: `maps:${destination.latitude},${destination.longitude}`,
        android: `geo:${destination.latitude},${destination.longitude}`,
      }) || '';
    }

    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps web
        const webUrl = typeof destination === 'string'
          ? `https://maps.google.com/?q=${encodeURIComponent(destination)}`
          : `https://maps.google.com/?q=${destination.latitude},${destination.longitude}`;
        Linking.openURL(webUrl);
      });
    }
  }

  openDirectionsFromTo(from: LocationCoordinates, to: LocationCoordinates | string) {
    let url: string;
    
    if (typeof to === 'string') {
      url = Platform.select({
        ios: `maps:${from.latitude},${from.longitude}?daddr=${encodeURIComponent(to)}`,
        android: `google.navigation:q=${encodeURIComponent(to)}`,
      }) || '';
    } else {
      url = Platform.select({
        ios: `maps:${from.latitude},${from.longitude}?daddr=${to.latitude},${to.longitude}`,
        android: `google.navigation:q=${to.latitude},${to.longitude}`,
      }) || '';
    }

    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps web
        const webUrl = typeof to === 'string'
          ? `https://maps.google.com/dir/${from.latitude},${from.longitude}/${encodeURIComponent(to)}`
          : `https://maps.google.com/dir/${from.latitude},${from.longitude}/${to.latitude},${to.longitude}`;
        Linking.openURL(webUrl);
      });
    }
  }

  cleanup(): void {
    this.stopLocationTracking();
    this.locationUpdateCallbacks = [];
    this.currentLocation = null;
  }
}

export const locationService = new LocationService();
export default locationService;