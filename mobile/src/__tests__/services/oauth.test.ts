import { jest } from '@jest/globals';
import oauthService, { OAuthResult } from '@/services/oauth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import appleAuth from '@invertase/react-native-apple-authentication';

// Mock the OAuth libraries
jest.mock('@react-native-google-signin/google-signin');
jest.mock('react-native-fbsdk-next');
jest.mock('@invertase/react-native-apple-authentication');
jest.mock('@/config/oauth', () => ({
  OAUTH_CONFIG: {
    google: {
      webClientId: 'test-web-client-id.googleusercontent.com',
      iosClientId: 'test-ios-client-id.googleusercontent.com',
      androidClientId: 'test-android-client-id.googleusercontent.com',
    },
    facebook: {
      appId: 'test-facebook-app-id',
      appName: 'Test App',
    },
    apple: {
      serviceId: 'com.test.signin',
    },
  },
  validateOAuthConfig: () => ({ isValid: true, errors: [] }),
}));

const mockGoogleSignin = GoogleSignin as jest.Mocked<typeof GoogleSignin>;
const mockLoginManager = LoginManager as jest.Mocked<typeof LoginManager>;
const mockAccessToken = AccessToken as jest.Mocked<typeof AccessToken>;
const mockAppleAuth = appleAuth as jest.Mocked<typeof appleAuth>;

