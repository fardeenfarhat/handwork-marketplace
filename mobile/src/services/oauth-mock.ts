// Mock OAuth service for local development without native modules
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

class MockOAuthService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    console.log('Mock OAuth service initialized');
    this.initialized = true;
  }

  async signInWithGoogle(): Promise<OAuthResult> {
    console.log('Mock Google sign-in');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
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

  async signInWithFacebook(): Promise<OAuthResult> {
    console.log('Mock Facebook sign-in');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
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

  async signInWithApple(): Promise<OAuthResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }
    
    console.log('Mock Apple sign-in');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
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

  async signOut() {
    console.log('Mock OAuth sign out');
  }

  async getCurrentUser(provider: 'google' | 'facebook' | 'apple') {
    console.log(`Mock get current ${provider} user`);
    return null;
  }

  validateConfiguration() {
    console.log('Mock OAuth configuration validation');
    return true;
  }
}

export const oauthService = new MockOAuthService();
export default oauthService;