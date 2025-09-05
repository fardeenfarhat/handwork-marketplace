import { configureStore } from '@reduxjs/toolkit';
import { OfflineSyncService } from '@/services/offlineSync';
import navigationSlice from '@/store/slices/navigationSlice';
import cacheSlice from '@/store/slices/cacheSlice';
import { Job, Message, Booking, Review } from '@/types';

// Mock dependencies
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

jest.mock('@/services/api', () => ({
  getJobs: jest.fn(),
  getBookings: jest.fn(),
  getUnreadMessageCount: jest.fn(),
  createJob: jest.fn(),
  updateJob: jest.fn(),
  sendMessage: jest.fn(),
  createReview: jest.fn(),
  updateReview: jest.fn(),
  createBooking: jest.fn(),
  updateBooking: jest.fn(),
}));

jest.mock('@/services/storage', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      navigation: navigationSlice,
      cache: cacheSlice,
    },
    preloadedState: {
      navigation: {
        currentRoute: 'Dashboard',
        previousRoute: null,
        tabBadges: { messages: 0, notifications: 0 },
        deepLinkPending: null,
        isOnline: true,
      },
      cache: {
        jobs: { data: [], lastUpdated: null, isStale: false },
        users: { data: {}, lastUpdated: null },
        messages: { data: {}, lastUpdated: null },
        bookings: { data: [], lastUpdated: null, isStale: false },
        reviews: { data: {}, lastUpdated: null },
        pendingSync: { jobs: [], messages: [], reviews: [], bookings: [] },
        lastSyncAttempt: null,
        syncInProgress: false,
      },
    },
  });
};

describe('OfflineSyncService', () => {
  let offlineSyncService: OfflineSyncService;
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    offlineSyncService = new OfflineSyncService();
    mockStore = createMockStore();
    
    // Mock the store
    jest.doMock('@/store', () => ({
      store: mockStore,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(offlineSyncService.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      await offlineSyncService.initialize();
      await offlineSyncService.initialize();
      // Should not throw or cause issues
    });
  });

  describe('cache operations', () => {
    const mockJob: Job = {
      id: 1,
      clientId: 1,
      title: 'Test Job',
      description: 'Test Description',
      category: 'plumbing',
      budgetMin: 100,
      budgetMax: 200,
      location: 'New York, NY',
      preferredDate: '2024-01-01',
      status: 'open',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const mockMessage: Message = {
      id: 1,
      senderId: 1,
      receiverId: 2,
      jobId: 1,
      content: 'Test message',
      attachments: [],
      isRead: false,
      createdAt: '2024-01-01T00:00:00Z',
    };

    const mockBooking: Booking = {
      id: 1,
      jobId: 1,
      workerId: 2,
      clientId: 1,
      workerName: 'John Worker',
      clientName: 'Jane Client',
      jobTitle: 'Test Job',
      startDate: '2024-01-01',
      agreedRate: 150,
      status: 'pending',
      completionPhotos: [],
      createdAt: '2024-01-01T00:00:00Z',
    };

    const mockReview: Review = {
      id: 1,
      bookingId: 1,
      reviewerId: 1,
      revieweeId: 2,
      reviewerName: 'John Reviewer',
      revieweeName: 'Jane Reviewee',
      jobTitle: 'Test Job',
      rating: 5,
      comment: 'Great work!',
      status: 'approved',
      createdAt: '2024-01-01T00:00:00Z',
    };

    it('should cache job when online', async () => {
      const apiService = require('@/services/api');
      apiService.createJob.mockResolvedValue(mockJob);

      await offlineSyncService.cacheJob(mockJob);

      expect(apiService.createJob).toHaveBeenCalledWith(mockJob);
    });

    it('should add job to pending sync when offline', async () => {
      // Mock offline state
      mockStore.dispatch({ type: 'navigation/setOnlineStatus', payload: false });

      await offlineSyncService.cacheJob(mockJob);

      const state = mockStore.getState();
      expect(state.cache.pendingSync.jobs).toContain(mockJob);
    });

    it('should cache message when online', async () => {
      const apiService = require('@/services/api');
      apiService.sendMessage.mockResolvedValue(mockMessage);

      await offlineSyncService.cacheMessage(mockMessage);

      expect(apiService.sendMessage).toHaveBeenCalledWith(mockMessage);
    });

    it('should cache booking when online', async () => {
      const apiService = require('@/services/api');
      apiService.createBooking.mockResolvedValue(mockBooking);

      await offlineSyncService.cacheBooking(mockBooking);

      expect(apiService.createBooking).toHaveBeenCalledWith(mockBooking);
    });

    it('should cache review when online', async () => {
      const apiService = require('@/services/api');
      apiService.createReview.mockResolvedValue(mockReview);

      await offlineSyncService.cacheReview(mockReview);

      expect(apiService.createReview).toHaveBeenCalledWith(mockReview);
    });
  });

  describe('sync operations', () => {
    it('should sync data when online', async () => {
      const apiService = require('@/services/api');
      apiService.getJobs.mockResolvedValue([]);
      apiService.getBookings.mockResolvedValue([]);
      apiService.getUnreadMessageCount.mockResolvedValue(0);

      await offlineSyncService.syncData();

      expect(apiService.getJobs).toHaveBeenCalled();
      expect(apiService.getBookings).toHaveBeenCalled();
      expect(apiService.getUnreadMessageCount).toHaveBeenCalled();
    });

    it('should not sync when offline', async () => {
      mockStore.dispatch({ type: 'navigation/setOnlineStatus', payload: false });

      const apiService = require('@/services/api');
      apiService.getJobs.mockResolvedValue([]);

      await offlineSyncService.syncData();

      expect(apiService.getJobs).not.toHaveBeenCalled();
    });

    it('should not sync when sync is already in progress', async () => {
      mockStore.dispatch({ type: 'cache/setSyncInProgress', payload: true });

      const apiService = require('@/services/api');
      apiService.getJobs.mockResolvedValue([]);

      await offlineSyncService.syncData();

      expect(apiService.getJobs).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should return correct offline status', () => {
      mockStore.dispatch({ type: 'navigation/setOnlineStatus', payload: false });
      expect(offlineSyncService.isOffline()).toBe(true);

      mockStore.dispatch({ type: 'navigation/setOnlineStatus', payload: true });
      expect(offlineSyncService.isOffline()).toBe(false);
    });

    it('should return correct pending sync count', () => {
      const mockJob: Job = {
        id: 1,
        clientId: 1,
        title: 'Test Job',
        description: 'Test Description',
        category: 'plumbing',
        budgetMin: 100,
        budgetMax: 200,
        location: 'New York, NY',
        preferredDate: '2024-01-01',
        status: 'open',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockStore.dispatch({
        type: 'cache/addToPendingSync',
        payload: { type: 'jobs', data: mockJob },
      });

      expect(offlineSyncService.getPendingSyncCount()).toBe(1);
    });

    it('should clear cache successfully', async () => {
      const { secureStorage } = require('@/services/storage');
      
      await offlineSyncService.clearCache();

      expect(secureStorage.removeItem).toHaveBeenCalledWith('cached_jobs');
      expect(secureStorage.removeItem).toHaveBeenCalledWith('cached_users');
      expect(secureStorage.removeItem).toHaveBeenCalledWith('cached_messages');
      expect(secureStorage.removeItem).toHaveBeenCalledWith('cached_bookings');
      expect(secureStorage.removeItem).toHaveBeenCalledWith('cached_reviews');
      expect(secureStorage.removeItem).toHaveBeenCalledWith('pending_sync');
    });
  });
});