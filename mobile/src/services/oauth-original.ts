import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import appleAuth, { AppleAuthRequestOperation, AppleAuthRequestScope } from '@invertase/react-native-apple-authentication';
import { OAUTH_CONFIG, validateOAuthConfig } from '@/config/oauth';

// Configure WebBrowser for OAuth flows
WebBrowser.maybeCompleteAuthSession();

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

class OAuthService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Configure Google Sign-In
      await GoogleSignin.configure({
        webClientId: OAUTH_CONFIG.google.webClientId,
        iosClientId: OAUTH_CONFIG.google.iosClientId,
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
      });

      this.initialized = true;
    } catch (error) {
      console.error('OAuth initialization failed:', error);
      throw new Error('Failed to initialize OAuth services');
    }
  }

  async signInWithGoogle(): Promise<OAuthResult> {
    try {
      await this.initialize();

      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo.user) {
        throw new Error('Google sign-in failed: No user data received');
      }

      // Get access token
      const tokens = await GoogleSignin.getTokens();

      return {
        provider: 'google',
        token: tokens.accessToken,
        user: {
          id: userInfo.user.id,
          email: userInfo.user.email,
          name: userInfo.user.name || '',
          firstName: userInfo.user.givenName,
          lastName: userInfo.user.familyName,
          picture: userInfo.user.photo,
        },
      };
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google sign-in was cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Google sign-in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      } else {
        throw new Error('Google sign-in failed: ' + error.message);
      }
    }
  }

  async signInWithFacebook(): Promise<OAuthResult> {
    try {
      // Request Facebook login with permissions
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

      if (result.isCancelled) {
        throw new Error('Facebook sign-in was cancelled');
      }

      // Get access token
      const data = await AccessToken.getCurrentAccessToken();
      
      if (!data) {
        throw new Error('Facebook sign-in failed: No access token received');
      }

      // Fetch user profile from Facebook Graph API
      const response = await fetch(
        `https://graph.facebook.com/me?access_token=${data.accessToken}&fields=id,name,email,first_name,last_name,picture.type(large)`
      );
      
      const userInfo = await response.json();

      if (!userInfo.id) {
        throw new Error('Facebook sign-in failed: No user data received');
      }

      return {
        provider: 'facebook',
        token: data.accessToken,
        user: {
          id: userInfo.id,
          email: userInfo.email || '',
          name: userInfo.name || '',
          firstName: userInfo.first_name,
          lastName: userInfo.last_name,
          picture: userInfo.picture?.data?.url,
        },
      };
    } catch (error: any) {
      console.error('Facebook sign-in error:', error);
      throw new Error('Facebook sign-in failed: ' + error.message);
    }
  }

  async signInWithApple(): Promise<OAuthResult> {
    try {
      // Check if Apple Sign-In is available (iOS 13+ only)
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS');
      }

      // Perform Apple Sign-In request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: AppleAuthRequestOperation.LOGIN,
        requestedScopes: [AppleAuthRequestScope.EMAIL, AppleAuthRequestScope.FULL_NAME],
      });

      // Get credential state
      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user
      );

      if (credentialState !== appleAuth.State.AUTHORIZED) {
        throw new Error('Apple Sign-In authorization failed');
      }

      const { user, email, fullName, identityToken } = appleAuthRequestResponse;

      if (!identityToken) {
        throw new Error('Apple Sign-In failed: No identity token received');
      }

      // Construct user name from fullName object
      const firstName = fullName?.givenName || '';
      const lastName = fullName?.familyName || '';
      const name = `${firstName} ${lastName}`.trim();

      return {
        provider: 'apple',
        token: identityToken,
        user: {
          id: user,
          email: email || '',
          name: name,
          firstName,
          lastName,
          picture: undefined, // Apple doesn't provide profile pictures
        },
      };
    } catch (error: any) {
      console.error('Apple sign-in error:', error);
      
      if (error.code === '1001') {
        throw new Error('Apple sign-in was cancelled');
      } else {
        throw new Error('Apple sign-in failed: ' + error.message);
      }
    }
  }

  async signOut() {
    try {
      // Sign out from all providers
      const promises = [];

      // Google sign out
      if (await GoogleSignin.isSignedIn()) {
        promises.push(GoogleSignin.signOut());
      }

      // Facebook sign out
      promises.push(LoginManager.logOut());

      await Promise.all(promises);
    } catch (error) {
      console.error('OAuth sign out error:', error);
      // Don't throw error for sign out failures
    }
  }

  async getCurrentUser(provider: 'google' | 'facebook' | 'apple') {
    try {
      switch (provider) {
        case 'google':
          if (await GoogleSignin.isSignedIn()) {
            return await GoogleSignin.getCurrentUser();
          }
          break;
        case 'facebook':
          const accessToken = await AccessToken.getCurrentAccessToken();
          return accessToken ? { accessToken: accessToken.accessToken } : null;
        case 'apple':
          // Apple doesn't provide a way to get current user without re-authentication
          return null;
        default:
          return null;
      }
    } catch (error) {
      console.error(`Get current ${provider} user error:`, error);
      return null;
    }
  }

  // Utility method to validate OAuth configuration
  validateConfiguration() {
    const validation = validateOAuthConfig();
    
    if (!validation.isValid) {
      console.warn('OAuth Configuration Issues:', validation.errors);
      return false;
    }

    return true;
  }
}

export const oauthService = new OAuthService();
export default oauthService;