import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';

import { RootState, AppDispatch } from '@/store';
import { 
  loginUser, 
  registerUser, 
  socialLogin,
  logoutUser, 
  clearError,
  setEmailVerified,
  setPhoneVerified,
  setOnboardingCompleted,
} from '@/store/slices/authSlice';
import { LoginCredentials, RegisterData } from '@/types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);

  const login = useCallback((credentials: LoginCredentials) => {
    return dispatch(loginUser(credentials));
  }, [dispatch]);

  const register = useCallback((userData: RegisterData) => {
    return dispatch(registerUser(userData));
  }, [dispatch]);

  const loginWithSocial = useCallback((provider: 'google' | 'facebook' | 'apple') => {
    return dispatch(socialLogin(provider));
  }, [dispatch]);

  const logout = useCallback(() => {
    return dispatch(logoutUser());
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const markEmailVerified = useCallback(() => {
    dispatch(setEmailVerified(true));
  }, [dispatch]);

  const markPhoneVerified = useCallback(() => {
    dispatch(setPhoneVerified(true));
  }, [dispatch]);

  const completeOnboarding = useCallback(() => {
    dispatch(setOnboardingCompleted(true));
  }, [dispatch]);

  return {
    // State
    ...authState,
    
    // Actions
    login,
    register,
    loginWithSocial,
    logout,
    clearAuthError,
    markEmailVerified,
    markPhoneVerified,
    completeOnboarding,
    
    // Computed values
    isLoggedIn: authState.isAuthenticated,
    currentUserId: authState.user?.id || null,
    currentUserName: authState.user ? `${authState.user.firstName} ${authState.user.lastName}` : null,
    currentUserRole: authState.user?.role || null,
    needsEmailVerification: authState.isAuthenticated && !authState.isEmailVerified,
    needsPhoneVerification: authState.isAuthenticated && !authState.isPhoneVerified,
    needsOnboarding: authState.isAuthenticated && !authState.onboardingCompleted,
    canAccessApp: authState.isAuthenticated && authState.isEmailVerified && authState.onboardingCompleted,
  };
};