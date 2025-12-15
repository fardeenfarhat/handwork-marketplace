// Dynamically resolve API base URL for admin web
// Priority:
// 1. REACT_APP_API_URL (env)
// 2. Production API
// 3. Fallback: http://localhost:8000

const ENV_API_BASE =
  process.env.REACT_APP_API_URL ||
  process.env.NODE_ENV === 'production' 
    ? 'https://handwork-marketplace-api.onrender.com'
    : 'http://192.168.18.35:8000';

export const API_CONFIG = {
  BASE_URL: `${ENV_API_BASE.replace(/\/$/, '')}/api/v1`,
};
