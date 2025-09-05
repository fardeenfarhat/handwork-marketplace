import { renderHook, act } from '@testing-library/react-native';
import { useLocation } from '@/hooks/useLocation';
import { locationService } from '@/services/location';

// Mock the location service
jest.mock('@/services/location', () => ({
  locationService: {
    checkLocationPermission: jest.fn(),
    requestLocationPermission: jest.fn(),
    getCurrentLocation: jest.fn(),
    startLocationTracking: jest.fn(),
    stopLocationTracking: jest.fn(),
    onLocationUpdate: jest.fn(),
    getCachedLocation: jest.fn(),
    calculateDistance: jest.fn(),
    geocodeAddress: jest.fn(),
    reverseGeocode: jest.fn(),
    getAddressSuggestions: jest.fn(),
  },
}));

const mockLocationService = locationService as jest.Mocked<typeof locationService>;

describe('useLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useLocation());

    expect(result.current.currentLocation).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasPermission).toBe(false);
  });

  it('should check permission on mount', async () => {
    mockLocationService.checkLocationPermission.mockResolvedValue(true);
    mockLocationService.getCachedLocation.mockReturnValue({
      latitude: 37.7749,
      longitude: -122.4194,
    });

    const { result } = renderHook(() => useLocation());

    await act(async () => {
      // Wait for useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockLocationService.checkLocationPermission).toHaveBeenCalled();
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.currentLocation).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
    });
  });

  it('should get current location successfully', async () => {
    const mockLocation = { latitude: 37.7749, longitude: -122.4194 };
    mockLocationService.getCurrentLocation.mockResolvedValue(mockLocation);

    const { result } = renderHook(() => useLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.currentLocation).toEqual(mockLocation);
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should handle location error', async () => {
    const errorMessage = 'Location permission denied';
    mockLocationService.getCurrentLocation.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useLocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.currentLocation).toBeNull();
  });

  it('should request permission successfully', async () => {
    mockLocationService.requestLocationPermission.mockResolvedValue(true);

    const { result } = renderHook(() => useLocation());

    let permissionResult;
    await act(async () => {
      permissionResult = await result.current.requestPermission();
    });

    expect(permissionResult).toBe(true);
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle permission denial', async () => {
    mockLocationService.requestLocationPermission.mockResolvedValue(false);

    const { result } = renderHook(() => useLocation());

    let permissionResult;
    await act(async () => {
      permissionResult = await result.current.requestPermission();
    });

    expect(permissionResult).toBe(false);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toBe('Location permission denied');
  });

  it('should start and stop tracking', async () => {
    mockLocationService.startLocationTracking.mockResolvedValue();
    mockLocationService.onLocationUpdate.mockReturnValue(() => {});

    const { result } = renderHook(() => useLocation());

    await act(async () => {
      await result.current.startTracking();
    });

    expect(mockLocationService.startLocationTracking).toHaveBeenCalled();
    expect(mockLocationService.onLocationUpdate).toHaveBeenCalled();

    act(() => {
      result.current.stopTracking();
    });

    expect(mockLocationService.stopLocationTracking).toHaveBeenCalled();
  });

  it('should calculate distance when current location is available', () => {
    const mockLocation = { latitude: 37.7749, longitude: -122.4194 };
    const targetLocation = { latitude: 34.0522, longitude: -118.2437 };
    
    mockLocationService.getCachedLocation.mockReturnValue(mockLocation);
    mockLocationService.calculateDistance.mockReturnValue(347);

    const { result } = renderHook(() => useLocation());

    // Set current location
    act(() => {
      result.current.currentLocation = mockLocation;
    });

    const distance = result.current.calculateDistance(targetLocation);

    expect(distance).toBe(347);
    expect(mockLocationService.calculateDistance).toHaveBeenCalledWith(mockLocation, targetLocation);
  });

  it('should return null distance when no current location', () => {
    const { result } = renderHook(() => useLocation());

    const distance = result.current.calculateDistance({ latitude: 37.7749, longitude: -122.4194 });

    expect(distance).toBeNull();
  });

  it('should geocode address successfully', async () => {
    const mockResult = {
      address: 'San Francisco, CA',
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
      formattedAddress: 'San Francisco, CA, USA',
    };
    mockLocationService.geocodeAddress.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useLocation());

    let geocodeResult;
    await act(async () => {
      geocodeResult = await result.current.geocodeAddress('San Francisco, CA');
    });

    expect(geocodeResult).toEqual(mockResult);
    expect(result.current.error).toBeNull();
  });

  it('should handle geocoding error', async () => {
    const errorMessage = 'Failed to geocode address';
    mockLocationService.geocodeAddress.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useLocation());

    let geocodeResult;
    await act(async () => {
      geocodeResult = await result.current.geocodeAddress('Invalid Address');
    });

    expect(geocodeResult).toBeNull();
    expect(result.current.error).toBe(errorMessage);
  });

  it('should get address suggestions successfully', async () => {
    const mockSuggestions = [
      {
        description: 'San Francisco, CA, USA',
        placeId: 'place123',
        mainText: 'San Francisco',
        secondaryText: 'CA, USA',
      },
    ];
    mockLocationService.getAddressSuggestions.mockResolvedValue(mockSuggestions);

    const { result } = renderHook(() => useLocation());

    let suggestions;
    await act(async () => {
      suggestions = await result.current.getAddressSuggestions('San Francisco');
    });

    expect(suggestions).toEqual(mockSuggestions);
    expect(result.current.error).toBeNull();
  });

  it('should handle address suggestions error', async () => {
    const errorMessage = 'Failed to get suggestions';
    mockLocationService.getAddressSuggestions.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useLocation());

    let suggestions;
    await act(async () => {
      suggestions = await result.current.getAddressSuggestions('test');
    });

    expect(suggestions).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });
});