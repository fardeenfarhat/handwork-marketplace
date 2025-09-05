import { locationService, LocationCoordinates } from '@/services/location';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: {
    High: 'high',
  },
}));

// Mock fetch for Google Maps API calls
global.fetch = jest.fn();

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates correctly', () => {
      const from: LocationCoordinates = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
      const to: LocationCoordinates = { latitude: 34.0522, longitude: -118.2437 }; // Los Angeles
      
      const distance = locationService.calculateDistance(from, to);
      
      // Distance between SF and LA is approximately 347 miles
      expect(distance).toBeCloseTo(347, 0);
    });

    it('should return 0 for same coordinates', () => {
      const coords: LocationCoordinates = { latitude: 37.7749, longitude: -122.4194 };
      
      const distance = locationService.calculateDistance(coords, coords);
      
      expect(distance).toBe(0);
    });

    it('should calculate distance in kilometers when specified', () => {
      const from: LocationCoordinates = { latitude: 37.7749, longitude: -122.4194 };
      const to: LocationCoordinates = { latitude: 34.0522, longitude: -118.2437 };
      
      const distanceKm = locationService.calculateDistance(from, to, 'km');
      const distanceMiles = locationService.calculateDistance(from, to, 'miles');
      
      // 1 mile ≈ 1.609 km
      expect(distanceKm).toBeCloseTo(distanceMiles * 1.609, 0);
    });
  });

  describe('isLocationWithinRadius', () => {
    it('should return true for locations within radius', () => {
      const center: LocationCoordinates = { latitude: 37.7749, longitude: -122.4194 };
      const point: LocationCoordinates = { latitude: 37.7849, longitude: -122.4094 }; // ~1 mile away
      
      const isWithin = locationService.isLocationWithinRadius(center, point, 5);
      
      expect(isWithin).toBe(true);
    });

    it('should return false for locations outside radius', () => {
      const center: LocationCoordinates = { latitude: 37.7749, longitude: -122.4194 };
      const point: LocationCoordinates = { latitude: 34.0522, longitude: -118.2437 }; // ~347 miles away
      
      const isWithin = locationService.isLocationWithinRadius(center, point, 100);
      
      expect(isWithin).toBe(false);
    });
  });

  describe('filterJobsByLocation', () => {
    const userLocation: LocationCoordinates = { latitude: 37.7749, longitude: -122.4194 };
    
    const mockJobs = [
      {
        id: 1,
        title: 'Job 1',
        latitude: 37.7849,
        longitude: -122.4094,
      },
      {
        id: 2,
        title: 'Job 2',
        latitude: 34.0522,
        longitude: -118.2437,
      },
      {
        id: 3,
        title: 'Job 3',
        // No coordinates
      },
    ];

    it('should add distance to jobs with coordinates', () => {
      const filteredJobs = locationService.filterJobsByLocation(mockJobs, userLocation);
      
      expect(filteredJobs[0]).toHaveProperty('distance');
      expect(filteredJobs[1]).toHaveProperty('distance');
      expect(filteredJobs[2]).not.toHaveProperty('distance');
    });

    it('should filter jobs by radius when specified', () => {
      const filteredJobs = locationService.filterJobsByLocation(mockJobs, userLocation, 50);
      
      // Only Job 1 should be within 50 miles
      expect(filteredJobs).toHaveLength(2); // Job 1 and Job 3 (no coordinates)
      expect(filteredJobs.find(job => job.id === 1)).toBeDefined();
      expect(filteredJobs.find(job => job.id === 2)).toBeUndefined();
      expect(filteredJobs.find(job => job.id === 3)).toBeDefined();
    });

    it('should sort jobs by distance', () => {
      const filteredJobs = locationService.filterJobsByLocation(mockJobs, userLocation);
      
      // Jobs with distance should be sorted by distance
      const jobsWithDistance = filteredJobs.filter(job => job.distance !== undefined);
      for (let i = 1; i < jobsWithDistance.length; i++) {
        expect(jobsWithDistance[i].distance).toBeGreaterThanOrEqual(jobsWithDistance[i - 1].distance);
      }
    });
  });

  describe('geocodeAddress', () => {
    it('should geocode address using Expo when no Google API key', async () => {
      const mockExpoLocation = require('expo-location');
      mockExpoLocation.geocodeAsync.mockResolvedValue([
        { latitude: 37.7749, longitude: -122.4194 }
      ]);

      const result = await locationService.geocodeAddress('San Francisco, CA');

      expect(result).toEqual({
        address: 'San Francisco, CA',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        formattedAddress: 'San Francisco, CA',
      });
    });

    it('should return null when geocoding fails', async () => {
      const mockExpoLocation = require('expo-location');
      mockExpoLocation.geocodeAsync.mockResolvedValue([]);

      const result = await locationService.geocodeAddress('Invalid Address');

      expect(result).toBeNull();
    });
  });

  describe('getTravelTime', () => {
    it('should return estimated travel time when no Google API key', async () => {
      const from: LocationCoordinates = { latitude: 37.7749, longitude: -122.4194 };
      const to: LocationCoordinates = { latitude: 37.7849, longitude: -122.4094 };

      const result = await locationService.getTravelTime(from, to, 'driving');

      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('duration');
      expect(result?.status).toBe('OK');
      expect(result?.distance.text).toMatch(/mi$/);
      expect(result?.duration.text).toMatch(/(min|hr)$/);
    });

    it('should calculate different times for different modes', async () => {
      const from: LocationCoordinates = { latitude: 37.7749, longitude: -122.4194 };
      const to: LocationCoordinates = { latitude: 37.7849, longitude: -122.4094 };

      const drivingTime = await locationService.getTravelTime(from, to, 'driving');
      const walkingTime = await locationService.getTravelTime(from, to, 'walking');

      expect(walkingTime?.duration.value).toBeGreaterThan(drivingTime?.duration.value || 0);
    });
  });

  describe('openDirections', () => {
    const mockLinking = {
      openURL: jest.fn(),
    };

    beforeEach(() => {
      jest.doMock('react-native', () => ({
        Platform: { select: jest.fn(), OS: 'ios' },
        Linking: mockLinking,
      }));
    });

    it('should open directions with string destination', () => {
      locationService.openDirections('San Francisco, CA');
      
      expect(mockLinking.openURL).toHaveBeenCalled();
    });

    it('should open directions with coordinate destination', () => {
      const destination: LocationCoordinates = { latitude: 37.7749, longitude: -122.4194 };
      
      locationService.openDirections(destination);
      
      expect(mockLinking.openURL).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should stop location tracking and clear data', () => {
      locationService.cleanup();
      
      // Should not throw any errors
      expect(locationService.getCachedLocation()).toBeNull();
    });
  });
});