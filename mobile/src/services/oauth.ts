// Conditional OAuth service that works with Expo Go
import { Platform } from 'react-native';

export interface OAuthResult {
  provider: 'google' | 'facebook' | 'apple';
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
  };
}

class ConditionalOAuthService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    console.log('Conditional OAuth service initialized');
    this.initialized = true;
  }

  async signInWithGoogle(): Promise<OAuthResult> {
    // Check if we're in Expo Go (which doesn't support native modules)
    if (__DEV__ && !global.__expo_custom_dev_client) {
      console.log('Using mock Google sign-in for Expo Go');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        provider: 'google',
        token: 'mock-google-token-' + Date.now(),
        user: {
          id: 'google-user-123',
          email: 'user@gmail.com',
          name: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
          picture: 'https://via.placeholder.com/150',
        },
      };
    }

    // In production or custom dev client, use real OAuth
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      return {
        provider: 'google',
        token: userInfo.idToken || '',
        user: {
          id: userInfo.user.id,
          email: userInfo.user.email,
          name: userInfo.user.name || '',
          firstName: userInfo.user.givenName,
          lastName: userInfo.user.familyName,
          picture: userInfo.user.photo,
        },
      };
    } catch (error) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  }

  async signInWithFacebook(): Promise<OAuthResult> {
    // Check if we're in Expo Go
    if (__DEV__ && !global.__expo_custom_dev_client) {
      console.log('Using mock Facebook sign-in for Expo Go');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        provider: 'facebook',
        token: 'mock-facebook-token-' + Date.now(),
        user: {
          id: 'facebook-user-456',
          email: 'user@facebook.com',
          name: 'Jane Smith',
          firstName: 'Jane',
          lastName: 'Smith',
          picture: 'https://via.placeholder.com/150',
        },
      };
    }

    // In production or custom dev client, use real OAuth
    try {
      const { LoginManager, AccessToken } = await import('react-native-fbsdk-next');
      
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      
      if (result.isCancelled) {
        throw new Error('Facebook login was cancelled');
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('Failed to get Facebook access token');
      }

      // Fetch user info from Facebook Graph API
      const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture&access_token=${data.accessToken}`);
      const userInfo = await response.json();

      return {
        provider: 'facebook',
        token: data.accessToken,
        user: {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          firstName: userInfo.first_name,
          lastName: userInfo.last_name,
          picture: userInfo.picture?.data?.url,
        },
      };
    } catch (error) {
      console.error('Facebook Sign-In error:', error);
      throw error;
    }
  }

  async signInWithApple(): Promise<OAuthResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    // Check if we're in Expo Go
    if (__DEV__ && !global.__expo_custom_dev_client) {
      console.log('Using mock Apple sign-in for Expo Go');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        provider: 'apple',
        token: 'mock-apple-token-' + Date.now(),
        user: {
          id: 'apple-user-789',
          email: 'user@icloud.com',
          name: 'Apple User',
          firstName: 'Apple',
          lastName: 'User',
          picture: undefined,
        },
      };
    }

    // In production or custom dev client, use real OAuth
    try {
      const appleAuth = await import('@invertase/react-native-apple-authentication');
      
      const appleAuthRequestResponse = await appleAuth.default.performRequest({
        requestedOperation: appleAuth.AppleAuthRequestOperation.LOGIN,
        requestedScopes: [appleAuth.AppleAuthRequestScope.EMAIL, appleAuth.AppleAuthRequestScope.FULL_NAME],
      });

      return {
        provider: 'apple',
        token: appleAuthRequestResponse.identityToken || '',
        user: {
          id: appleAuthRequestResponse.user,
          email: appleAuthRequestResponse.email || '',
          name: appleAuthRequestResponse.fullName ? 
            `${appleAuthRequestResponse.fullName.givenName || ''} ${appleAuthRequestResponse.fullName.familyName || ''}`.trim() : '',
          firstName: appleAuthRequestResponse.fullName?.givenName,
          lastName: appleAuthRequestResponse.fullName?.familyName,
          picture: undefined,
        },
      };
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      throw error;
    }
  }

  async signOut() {
    console.log('OAuth sign out');
    
    if (!__DEV__ || global.__expo_custom_dev_client) {
      try {
        // Sign out from Google
        const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
        if (await GoogleSignin.isSignedIn()) {
          await GoogleSignin.signOut();
        }
      } catch (error) {
        console.log('Google sign out error:', error);
      }

      try {
        // Sign out from Facebook
        const { LoginManager } = await import('react-native-fbsdk-next');
        LoginManager.logOut();
      } catch (error) {
        console.log('Facebook sign out error:', error);
      }
    }
  }

  async getCurrentUser(provider: 'google' | 'facebook' | 'apple') {
    console.log(`Get current ${provider} user`);
    return null;
  }

  validateConfiguration() {
    console.log('OAuth configuration validation');
    return true;
  }
}

export const oauthService = new ConditionalOAuthService();
export default oauthService;