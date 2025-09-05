import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';

import AppNavigator from '@/navigation/AppNavigator';
import MainTabNavigator from '@/navigation/MainTabNavigator';
import authSlice from '@/store/slices/authSlice';
import navigationSlice from '@/store/slices/navigationSlice';
import cacheSlice from '@/store/slices/cacheSlice';
import { User } from '@/types';

// Mock the navigation dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }: any) => children,
}));

jest.mock('@/services/deepLinking', () => ({
  linkingConfig: {},
  deepLinkingService: {
    setNavigationRef: jest.fn(),
    handleDeepLink: jest.fn(),
  },
}));

jest.mock('@/services/offlineSync', () => ({
  offlineSyncService: {
    initialize: jest.fn(),
  },
}));

// Mock screens
jest.mock('@/screens/dashboard/DashboardScreen', () => 'DashboardScreen');
jest.mock('@/screens/jobs/JobsScreen', () => 'JobsScreen');
jest.mock('@/navigation/MessagesStackNavigator', () => 'MessagesStackNavigator');
jest.mock('@/navigation/ProfileStackNavigator', () => 'ProfileStackNavigator');
jest.mock('@/navigation/PaymentStackNavigator', () => 'PaymentStackNavigator');
jest.mock('@/navigation/JobsStackNavigator', () => 'JobsStackNavigator');
jest.mock('@/navigation/AuthNavigator', () => 'AuthNavigator');
jest.mock('@/components/common/LoadingSpinner', () => 'LoadingSpinner');

const createMockStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      navigation: navigationSlice,
      cache: cacheSlice,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        isEmailVerified: false,
        isPhoneVerified: false,
        onboardingCompleted: false,
        ...initialState.auth,
      },
      navigation: {
        currentRoute: 'Dashboard',
        previousRoute: null,
        tabBadges: { messages: 0, notifications: 0 },
        deepLinkPending: null,
        isOnline: true,
        ...initialState.navigation,
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
        ...initialState.cache,
      },
    },
  });
};

describe('Navigation System', () => {
  describe('AppNavigator', () => {
    it('shows auth navigator when user is not authenticated', () => {
      const store = createMockStore({
        auth: { isAuthenticated: false, isLoading: false },
      });

      const { getByText } = render(
        <Provider store={store}>
          <AppNavigator />
        </Provider>
      );

      expect(getByText('AuthNavigator')).toBeTruthy();
    });

    it('shows main navigator when user is authenticated and verified', () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        phone: '+1234567890',
        role: 'worker',
        firstName: 'John',
        lastName: 'Doe',
        isVerified: true,
      };

      const store = createMockStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: mockUser,
          isEmailVerified: true,
          onboardingCompleted: true,
        },
      });

      const { queryByText } = render(
        <Provider store={store}>
          <AppNavigator />
        </Provider>
      );

      expect(queryByText('AuthNavigator')).toBeFalsy();
    });

    it('shows loading spinner when authentication is loading', () => {
      const store = createMockStore({
        auth: { isLoading: true },
      });

      const { getByText } = render(
        <Provider store={store}>
          <AppNavigator />
        </Provider>
      );

      expect(getByText('LoadingSpinner')).toBeTruthy();
    });
  });

  describe('MainTabNavigator', () => {
    it('renders correct tabs for worker role', () => {
      const mockUser: User = {
        id: 1,
        email: 'worker@example.com',
        phone: '+1234567890',
        role: 'worker',
        firstName: 'Jane',
        lastName: 'Worker',
        isVerified: true,
      };

      const store = createMockStore({
        auth: { user: mockUser },
      });

      const { getByText } = render(
        <Provider store={store}>
          <MainTabNavigator />
        </Provider>
      );

      // Check for worker-specific tab labels
      expect(getByText('Find Work')).toBeTruthy();
      expect(getByText('Earnings')).toBeTruthy();
    });

    it('renders correct tabs for client role', () => {
      const mockUser: User = {
        id: 2,
        email: 'client@example.com',
        phone: '+1234567890',
        role: 'client',
        firstName: 'John',
        lastName: 'Client',
        isVerified: true,
      };

      const store = createMockStore({
        auth: { user: mockUser },
      });

      const { getByText } = render(
        <Provider store={store}>
          <MainTabNavigator />
        </Provider>
      );

      // Check for client-specific tab labels
      expect(getByText('My Jobs')).toBeTruthy();
      expect(getByText('Payments')).toBeTruthy();
    });

    it('renders common tabs for both roles', () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        phone: '+1234567890',
        role: 'worker',
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
      };

      const store = createMockStore({
        auth: { user: mockUser },
      });

      const { getByText } = render(
        <Provider store={store}>
          <MainTabNavigator />
        </Provider>
      );

      // Check for common tabs
      expect(getByText('Home')).toBeTruthy();
      expect(getByText('Messages')).toBeTruthy();
      expect(getByText('Profile')).toBeTruthy();
    });
  });

  describe('Role-based Navigation', () => {
    it('shows different navigation options for workers vs clients', () => {
      const workerUser: User = {
        id: 1,
        email: 'worker@example.com',
        phone: '+1234567890',
        role: 'worker',
        firstName: 'Worker',
        lastName: 'User',
        isVerified: true,
      };

      const clientUser: User = {
        id: 2,
        email: 'client@example.com',
        phone: '+1234567890',
        role: 'client',
        firstName: 'Client',
        lastName: 'User',
        isVerified: true,
      };

      // Test worker navigation
      const workerStore = createMockStore({
        auth: { user: workerUser },
      });

      const { getByText: getWorkerText } = render(
        <Provider store={workerStore}>
          <MainTabNavigator />
        </Provider>
      );

      expect(getWorkerText('Find Work')).toBeTruthy();
      expect(getWorkerText('Earnings')).toBeTruthy();

      // Test client navigation
      const clientStore = createMockStore({
        auth: { user: clientUser },
      });

      const { getByText: getClientText } = render(
        <Provider store={clientStore}>
          <MainTabNavigator />
        </Provider>
      );

      expect(getClientText('My Jobs')).toBeTruthy();
      expect(getClientText('Payments')).toBeTruthy();
    });
  });

  describe('Offline State', () => {
    it('handles offline state correctly', () => {
      const store = createMockStore({
        navigation: { isOnline: false },
      });

      const { getByText } = render(
        <Provider store={store}>
          <MainTabNavigator />
        </Provider>
      );

      // Navigation should still render when offline
      expect(getByText('Home')).toBeTruthy();
    });
  });

  describe('Tab Badges', () => {
    it('displays message badge when there are unread messages', () => {
      const store = createMockStore({
        navigation: {
          tabBadges: { messages: 5, notifications: 0 },
        },
      });

      render(
        <Provider store={store}>
          <MainTabNavigator />
        </Provider>
      );

      // Badge functionality would be tested with actual tab implementation
      // This is a placeholder for badge testing
    });
  });
});