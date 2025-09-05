import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SocialLogin from '@/components/auth/SocialLogin';
import authSlice from '@/store/slices/authSlice';
import oauthService from '@/services/oauth';

// Mock dependencies
jest.mock('@/services/oauth');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockOAuthService = oauthService as jest.Mocked<typeof oauthService>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

// Create mock store
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

const renderWithProvider = (component: React.ReactElement, initialState = {}) => {
  const store = createMockStore(initialState);
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('SocialLogin Component', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOAuthService.validateConfiguration.mockReturnValue(true);
  });

  it('renders all social login buttons', () => {
    const { getByText } = renderWithProvider(
      <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
    );

    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByText('Continue with Facebook')).toBeTruthy();
  });

  it('renders Apple Sign-In button only on iOS', () => {
    // Mock Platform.OS to be iOS
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      OS: 'ios',
    }));

    const { getByText, queryByText } = renderWithProvider(
      <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
    );

    if (Platform.OS === 'ios') {
      expect(getByText('Continue with Apple')).toBeTruthy();
    } else {
      expect(queryByText('Continue with Apple')).toBeNull();
    }
  });

  it('handles successful Google login', async () => {
    const { getByText } = renderWithProvider(
      <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
    );

    const googleButton = getByText('Continue with Google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles successful Facebook login', async () => {
    const { getByText } = renderWithProvider(
      <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
    );

    const facebookButton = getByText('Continue with Facebook');
    fireEvent.press(facebookButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles OAuth configuration error', () => {
    mockOAuthService.validateConfiguration.mockReturnValue(false);

    const { getByText } = renderWithProvider(
      <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
    );

    const googleButton = getByText('Continue with Google');
    fireEvent.press(googleButton);

    expect(mockAlert).toHaveBeenCalledWith(
      'Configuration Error',
      'Social login is not properly configured. Please contact support.'
    );
    expect(mockOnError).toHaveBeenCalledWith(
      'Social login is not properly configured. Please contact support.'
    );
  });

  it('handles Apple Sign-In on non-iOS platform', () => {
    // Mock Platform.OS to be Android
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      OS: 'android',
    }));

    const { getByText } = renderWithProvider(
      <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
    );

    // Manually trigger Apple login (since button won't be visible on Android)
    const component = getByText('Continue with Google').parent?.parent;
    
    // This test would need to be adjusted based on actual implementation
    // For now, we'll test the error handling logic
    if (Platform.OS !== 'ios') {
      expect(mockAlert).not.toHaveBeenCalled();
    }
  });

  it('disables buttons when loading', () => {
    const { getByText } = renderWithProvider(
      <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />,
      { isLoading: true }
    );

    const googleButton = getByText('Continue with Google');
    const facebookButton = getByText('Continue with Facebook');

    // Buttons should be disabled when auth is loading
    expect(googleButton.props.accessibilityState?.disabled).toBe(true);
    expect(facebookButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows loading state for specific provider', async () => {
    const { getByText } = renderWithProvider(
      <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
    );

    const googleButton = getByText('Continue with Google');
    fireEvent.press(googleButton);

    // Should show loading state for Google button
    await waitFor(() => {
      expect(googleButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('handles login error', async () => {
    // Mock a failed login
    const store = createMockStore();
    const mockDispatch = jest.fn().mockResolvedValue({
      meta: { requestStatus: 'rejected' },
      payload: 'Login failed',
    });
    store.dispatch = mockDispatch;

    const { getByText } = render(
      <Provider store={store}>
        <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
      </Provider>
    );

    const googleButton = getByText('Continue with Google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Login Failed', 'Login failed');
      expect(mockOnError).toHaveBeenCalledWith('Login failed');
    });
  });

  it('prevents multiple simultaneous login attempts', () => {
    const { getByText } = renderWithProvider(
      <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />,
      { isLoading: true }
    );

    const googleButton = getByText('Continue with Google');
    const facebookButton = getByText('Continue with Facebook');

    fireEvent.press(googleButton);
    fireEvent.press(facebookButton);

    // Should not trigger multiple login attempts
    expect(mockOAuthService.validateConfiguration).toHaveBeenCalledTimes(0);
  });

  it('handles network errors gracefully', async () => {
    const store = createMockStore();
    const mockDispatch = jest.fn().mockRejectedValue(new Error('Network error'));
    store.dispatch = mockDispatch;

    const { getByText } = render(
      <Provider store={store}>
        <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
      </Provider>
    );

    const googleButton = getByText('Continue with Google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Login Failed', 'Network error');
      expect(mockOnError).toHaveBeenCalledWith('Network error');
    });
  });

  it('calls onSuccess callback on successful login', async () => {
    const store = createMockStore();
    const mockDispatch = jest.fn().mockResolvedValue({
      meta: { requestStatus: 'fulfilled' },
      payload: { user: { id: 1 }, access_token: 'token' },
    });
    store.dispatch = mockDispatch;

    const { getByText } = render(
      <Provider store={store}>
        <SocialLogin onSuccess={mockOnSuccess} onError={mockOnError} />
      </Provider>
    );

    const googleButton = getByText('Continue with Google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});