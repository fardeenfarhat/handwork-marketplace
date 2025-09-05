import { useState, useEffect, useCallback } from 'react';
import { locationService, LocationCoordinates, GeocodeResult, AddressSuggestion } from '@/services/location';

export interface UseLocationReturn {
  currentLocation: LocationCoordinates | null;
  loading: boolean;
  error: string | null;
  hasPermission: boolean;
  getCurrentLocation: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  calculateDistance: (to: LocationCoordinates) => number | null;
  geocodeAddress: (address: string) => Promise<GeocodeResult | null>;
  reverseGeocode: (coordinates: LocationCoordinates) => Promise<string | null>;
  getAddressSuggestions: (input: string) => Promise<AddressSuggestion[]>;
}

export const useLocation = (): UseLocationReturn => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  // Check permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      const permission = await locationService.checkLocationPermission();
      setHasPermission(permission);
      
      // Get cached location if available
      const cached = locationService.getCachedLocation();
      if (cached) {
        setCurrentLocation(cached);
      }
    };

    checkPermission();
  }, []);

  // Set up location update listener
  useEffect(() => {
    if (isTracking) {
      const unsubscribe = locationService.onLocationUpdate((location) => {
        setCurrentLocation(location);
        setError(null);
      });

      return unsubscribe;
    }
  }, [isTracking]);

  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      setHasPermission(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      
      if (errorMessage.includes('permission')) {
        setHasPermission(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await locationService.requestLocationPermission();
      setHasPermission(granted);
      
      if (!granted) {
        setError('Location permission denied');
      }
      
      return granted;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission';
      setError(errorMessage);
      return false;
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      setError(null);
      await locationService.startLocationTracking();
      setIsTracking(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start tracking';
      setError(errorMessage);
    }
  }, []);

  const stopTracking = useCallback(() => {
    locationService.stopLocationTracking();
    setIsTracking(false);
  }, []);

  const calculateDistance = useCallback((to: LocationCoordinates): number | null => {
    if (!currentLocation) return null;
    return locationService.calculateDistance(currentLocation, to);
  }, [currentLocation]);

  const geocodeAddress = useCallback(async (address: string): Promise<GeocodeResult | null> => {
    try {
      setError(null);
      return await locationService.geocodeAddress(address);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to geocode address';
      setError(errorMessage);
      return null;
    }
  }, []);

  const reverseGeocode = useCallback(async (coordinates: LocationCoordinates): Promise<string | null> => {
    try {
      setError(null);
      return await locationService.reverseGeocode(coordinates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reverse geocode';
      setError(errorMessage);
      return null;
    }
  }, []);

  const getAddressSuggestions = useCallback(async (input: string): Promise<AddressSuggestion[]> => {
    try {
      setError(null);
      return await locationService.getAddressSuggestions(input);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get suggestions';
      setError(errorMessage);
      return [];
    }
  }, []);

  return {
    currentLocation,
    loading,
    error,
    hasPermission,
    getCurrentLocation,
    requestPermission,
    startTracking,
    stopTracking,
    calculateDistance,
    geocodeAddress,
    reverseGeocode,
    getAddressSuggestions,
  };
};

export default useLocation;