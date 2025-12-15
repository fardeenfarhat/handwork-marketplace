import NetInfo from '@react-native-community/netinfo';
import { store } from '@/store';
import { 
  setOnlineStatus, 
  setTabBadge 
} from '@/store/slices/navigationSlice';
import {
  setJobsCache,
  setUsersCache,
  setMessagesCache,
  setBookingsCache,
  setReviewsCache,
  addToPendingSync,
  removePendingSync,
  setSyncInProgress,
  markJobsCacheStale,
  markBookingsCacheStale,
} from '@/store/slices/cacheSlice';
import apiService from './api';
import { secureStorage } from './storage';
import { Job, Message, Booking, Review, User } from '@/types';

export class OfflineSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private readonly CACHE_EXPIRY_HOURS = 24;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set up network state monitoring
    NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      store.dispatch(setOnlineStatus(isOnline || false));
      
      if (isOnline) {
        this.startPeriodicSync();
        this.syncPendingData();
      } else {
        this.stopPeriodicSync();
      }
    });

    // Load cached data on startup
    await this.loadCachedData();

    // Start sync if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      this.startPeriodicSync();
    }

    this.isInitialized = true;
  }

  private async loadCachedData(): Promise<void> {
    try {
      // Load jobs cache
      const cachedJobs = await secureStorage.getItem('cached_jobs');
      if (cachedJobs && cachedJobs !== 'undefined') {
        try {
          const jobsData = JSON.parse(cachedJobs);
          if (this.isCacheValid(jobsData.timestamp)) {
            store.dispatch(setJobsCache(jobsData.data));
          } else {
            store.dispatch(markJobsCacheStale());
          }
        } catch (error) {
          console.error('Error parsing cached jobs:', error);
          await secureStorage.removeItem('cached_jobs');
        }
      }

      // Load users cache
      const cachedUsers = await secureStorage.getItem('cached_users');
      if (cachedUsers && cachedUsers !== 'undefined') {
        try {
          const usersData = JSON.parse(cachedUsers);
          if (this.isCacheValid(usersData.timestamp)) {
            store.dispatch(setUsersCache(usersData.data));
          }
        } catch (error) {
          console.error('Error parsing cached users:', error);
          await secureStorage.removeItem('cached_users');
        }
      }

      // Load messages cache
      const cachedMessages = await secureStorage.getItem('cached_messages');
      if (cachedMessages && cachedMessages !== 'undefined') {
        try {
          const messagesData = JSON.parse(cachedMessages);
          Object.entries(messagesData.data).forEach(([jobId, messages]) => {
            store.dispatch(setMessagesCache({ 
              jobId: Number(jobId), 
              messages: messages as Message[] 
            }));
          });
        } catch (error) {
          console.error('Error parsing cached messages:', error);
          await secureStorage.removeItem('cached_messages');
        }
      }

      // Load bookings cache
      const cachedBookings = await secureStorage.getItem('cached_bookings');
      if (cachedBookings && cachedBookings !== 'undefined') {
        try {
          const bookingsData = JSON.parse(cachedBookings);
          if (this.isCacheValid(bookingsData.timestamp)) {
            store.dispatch(setBookingsCache(bookingsData.data));
          } else {
            store.dispatch(markBookingsCacheStale());
          }
        } catch (error) {
          console.error('Error parsing cached bookings:', error);
          await secureStorage.removeItem('cached_bookings');
        }
      }

      // Load reviews cache
      const cachedReviews = await secureStorage.getItem('cached_reviews');
      if (cachedReviews && cachedReviews !== 'undefined') {
        try {
          const reviewsData = JSON.parse(cachedReviews);
          Object.entries(reviewsData.data).forEach(([userId, reviews]) => {
            store.dispatch(setReviewsCache({ 
              userId: Number(userId), 
              reviews: reviews as Review[] 
            }));
          });
        } catch (error) {
          console.error('Error parsing cached reviews:', error);
          await secureStorage.removeItem('cached_reviews');
        }
      }

      // Load pending sync data
      const pendingSync = await secureStorage.getItem('pending_sync');
      if (pendingSync && pendingSync !== 'undefined') {
        try {
          const syncData = JSON.parse(pendingSync);
          Object.entries(syncData).forEach(([type, items]) => {
            (items as any[]).forEach(item => {
              store.dispatch(addToPendingSync({ 
                type: type as any, 
                data: item 
              }));
            });
          });
        } catch (error) {
          console.error('Error parsing pending sync data:', error);
          await secureStorage.removeItem('pending_sync');
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }

  private isCacheValid(timestamp: string): boolean {
    const cacheTime = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
    return diffHours < this.CACHE_EXPIRY_HOURS;
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.syncData();
    }, this.SYNC_INTERVAL_MS);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncData(): Promise<void> {
    const state = store.getState();
    
    if (!state.navigation.isOnline || state.cache.syncInProgress) {
      return;
    }

    store.dispatch(setSyncInProgress(true));

    try {
      // Sync jobs if cache is stale
      if (state.cache.jobs.isStale || !state.cache.jobs.lastUpdated) {
        await this.syncJobs();
      }

      // Sync bookings if cache is stale
      if (state.cache.bookings.isStale || !state.cache.bookings.lastUpdated) {
        await this.syncBookings();
      }

      // Sync pending data
      await this.syncPendingData();

      // Update message badges
      await this.updateMessageBadges();

    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      store.dispatch(setSyncInProgress(false));
    }
  }

  private async syncJobs(): Promise<void> {
    try {
      const jobs = await apiService.getJobs({});
      store.dispatch(setJobsCache(jobs));
      
      // Cache to storage
      await secureStorage.setItem('cached_jobs', JSON.stringify({
        data: jobs,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error syncing jobs:', error);
    }
  }

  private async syncBookings(): Promise<void> {
    try {
      const bookings = await apiService.getBookings();
      store.dispatch(setBookingsCache(bookings));
      
      // Cache to storage
      await secureStorage.setItem('cached_bookings', JSON.stringify({
        data: bookings,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error syncing bookings:', error);
    }
  }

  private async syncPendingData(): Promise<void> {
    const state = store.getState();
    const { pendingSync } = state.cache;

    // Sync pending jobs
    for (const job of pendingSync.jobs) {
      try {
        if (job.id) {
          await apiService.updateJob(job.id, job);
        } else {
          await apiService.createJob(job);
        }
        store.dispatch(removePendingSync({ type: 'jobs', id: job.id }));
      } catch (error) {
        console.error('Error syncing pending job:', error);
      }
    }

    // Sync pending messages
    for (const message of pendingSync.messages) {
      try {
        await apiService.sendMessage(message);
        store.dispatch(removePendingSync({ type: 'messages', id: message.id }));
      } catch (error) {
        console.error('Error syncing pending message:', error);
      }
    }

    // Sync pending reviews
    for (const review of pendingSync.reviews) {
      try {
        if (review.id) {
          await apiService.updateReview(review.id, review);
        } else {
          await apiService.createReview(review);
        }
        store.dispatch(removePendingSync({ type: 'reviews', id: review.id }));
      } catch (error) {
        console.error('Error syncing pending review:', error);
      }
    }

    // Sync pending bookings
    for (const booking of pendingSync.bookings) {
      try {
        if (booking.id) {
          await apiService.updateBooking(booking.id, booking);
        } else {
          await apiService.createBooking(booking);
        }
        store.dispatch(removePendingSync({ type: 'bookings', id: booking.id }));
      } catch (error) {
        console.error('Error syncing pending booking:', error);
      }
    }

    // Update pending sync storage
    await secureStorage.setItem('pending_sync', JSON.stringify(state.cache.pendingSync));
  }

  private async updateMessageBadges(): Promise<void> {
    try {
      const unreadCount = await apiService.getUnreadMessageCount();
      store.dispatch(setTabBadge({ tab: 'messages', count: unreadCount }));
    } catch (error) {
      console.error('Error updating message badges:', error);
    }
  }

  // Public methods for offline operations
  async cacheJob(job: Job): Promise<void> {
    const state = store.getState();
    
    if (state.navigation.isOnline) {
      // If online, sync immediately
      try {
        const savedJob = job.id 
          ? await apiService.updateJob(job.id, job)
          : await apiService.createJob(job);
        return savedJob;
      } catch (error) {
        // If sync fails, add to pending
        store.dispatch(addToPendingSync({ type: 'jobs', data: job }));
        throw error;
      }
    } else {
      // If offline, add to pending sync
      store.dispatch(addToPendingSync({ type: 'jobs', data: job }));
    }
  }

  async cacheMessage(message: Message): Promise<void> {
    const state = store.getState();
    
    if (state.navigation.isOnline) {
      try {
        const savedMessage = await apiService.sendMessage(message);
        return savedMessage;
      } catch (error) {
        store.dispatch(addToPendingSync({ type: 'messages', data: message }));
        throw error;
      }
    } else {
      store.dispatch(addToPendingSync({ type: 'messages', data: message }));
    }
  }

  async cacheReview(review: Review): Promise<void> {
    const state = store.getState();
    
    if (state.navigation.isOnline) {
      try {
        const savedReview = review.id 
          ? await apiService.updateReview(review.id, review)
          : await apiService.createReview(review);
        return savedReview;
      } catch (error) {
        store.dispatch(addToPendingSync({ type: 'reviews', data: review }));
        throw error;
      }
    } else {
      store.dispatch(addToPendingSync({ type: 'reviews', data: review }));
    }
  }

  async cacheBooking(booking: Booking): Promise<void> {
    const state = store.getState();
    
    if (state.navigation.isOnline) {
      try {
        const savedBooking = booking.id 
          ? await apiService.updateBooking(booking.id, booking)
          : await apiService.createBooking(booking);
        return savedBooking;
      } catch (error) {
        store.dispatch(addToPendingSync({ type: 'bookings', data: booking }));
        throw error;
      }
    } else {
      store.dispatch(addToPendingSync({ type: 'bookings', data: booking }));
    }
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    await secureStorage.removeItem('cached_jobs');
    await secureStorage.removeItem('cached_users');
    await secureStorage.removeItem('cached_messages');
    await secureStorage.removeItem('cached_bookings');
    await secureStorage.removeItem('cached_reviews');
    await secureStorage.removeItem('pending_sync');
  }

  // Get offline status
  isOffline(): boolean {
    const state = store.getState();
    return !state.navigation.isOnline;
  }

  // Get pending sync count
  getPendingSyncCount(): number {
    const state = store.getState();
    const { pendingSync } = state.cache;
    return pendingSync.jobs.length + 
           pendingSync.messages.length + 
           pendingSync.reviews.length + 
           pendingSync.bookings.length;
  }
}

export const offlineSyncService = new OfflineSyncService();