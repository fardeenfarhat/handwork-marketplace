export const API_CONFIG = {
  // Timeout configurations
  REQUEST_TIMEOUT: 15000, // 15 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second base delay
  
  // Base URLs
  BASE_URL: __DEV__ 
    ? 'http://192.168.18.19:8000/api/v1' 
    : 'https://your-production-api.com/api/v1',
    
  // Error messages
  ERROR_MESSAGES: {
    TIMEOUT: 'Request timed out. Please check your connection and try again.',
    NETWORK: 'Network error. Please check your internet connection.',
    SERVER: 'Server error. Please try again later.',
    RETRY_FAILED: 'Request failed after multiple attempts. Please try again later.',
  }
};

export const RETRY_CONFIG = {
  maxAttempts: API_CONFIG.RETRY_ATTEMPTS,
  baseDelay: API_CONFIG.RETRY_DELAY,
  maxDelay: 10000, // 10 seconds max delay
  backoffFactor: 2, // Exponential backoff
};