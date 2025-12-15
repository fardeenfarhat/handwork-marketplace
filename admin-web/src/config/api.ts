// Dynamically resolve API base URL for admin web
// Priority:
// 1. REACT_APP_API_URL (env)
// 2. window.location.origin (same host as frontend)
// 3. Fallback: http://localhost:8000

const ENV_API_BASE =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '') ||
  'http://192.168.18.35:8000';

export const API_CONFIG = {
  BASE_URL: `${ENV_API_BASE.replace(/\/$/, '')}/api/v1`,
};
