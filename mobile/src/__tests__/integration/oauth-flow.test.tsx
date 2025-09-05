import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { configureStore } from '@reduxjs/toolkit';

import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import authSlice from '@/store/slices/authSlice';
import oauthService from '@/services/oauth';
import apiService from '@/services/api';

// Mock dependencies
jest.mock('@/services/oauth');
jest.mock('@/services/api');
jest.mock('@/services/storage', () => ({
  secureStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockOAuthService = oauthService as jest.Mocked<typeof oauthService>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;

const Stack = createNativeStackNavigator();

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
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
        ...initialState,
      },
    },
  });
};

const TestNavigator = ({ store }: { store: any }) => (
  <Provider store={store}>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  </Provider>
);

describe('OAuth Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOAuthService.validateConfiguration.mockReturnValue(true);
  });

  describe('Google OAuth Flow', () => {
    it('completes full Google OAuth login flow', async () => {
      const mockOAuthResult = {
        provider: 'google' as const,
        token: 'google-oauth-token',
        user: {
          id: 'google-user-id',
          email: 'test@example.com',
          name: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          picture: 'https://example.com/photo.jpg',
        },
      };

      const mockApiResponse = {
        access_token: 'jwt-access-token',
        refresh_token: 'jwt-refresh-token',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'client',
          isVerified: true,
        },
      };

      mockOAuthService.signInWithGoogle.mockResolvedValue(mockOAuthResult);
      mockApiService.socialLogin.mockResolvedValue(mockApiResponse);

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      // Find and press Google login button
      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      // Wait for OAuth flow to complete
      await waitFor(() => {
        expect(mockOAuthService.signInWithGoogle).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockApiService.socialLogin).toHaveBeenCalledWith('google', 'google-oauth-token');
      });

      // Verify store state is updated
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(true);
      expect(state.auth.user).toEqual(mockApiResponse.user);
      expect(state.auth.token).toBe('jwt-access-token');
    });

    it('handles Google OAuth cancellation', async () => {
      mockOAuthService.signInWithGoogle.mockRejectedValue(new Error('Google sign-in was cancelled'));

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockOAuthService.signInWithGoogle).toHaveBeenCalled();
      });

      // Verify error state
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.error).toBe('Google sign-in was cancelled');
    });

    it('handles backend API error during Google OAuth', async () => {
      const mockOAuthResult = {
        provider: 'google' as const,
        token: 'google-oauth-token',
        user: {
          id: 'google-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockOAuthService.signInWithGoogle.mockResolvedValue(mockOAuthResult);
      mockApiService.socialLogin.mockRejectedValue(new Error('Backend authentication failed'));

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockOAuthService.signInWithGoogle).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockApiService.socialLogin).toHaveBeenCalled();
      });

      // Verify error state
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.error).toBe('Backend authentication failed');
    });
  });

  describe('Facebook OAuth Flow', () => {
    it('completes full Facebook OAuth login flow', async () => {
      const mockOAuthResult = {
        provider: 'facebook' as const,
        token: 'facebook-oauth-token',
        user: {
          id: 'facebook-user-id',
          email: 'test@example.com',
          name: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          picture: 'https://example.com/photo.jpg',
        },
      };

      const mockApiResponse = {
        access_token: 'jwt-access-token',
        refresh_token: 'jwt-refresh-token',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'worker',
          isVerified: true,
        },
      };

      mockOAuthService.signInWithFacebook.mockResolvedValue(mockOAuthResult);
      mockApiService.socialLogin.mockResolvedValue(mockApiResponse);

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      const facebookButton = getByText('Continue with Facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(mockOAuthService.signInWithFacebook).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockApiService.socialLogin).toHaveBeenCalledWith('facebook', 'facebook-oauth-token');
      });

      // Verify store state
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(true);
      expect(state.auth.user).toEqual(mockApiResponse.user);
    });

    it('handles Facebook OAuth cancellation', async () => {
      mockOAuthService.signInWithFacebook.mockRejectedValue(new Error('Facebook sign-in was cancelled'));

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      const facebookButton = getByText('Continue with Facebook');
      fireEvent.press(facebookButton);

      await waitFor(() => {
        expect(mockOAuthService.signInWithFacebook).toHaveBeenCalled();
      });

      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.error).toBe('Facebook sign-in was cancelled');
    });
  });

  describe('Apple OAuth Flow', () => {
    beforeEach(() => {
      // Mock Platform.OS to be iOS for Apple tests
      jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
        OS: 'ios',
      }));
    });

    it('completes full Apple OAuth login flow on iOS', async () => {
      const mockOAuthResult = {
        provider: 'apple' as const,
        token: 'apple-identity-token',
        user: {
          id: 'apple-user-id',
          email: 'test@example.com',
          name: 'Test User',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      const mockApiResponse = {
        access_token: 'jwt-access-token',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'client',
          isVerified: true,
        },
      };

      mockOAuthService.signInWithApple.mockResolvedValue(mockOAuthResult);
      mockApiService.socialLogin.mockResolvedValue(mockApiResponse);

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      const appleButton = getByText('Continue with Apple');
      fireEvent.press(appleButton);

      await waitFor(() => {
        expect(mockOAuthService.signInWithApple).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockApiService.socialLogin).toHaveBeenCalledWith('apple', 'apple-identity-token');
      });

      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(true);
      expect(state.auth.user).toEqual(mockApiResponse.user);
    });
  });

  describe('OAuth Configuration Validation', () => {
    it('shows configuration error when OAuth is not properly configured', async () => {
      mockOAuthService.validateConfiguration.mockReturnValue(false);

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      // Should not attempt OAuth login
      expect(mockOAuthService.signInWithGoogle).not.toHaveBeenCalled();
      
      // Should show configuration error
      await waitFor(() => {
        expect(mockOAuthService.validateConfiguration).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during OAuth flow', async () => {
      // Mock a delayed OAuth response
      mockOAuthService.signInWithGoogle.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);

      // Check loading state is active
      const state = store.getState();
      expect(state.auth.isLoading).toBe(true);

      await waitFor(() => {
        expect(mockOAuthService.signInWithGoogle).toHaveBeenCalled();
      });
    });

    it('disables buttons during OAuth flow', async () => {
      mockOAuthService.signInWithGoogle.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      const googleButton = getByText('Continue with Google');
      const facebookButton = getByText('Continue with Facebook');

      fireEvent.press(googleButton);

      // Buttons should be disabled during loading
      expect(googleButton.props.accessibilityState?.disabled).toBe(true);
      expect(facebookButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('allows retry after OAuth error', async () => {
      mockOAuthService.signInWithGoogle
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          provider: 'google',
          token: 'google-token',
          user: { id: 'test', email: 'test@example.com', name: 'Test' },
        });

      mockApiService.socialLogin.mockResolvedValue({
        access_token: 'jwt-token',
        user: { id: 1, email: 'test@example.com', role: 'client', isVerified: true },
      });

      const store = createMockStore();
      const { getByText } = render(<TestNavigator store={store} />);

      const googleButton = getByText('Continue with Google');

      // First attempt fails
      fireEvent.press(googleButton);
      await waitFor(() => {
        expect(store.getState().auth.error).toBe('Network error');
      });

      // Second attempt succeeds
      fireEvent.press(googleButton);
      await waitFor(() => {
        expect(store.getState().auth.isAuthenticated).toBe(true);
      });
    });
  });
});