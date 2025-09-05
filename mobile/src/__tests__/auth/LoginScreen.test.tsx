import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';

import LoginScreen from '@/screens/auth/LoginScreen';
import authSlice from '@/store/slices/authSlice';

// Mock store for testing
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
  });
};

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('LoginScreen', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    jest.clearAllMocks();
  });

  const renderLoginScreen = () => {
    return render(
      <Provider store={store}>
        <NavigationContainer>
          <LoginScreen />
        </NavigationContainer>
      </Provider>
    );
  };

  it('renders login form correctly', () => {
    const { getByText, getByPlaceholderText } = renderLoginScreen();

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Sign in to your account')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('shows validation errors for empty fields', () => {
    const { getByText } = renderLoginScreen();
    
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // Should show validation errors
    expect(getByText('Email is required')).toBeTruthy();
    expect(getByText('Password is required')).toBeTruthy();
  });

  it('navigates to register screen when sign up is pressed', () => {
    const { getByText } = renderLoginScreen();
    
    const signUpLink = getByText('Sign Up');
    fireEvent.press(signUpLink);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });

  it('navigates to forgot password screen', () => {
    const { getByText } = renderLoginScreen();
    
    const forgotPasswordLink = getByText('Forgot Password?');
    fireEvent.press(forgotPasswordLink);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });
});