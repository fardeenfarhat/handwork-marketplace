import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { offlineSyncService } from '@/services/offlineSync';
import { Job, Message, Booking, Review } from '@/types';

export const useOfflineSync = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isOnline } = useSelector((state: RootState) => state.navigation);
  const { syncInProgress, pendingSync } = useSelector((state: RootState) => state.cache);

  useEffect(() => {
    // Initialize offline sync service
    offlineSyncService.initialize();
  }, []);

  const syncNow = useCallback(async () => {
    if (isOnline && !syncInProgress) {
      await offlineSyncService.syncData();
    }
  }, [isOnline, syncInProgress]);

  const cacheJob = useCallback(async (job: Job) => {
    return await offlineSyncService.cacheJob(job);
  }, []);

  const cacheMessage = useCallback(async (message: Message) => {
    return await offlineSyncService.cacheMessage(message);
  }, []);

  const cacheBooking = useCallback(async (booking: Booking) => {
    return await offlineSyncService.cacheBooking(booking);
  }, []);

  const cacheReview = useCallback(async (review: Review) => {
    return await offlineSyncService.cacheReview(review);
  }, []);

  const clearCache = useCallback(async () => {
    await offlineSyncService.clearCache();
  }, []);

  const getPendingSyncCount = useCallback(() => {
    return offlineSyncService.getPendingSyncCount();
  }, []);

  return {
    isOnline,
    syncInProgress,
    pendingSync,
    syncNow,
    cacheJob,
    cacheMessage,
    cacheBooking,
    cacheReview,
    clearCache,
    getPendingSyncCount,
    isOffline: !isOnline,
  };
};