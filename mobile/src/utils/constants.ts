// Authentication constants
export const AUTH_CONSTANTS = {
  // Token storage keys
  ACCESS_TOKEN_KEY: 'access_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  USER_DATA_KEY: 'user_data',
  
  // Validation constants
  MIN_PASSWORD_LENGTH: 8,
  VERIFICATION_CODE_LENGTH: 6,
  
  // Timer constants
  VERIFICATION_RESEND_TIMEOUT: 60, // seconds
  PASSWORD_RESET_TIMEOUT: 300, // 5 minutes
  
  // Social login providers
  SOCIAL_PROVIDERS: {
    GOOGLE: 'google',
    FACEBOOK: 'facebook',
    APPLE: 'apple',
  },
  
  // User roles
  USER_ROLES: {
    CLIENT: 'client',
    WORKER: 'worker',
  },
  
  // Verification types
  VERIFICATION_TYPES: {
    EMAIL: 'email',
    PHONE: 'phone',
  },
};

// App theme colors
export const COLORS = {
  primary: '#007AFF',
  secondary: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  success: '#30D158',
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#8E8E93',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F2F2F7',
  
  // Border colors
  border: '#E5E5EA',
  borderFocused: '#007AFF',
  borderError: '#FF3B30',
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

// Typography
export const TYPOGRAPHY = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// Border radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Screen dimensions helpers
export const SCREEN = {
  // Common breakpoints
  isSmallScreen: (width: number) => width < 375,
  isMediumScreen: (width: number) => width >= 375 && width < 414,
  isLargeScreen: (width: number) => width >= 414,
};

// Animation durations
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// API endpoints (relative to base URL)
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  VERIFY_PHONE: '/auth/verify-phone',
  RESEND_VERIFICATION: '/auth/resend-verification',
  
  // Social auth
  GOOGLE_AUTH: '/auth/oauth/google',
  FACEBOOK_AUTH: '/auth/oauth/facebook',
  APPLE_AUTH: '/auth/oauth/apple',
  
  // User endpoints
  PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
  
  // Jobs endpoints
  JOBS: '/jobs',
  JOB_DETAIL: '/jobs/:id',
  APPLY_JOB: '/jobs/:id/apply',
  
  // Messages endpoints
  MESSAGES: '/messages',
  JOB_MESSAGES: '/messages/job/:jobId',
};

export default {
  AUTH_CONSTANTS,
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SCREEN,
  ANIMATION,
  API_ENDPOINTS,
};