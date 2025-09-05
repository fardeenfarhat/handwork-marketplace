// OAuth Configuration
// Replace these with your actual OAuth credentials

export const OAUTH_CONFIG = {
  google: {
    // Web Client ID from Google Cloud Console
    webClientId: __DEV__ 
      ? 'your-dev-google-web-client-id.googleusercontent.com'
      : 'your-prod-google-web-client-id.googleusercontent.com',
    
    // iOS Client ID from Google Cloud Console
    iosClientId: __DEV__
      ? 'your-dev-ios-client-id.googleusercontent.com'
      : 'your-prod-ios-client-id.googleusercontent.com',
    
    // Android Client ID from Google Cloud Console
    androidClientId: __DEV__
      ? 'your-dev-android-client-id.googleusercontent.com'
      : 'your-prod-android-client-id.googleusercontent.com',
  },
  
  facebook: {
    // Facebook App ID from Facebook Developer Console
    appId: __DEV__ 
      ? 'your-dev-facebook-app-id' 
      : 'your-prod-facebook-app-id',
    
    // Facebook App Name
    appName: 'Handwork Marketplace',
  },
  
  apple: {
    // Apple doesn't require client-side configuration
    // Service ID is configured in Apple Developer Console
    serviceId: 'com.handworkmarketplace.signin',
  },
};

// Validation function to check if OAuth is properly configured
export const validateOAuthConfig = () => {
  const errors: string[] = [];

  // Check Google configuration
  if (!OAUTH_CONFIG.google.webClientId || OAUTH_CONFIG.google.webClientId.includes('your-')) {
    errors.push('Google OAuth Web Client ID not configured');
  }
  
  if (!OAUTH_CONFIG.google.iosClientId || OAUTH_CONFIG.google.iosClientId.includes('your-')) {
    errors.push('Google OAuth iOS Client ID not configured');
  }

  // Check Facebook configuration
  if (!OAUTH_CONFIG.facebook.appId || OAUTH_CONFIG.facebook.appId.includes('your-')) {
    errors.push('Facebook OAuth App ID not configured');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Environment-specific URLs for OAuth redirects
export const OAUTH_REDIRECT_URLS = {
  development: {
    google: 'com.handworkmarketplace.dev://oauth/google',
    facebook: 'com.handworkmarketplace.dev://oauth/facebook',
    apple: 'com.handworkmarketplace.dev://oauth/apple',
  },
  production: {
    google: 'com.handworkmarketplace://oauth/google',
    facebook: 'com.handworkmarketplace://oauth/facebook',
    apple: 'com.handworkmarketplace://oauth/apple',
  },
};