import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AuthState, User, LoginCredentials, RegisterData, AuthError } from '@/types';
import apiService from '@/services/api';
import { secureStorage } from '@/services/storage';
import oauthService, { OAuthResult } from '@/services/oauth';
import { ErrorHandler } from '@/utils/errorHandler';

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  isEmailVerified: false,
  isPhoneVerified: false,
  onboardingCompleted: false,
  isRetrying: false,
  retryCount: 0,
  lastOperation: null,
  timeoutWarningShown: false,
};

// Async thunks for authentication
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await apiService.login(credentials);
      await secureStorage.setItem('access_token', response.access_token);
      if (response.refresh_token) {
        await secureStorage.setItem('refresh_token', response.refresh_token);
      }
      apiService.setToken(response.access_token);
      return response;
    } catch (error: any) {
      const authError = ErrorHandler.createAuthError(error, 'login');
      return rejectWithValue(authError);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterData, { rejectWithValue }) => {
    try {
      console.log('🎯 AUTH SLICE: registerUser thunk called');
      console.log('📋 User data:', JSON.stringify(userData, null, 2));
      
      console.log('📞 Calling apiService.register...');
      const response = await apiService.register(userData);
      console.log('✅ API response received:', JSON.stringify(response, null, 2));
      
      console.log('💾 Storing access token...');
      await secureStorage.setItem('access_token', response.access_token);
      console.log('✅ Access token stored');
      
      if (response.refresh_token) {
        console.log('💾 Storing refresh token...');
        await secureStorage.setItem('refresh_token', response.refresh_token);
        console.log('✅ Refresh token stored');
      }
      
      console.log('🔑 Setting API token...');
      apiService.setToken(response.access_token);
      console.log('✅ API token set');
      
      console.log('🎉 Registration thunk completed successfully');
      return response;
    } catch (error: any) {
      console.log('💥 Registration thunk failed');
      console.log('❌ Error:', error?.message);
      console.log('🔍 Full error:', error);
      const authError = ErrorHandler.createAuthError(error, 'register');
      return rejectWithValue(authError);
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStored',
  async (_, { rejectWithValue }) => {
    try {
      const token = await secureStorage.getItem('access_token');
      if (token) {
        apiService.setToken(token);
        const user = await apiService.getProfile();
        return { token, user };
      }
      return null;
    } catch (error: any) {
      const authError = ErrorHandler.createAuthError(error, 'loadStored');
      return rejectWithValue(authError);
    }
  }
);

export const socialLogin = createAsyncThunk(
  'auth/socialLogin',
  async (provider: 'google' | 'facebook' | 'apple', { rejectWithValue }) => {
    try {
      let oauthResult: OAuthResult;
      
      switch (provider) {
        case 'google':
          oauthResult = await oauthService.signInWithGoogle();
          break;
        case 'facebook':
          oauthResult = await oauthService.signInWithFacebook();
          break;
        case 'apple':
          oauthResult = await oauthService.signInWithApple();
          break;
        default:
          throw new Error('Unsupported OAuth provider');
      }

      // Send OAuth token to backend for verification and user creation/login
      const response = await apiService.socialLogin(provider, oauthResult.token);
      
      await secureStorage.setItem('access_token', response.access_token);
      if (response.refresh_token) {
        await secureStorage.setItem('refresh_token', response.refresh_token);
      }
      apiService.setToken(response.access_token);
      
      return {
        ...response,
        oauthProvider: provider,
        oauthUser: oauthResult.user,
      };
    } catch (error: any) {
      const authError = ErrorHandler.createAuthError(error, 'socialLogin');
      return rejectWithValue(authError);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    await secureStorage.removeItem('access_token');
    await secureStorage.removeItem('refresh_token');
    await secureStorage.removeItem('remember_me');
    apiService.setToken(null);
    
    // Sign out from OAuth providers
    await oauthService.signOut();
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<AuthError | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.timeoutWarningShown = false;
    },
    setEmailVerified: (state, action: PayloadAction<boolean>) => {
      state.isEmailVerified = action.payload;
      if (state.user) {
        state.user.isVerified = action.payload;
      }
    },
    setPhoneVerified: (state, action: PayloadAction<boolean>) => {
      state.isPhoneVerified = action.payload;
    },
    setOnboardingCompleted: (state, action: PayloadAction<boolean>) => {
      state.onboardingCompleted = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setRetrying: (state, action: PayloadAction<boolean>) => {
      state.isRetrying = action.payload;
    },
    incrementRetryCount: (state) => {
      state.retryCount += 1;
    },
    resetRetryCount: (state) => {
      state.retryCount = 0;
    },
    setLastOperation: (state, action: PayloadAction<AuthState['lastOperation']>) => {
      state.lastOperation = action.payload;
    },
    setTimeoutWarningShown: (state, action: PayloadAction<boolean>) => {
      state.timeoutWarningShown = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.lastOperation = 'login';
        state.timeoutWarningShown = false;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token || null;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.user.isVerified;
        // For existing users logging in, assume onboarding is completed
        state.onboardingCompleted = action.payload.user.isVerified;
        state.error = null;
        state.retryCount = 0;
        state.isRetrying = false;
        state.lastOperation = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
        state.isAuthenticated = false;
        state.isRetrying = false;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        console.log('🔄 AUTH SLICE: registerUser.pending');
        state.isLoading = true;
        state.error = null;
        state.lastOperation = 'register';
        state.timeoutWarningShown = false;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        console.log('✅ AUTH SLICE: registerUser.fulfilled');
        console.log('📋 Payload:', JSON.stringify(action.payload, null, 2));
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token || null;
        state.isAuthenticated = true;
        state.isEmailVerified = false; // New users need to verify email
        state.onboardingCompleted = false; // New users need onboarding
        state.error = null;
        state.retryCount = 0;
        state.isRetrying = false;
        state.lastOperation = null;
        console.log('🎯 Auth state updated - isAuthenticated:', state.isAuthenticated);
      })
      .addCase(registerUser.rejected, (state, action) => {
        console.log('❌ AUTH SLICE: registerUser.rejected');
        console.log('💥 Error payload:', action.payload);
        state.isLoading = false;
        state.error = action.payload as AuthError;
        state.isAuthenticated = false;
        state.isRetrying = false;
      })
      // Load stored auth
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
        state.lastOperation = 'loadStored';
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
          state.isEmailVerified = action.payload.user.isVerified;
        }
        state.lastOperation = null;
      })
      .addCase(loadStoredAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload as AuthError;
        state.lastOperation = null;
      })
      // Social Login
      .addCase(socialLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.lastOperation = 'socialLogin';
        state.timeoutWarningShown = false;
      })
      .addCase(socialLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token || null;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.user.isVerified;
        state.error = null;
        state.retryCount = 0;
        state.isRetrying = false;
        state.lastOperation = null;
      })
      .addCase(socialLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
        state.isAuthenticated = false;
        state.isRetrying = false;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        return initialState;
      });
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setEmailVerified,
  setPhoneVerified,
  setOnboardingCompleted,
  updateUser,
  setRetrying,
  incrementRetryCount,
  resetRetryCount,
  setLastOperation,
  setTimeoutWarningShown,
} = authSlice.actions;

export default authSlice.reducer;