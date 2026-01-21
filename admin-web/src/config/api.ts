// Dynamically resolve API base URL for admin web
// Priority:
// 1. REACT_APP_API_URL (env)
// 2. Fallback: http://localhost:8000

const ENV_API_BASE =
  process.env.REACT_APP_API_URL ||
  'http://localhost:8000';

export const API_CONFIG = {
  BASE_URL: `${ENV_API_BASE.replace(/\/$/, '')}/api/v1`,
};
