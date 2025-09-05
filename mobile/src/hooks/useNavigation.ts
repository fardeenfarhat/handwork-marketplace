import { useCallback } from 'react';
import { useNavigation as useRNNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { setCurrentRoute, setTabBadge, clearTabBadge } from '@/store/slices/navigationSlice';
import { deepLinkingService } from '@/services/deepLinking';

export const useNavigation = () => {
  const navigation = useRNNavigation();
  const route = useRoute();
  const dispatch = useDispatch<AppDispatch>();
  
  const { currentRoute, tabBadges, isOnline } = useSelector(
    (state: RootState) => state.navigation
  );

  // Update current route in Redux when route changes
  const updateCurrentRoute = useCallback((routeName: string) => {
    dispatch(setCurrentRoute(routeName));
  }, [dispatch]);

  // Navigation helpers with route tracking
  const navigateWithTracking = useCallback((screen: string, params?: any) => {
    navigation.navigate(screen as never, params as never);
    updateCurrentRoute(screen);
  }, [navigation, updateCurrentRoute]);

  const goBackWithTracking = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Tab badge management
  const updateTabBadge = useCallback((tab: 'messages' | 'notifications', count: number) => {
    dispatch(setTabBadge({ tab, count }));
  }, [dispatch]);

  const clearTabBadgeCount = useCallback((tab: 'messages' | 'notifications') => {
    dispatch(clearTabBadge(tab));
  }, [dispatch]);

  // Deep linking helpers
  const shareJob = useCallback(async (jobId: number, jobTitle: string) => {
    await deepLinkingService.shareJob(jobId, jobTitle);
  }, []);

  const shareProfile = useCallback(async (userId: number, userName: string) => {
    await deepLinkingService.shareProfile(userId, userName);
  }, []);

  // Role-based navigation helpers
  const navigateToJobDetail = useCallback((jobId: number) => {
    navigateWithTracking('Jobs', {
      screen: 'JobDetail',
      params: { jobId },
    });
  }, [navigateWithTracking]);

  const navigateToProfile = useCallback((userId?: number) => {
    navigateWithTracking('Profile', {
      screen: 'ProfileMain',
      params: userId ? { userId } : undefined,
    });
  }, [navigateWithTracking]);

  const navigateToChat = useCallback((jobId: number, otherUserName?: string, otherUserId?: number) => {
    navigateWithTracking('Messages', {
      screen: 'Chat',
      params: { jobId, otherUserName, otherUserId },
    });
  }, [navigateWithTracking]);

  const navigateToBookingConfirmation = useCallback((jobId: number, workerId: number, agreedRate: number) => {
    navigateWithTracking('Payments', {
      screen: 'BookingConfirmation',
      params: { jobId, workerId, agreedRate },
    });
  }, [navigateWithTracking]);

  const navigateToJobTracking = useCallback((bookingId: number) => {
    navigateWithTracking('Payments', {
      screen: 'JobTracking',
      params: { bookingId },
    });
  }, [navigateWithTracking]);

  const navigateToReviewSubmission = useCallback((
    bookingId: number, 
    revieweeId: number, 
    revieweeName: string, 
    jobTitle: string
  ) => {
    navigateWithTracking('ReviewSubmission', {
      bookingId,
      revieweeId,
      revieweeName,
      jobTitle,
    });
  }, [navigateWithTracking]);

  // Offline-aware navigation
  const navigateIfOnline = useCallback((screen: string, params?: any, fallbackMessage?: string) => {
    if (isOnline) {
      navigateWithTracking(screen, params);
    } else {
      // Show offline message or handle offline navigation
      console.warn(fallbackMessage || 'This feature requires an internet connection');
    }
  }, [isOnline, navigateWithTracking]);

  return {
    // React Navigation methods
    navigate: navigateWithTracking,
    goBack: goBackWithTracking,
    push: navigation.push,
    pop: navigation.pop,
    popToTop: navigation.popToTop,
    replace: navigation.replace,
    reset: navigation.reset,
    
    // Route info
    currentRoute,
    routeName: route.name,
    routeParams: route.params,
    
    // Badge management
    tabBadges,
    updateTabBadge,
    clearTabBadgeCount,
    
    // Deep linking
    shareJob,
    shareProfile,
    
    // Convenience navigation methods
    navigateToJobDetail,
    navigateToProfile,
    navigateToChat,
    navigateToBookingConfirmation,
    navigateToJobTracking,
    navigateToReviewSubmission,
    
    // Offline-aware navigation
    navigateIfOnline,
    isOnline,
  };
};