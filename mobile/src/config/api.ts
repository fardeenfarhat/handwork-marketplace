// Dynamic API base URL resolution tailored for React Native / Expo environments.
// Order of precedence:
// 1. Explicit env overrides (EXPO_PUBLIC_API_URL / REACT_NATIVE_API_URL)
// 2. Platform-specific dev fallbacks (Android emulator, iOS simulator, web)
// 3. LAN IP fallback (attempt from env EXPO_PUBLIC_LAN_IP if provided)
// 4. Final production placeholder
// NOTE: Using localhost for development. For physical devices, use your computer's IP address.

// We import Platform lazily to avoid issues when this file is imported in non-RN contexts (tests).
let platform: string | undefined = undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  platform = require('react-native').Platform?.OS;
} catch (_) {
  platform = undefined; // probably running in a Jest / node env
}

// Helper to pick a sensible dev base when env vars are absent.
const resolveDevBase = (): string => {
  // If user provided a LAN IP explicitly, prefer it (e.g. set EXPO_PUBLIC_LAN_IP=192.168.229.209)
  const lanIP = process.env.EXPO_PUBLIC_LAN_IP;
  if (lanIP) return `http://${lanIP}:8000`;

  // Use localhost for all platforms when using Expo tunneling
  // Expo tunnel will handle routing from mobile device to localhost
  return 'http://localhost:8000';
};

const RAW_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.REACT_NATIVE_API_URL ||
  (__DEV__ ? resolveDevBase() : 'https://your-production-api.com');

const NORMALIZED_BASE = `${RAW_BASE.replace(/\/$/, '')}`; // strip trailing slash just in case

export const API_CONFIG = {
  // Timeout configurations - reduced for faster feedback during development
  REQUEST_TIMEOUT: __DEV__ ? 5000 : 15000, // 5 seconds in dev, 15 in production
  RETRY_ATTEMPTS: __DEV__ ? 1 : 3, // Only 1 retry in dev for faster feedback
  RETRY_DELAY: 1000, // 1 second base delay

  // Development mode settings
  ENABLE_MOCK_MODE: __DEV__ && process.env.EXPO_PUBLIC_MOCK_API === 'true', // Set EXPO_PUBLIC_MOCK_API=true to enable mock mode
  
  // Base URL (append version path)
  BASE_URL: `${NORMALIZED_BASE}/api/v1`,

  // Expose the raw resolved base (without /api/v1) for diagnostics if needed
  RAW_BASE: NORMALIZED_BASE,

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