describe('OAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Google OAuth', () => {
    it('should successfully sign in with Google', async () => {
      const mockUserInfo = {
        user: {
          id: 'google-user-id',
          email: 'test@example.com',
          name: 'Test User',
          givenName: 'Test',
          familyName: 'User',
          photo: 'https://example.com/photo.jpg',
        },
      };

      const mockTokens = {
        accessToken: 'google-access-token',
        idToken: 'google-id-token',
      };

      mockGoogleSignin.configure.mockResolvedValue();
      mockGoogleSignin.hasPlayServices.mockResolvedValue(true);
      mockGoogleSignin.signIn.mockResolvedValue(mockUserInfo);
      mockGoogleSignin.getTokens.mockResolvedValue(mockTokens);

      const result = await oauthService.signInWithGoogle();

      expect(result).toEqual({
        provider: 'google',
        token: 'google-access-token',
        user: {
          id: 'google-user-id',
          email: 'test@example.com',
          name: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          picture: 'https://example.com/photo.jpg',
        },
      });

      expect(mockGoogleSignin.configure).toHaveBeenCalled();
      expect(mockGoogleSignin.hasPlayServices).toHaveBeenCalled();
      expect(mockGoogleSignin.signIn).toHaveBeenCalled();
      expect(mockGoogleSignin.getTokens).toHaveBeenCalled();
    });

    it('should handle Google sign-in cancellation', async () => {
      const error = { code: '12501' }; // SIGN_IN_CANCELLED
      
      mockGoogleSignin.configure.mockResolvedValue();
      mockGoogleSignin.hasPlayServices.mockResolvedValue(true);
      mockGoogleSignin.signIn.mockRejectedValue(error);

      await expect(oauthService.signInWithGoogle()).rejects.toThrow('Google sign-in was cancelled');
    });

    it('should handle Google Play Services not available', async () => {
      const error = { code: '2' }; // PLAY_SERVICES_NOT_AVAILABLE
      
      mockGoogleSignin.configure.mockResolvedValue();
      mockGoogleSignin.hasPlayServices.mockRejectedValue(error);

      await expect(oauthService.signInWithGoogle()).rejects.toThrow('Google Play Services not available');
    });

    it('should handle missing user data', async () => {
      const mockUserInfo = { user: null };

      mockGoogleSignin.configure.mockResolvedValue();
      mockGoogleSignin.hasPlayServices.mockResolvedValue(true);
      mockGoogleSignin.signIn.mockResolvedValue(mockUserInfo);

      await expect(oauthService.signInWithGoogle()).rejects.toThrow('Google sign-in failed: No user data received');
    });
  });

  describe('Facebook OAuth', () => {
    it('should successfully sign in with Facebook', async () => {
      const mockLoginResult = { isCancelled: false };
      const mockAccessTokenData = { accessToken: 'facebook-access-token' };
      const mockUserInfo = {
        id: 'facebook-user-id',
        email: 'test@example.com',
        name: 'Test User',
        first_name: 'Test',
        last_name: 'User',
        picture: { data: { url: 'https://example.com/photo.jpg' } },
      };

      mockLoginManager.logInWithPermissions.mockResolvedValue(mockLoginResult);
      mockAccessToken.getCurrentAccessToken.mockResolvedValue(mockAccessTokenData);
      
      // Mock fetch for Facebook Graph API
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockUserInfo),
      });

      const result = await oauthService.signInWithFacebook();

      expect(result).toEqual({
        provider: 'facebook',
        token: 'facebook-access-token',
        user: {
          id: 'facebook-user-id',
          email: 'test@example.com',
          name: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          picture: 'https://example.com/photo.jpg',
        },
      });

      expect(mockLoginManager.logInWithPermissions).toHaveBeenCalledWith(['public_profile', 'email']);
      expect(mockAccessToken.getCurrentAccessToken).toHaveBeenCalled();
    });

    it('should handle Facebook sign-in cancellation', async () => {
      const mockLoginResult = { isCancelled: true };

      mockLoginManager.logInWithPermissions.mockResolvedValue(mockLoginResult);

      await expect(oauthService.signInWithFacebook()).rejects.toThrow('Facebook sign-in was cancelled');
    });

    it('should handle missing access token', async () => {
      const mockLoginResult = { isCancelled: false };

      mockLoginManager.logInWithPermissions.mockResolvedValue(mockLoginResult);
      mockAccessToken.getCurrentAccessToken.mockResolvedValue(null);

      await expect(oauthService.signInWithFacebook()).rejects.toThrow('Facebook sign-in failed: No access token received');
    });

    it('should handle Facebook Graph API error', async () => {
      const mockLoginResult = { isCancelled: false };
      const mockAccessTokenData = { accessToken: 'facebook-access-token' };

      mockLoginManager.logInWithPermissions.mockResolvedValue(mockLoginResult);
      mockAccessToken.getCurrentAccessToken.mockResolvedValue(mockAccessTokenData);
      
      // Mock fetch to return user info without ID
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({}),
      });

      await expect(oauthService.signInWithFacebook()).rejects.toThrow('Facebook sign-in failed: No user data received');
    });
  });

  describe('Apple OAuth', () => {
    beforeEach(() => {
      // Mock Platform.OS to be 'ios' for Apple tests
      jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
        OS: 'ios',
      }));
    });

    it('should successfully sign in with Apple', async () => {
      const mockAppleResponse = {
        user: 'apple-user-id',
        email: 'test@example.com',
        fullName: {
          givenName: 'Test',
          familyName: 'User',
        },
        identityToken: 'apple-identity-token',
      };

      mockAppleAuth.performRequest.mockResolvedValue(mockAppleResponse);
      mockAppleAuth.getCredentialStateForUser.mockResolvedValue(mockAppleAuth.State.AUTHORIZED);

      const result = await oauthService.signInWithApple();

      expect(result).toEqual({
        provider: 'apple',
        token: 'apple-identity-token',
        user: {
          id: 'apple-user-id',
          email: 'test@example.com',
          name: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          picture: undefined,
        },
      });

      expect(mockAppleAuth.performRequest).toHaveBeenCalledWith({
        requestedOperation: mockAppleAuth.Operation.LOGIN,
        requestedScopes: [mockAppleAuth.Scope.EMAIL, mockAppleAuth.Scope.FULL_NAME],
      });
    });

    it('should handle Apple sign-in cancellation', async () => {
      const error = { code: '1001' }; // User cancelled

      mockAppleAuth.performRequest.mockRejectedValue(error);

      await expect(oauthService.signInWithApple()).rejects.toThrow('Apple sign-in was cancelled');
    });

    it('should handle unauthorized credential state', async () => {
      const mockAppleResponse = {
        user: 'apple-user-id',
        email: 'test@example.com',
        identityToken: 'apple-identity-token',
      };

      mockAppleAuth.performRequest.mockResolvedValue(mockAppleResponse);
      mockAppleAuth.getCredentialStateForUser.mockResolvedValue(mockAppleAuth.State.NOT_FOUND);

      await expect(oauthService.signInWithApple()).rejects.toThrow('Apple Sign-In authorization failed');
    });

    it('should handle missing identity token', async () => {
      const mockAppleResponse = {
        user: 'apple-user-id',
        email: 'test@example.com',
        identityToken: null,
      };

      mockAppleAuth.performRequest.mockResolvedValue(mockAppleResponse);
      mockAppleAuth.getCredentialStateForUser.mockResolvedValue(mockAppleAuth.State.AUTHORIZED);

      await expect(oauthService.signInWithApple()).rejects.toThrow('Apple Sign-In failed: No identity token received');
    });
  });

  describe('Sign Out', () => {
    it('should sign out from all providers', async () => {
      mockGoogleSignin.isSignedIn.mockResolvedValue(true);
      mockGoogleSignin.signOut.mockResolvedValue();
      mockLoginManager.logOut.mockResolvedValue();

      await oauthService.signOut();

      expect(mockGoogleSignin.signOut).toHaveBeenCalled();
      expect(mockLoginManager.logOut).toHaveBeenCalled();
    });

    it('should handle sign out errors gracefully', async () => {
      mockGoogleSignin.isSignedIn.mockRejectedValue(new Error('Google error'));
      mockLoginManager.logOut.mockRejectedValue(new Error('Facebook error'));

      // Should not throw error
      await expect(oauthService.signOut()).resolves.toBeUndefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration successfully', () => {
      const result = oauthService.validateConfiguration();
      expect(result).toBe(true);
    });
  });

  describe('Get Current User', () => {
    it('should get current Google user', async () => {
      const mockUser = { user: { id: 'test-id' } };
      
      mockGoogleSignin.isSignedIn.mockResolvedValue(true);
      mockGoogleSignin.getCurrentUser.mockResolvedValue(mockUser);

      const result = await oauthService.getCurrentUser('google');
      expect(result).toEqual(mockUser);
    });

    it('should get current Facebook user', async () => {
      const mockAccessToken = { accessToken: 'test-token' };
      
      mockAccessToken.getCurrentAccessToken.mockResolvedValue(mockAccessToken);

      const result = await oauthService.getCurrentUser('facebook');
      expect(result).toEqual({ accessToken: 'test-token' });
    });

    it('should return null for Apple (not supported)', async () => {
      const result = await oauthService.getCurrentUser('apple');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockGoogleSignin.isSignedIn.mockRejectedValue(new Error('Test error'));

      const result = await oauthService.getCurrentUser('google');
      expect(result).toBeNull();
    });
  });
});