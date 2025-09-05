# OAuth Implementation Documentation

## Overview

This document describes the complete OAuth implementation for the Handwork Marketplace mobile app, including Google, Facebook, and Apple Sign-In integration.

## Implementation Status

✅ **Completed Features:**
- OAuth service with Google, Facebook, and Apple Sign-In
- Redux integration for OAuth authentication
- Updated authentication components
- Error handling and fallback mechanisms
- Configuration management
- Platform-specific handling (Apple Sign-In iOS only)
- Comprehensive test coverage
- Setup documentation

## Architecture

### Service Layer (`src/services/oauth.ts`)

The OAuth service provides a unified interface for all social authentication providers:

```typescript
interface OAuthResult {
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
  async signInWithGoogle(): Promise<OAuthResult>
  async signInWithFacebook(): Promise<OAuthResult>
  async signInWithApple(): Promise<OAuthResult>
  async signOut(): Promise<void>
  validateConfiguration(): boolean
}
```

### Redux Integration (`src/store/slices/authSlice.ts`)

Added `socialLogin` async thunk that:
1. Calls the appropriate OAuth service method
2. Sends OAuth token to backend for verification
3. Stores JWT tokens and user data
4. Updates authentication state

### Component Integration

#### SocialLogin Component (`src/components/auth/SocialLogin.tsx`)
- Unified social login interface
- Platform-specific button rendering
- Loading states and error handling
- Configuration validation

#### Updated Auth Screens
- LoginScreen: Integrated SocialLogin component
- RegisterScreen: Integrated SocialLogin component

## Configuration

### OAuth Configuration (`src/config/oauth.ts`)

```typescript
export const OAUTH_CONFIG = {
  google: {
    webClientId: 'your-web-client-id.googleusercontent.com',
    iosClientId: 'your-ios-client-id.googleusercontent.com',
    androidClientId: 'your-android-client-id.googleusercontent.com',
  },
  facebook: {
    appId: 'your-facebook-app-id',
    appName: 'Handwork Marketplace',
  },
  apple: {
    serviceId: 'com.handworkmarketplace.signin',
  },
};
```

### App Configuration (`app.json`)

Added OAuth plugins and URL schemes:

```json
{
  "plugins": [
    ["@react-native-google-signin/google-signin"],
    ["react-native-fbsdk-next"],
    ["@invertase/react-native-apple-authentication"]
  ],
  "ios": {
    "usesAppleSignIn": true,
    "infoPlist": {
      "CFBundleURLTypes": [
        {
          "CFBundleURLName": "google-oauth",
          "CFBundleURLSchemes": ["your-ios-client-id"]
        },
        {
          "CFBundleURLName": "facebook-oauth", 
          "CFBundleURLSchemes": ["fb{your-facebook-app-id}"]
        }
      ]
    }
  }
}
```

## Dependencies

### Installed Packages

```json
{
  "@react-native-google-signin/google-signin": "10.1.1",
  "react-native-fbsdk-next": "12.1.2",
  "@invertase/react-native-apple-authentication": "2.2.2",
  "expo-auth-session": "~5.0.2",
  "expo-crypto": "~12.4.1",
  "expo-web-browser": "~12.3.2"
}
```

### Version Compatibility
- Expo SDK 49 compatible versions
- React Native 0.72 compatible
- iOS 13+ for Apple Sign-In
- Android API 21+ for Google Sign-In

## Authentication Flow

### 1. User Initiates OAuth
```typescript
// User presses social login button
const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
  setSocialLoading(provider);
  const result = await loginWithSocial(provider);
  // Handle result...
};
```

### 2. OAuth Service Handles Provider
```typescript
// OAuth service calls provider-specific method
switch (provider) {
  case 'google':
    oauthResult = await oauthService.signInWithGoogle();
    break;
  case 'facebook':
    oauthResult = await oauthService.signInWithFacebook();
    break;
  case 'apple':
    oauthResult = await oauthService.signInWithApple();
    break;
}
```

### 3. Backend Verification
```typescript
// Send OAuth token to backend
const response = await apiService.socialLogin(provider, oauthResult.token);
```

### 4. Store Authentication
```typescript
// Store JWT tokens and update state
await secureStorage.setItem('access_token', response.access_token);
apiService.setToken(response.access_token);
// Redux state updated automatically
```

## Error Handling

### Provider-Specific Errors

#### Google Sign-In
- `SIGN_IN_CANCELLED`: User cancelled the sign-in
- `IN_PROGRESS`: Sign-in already in progress
- `PLAY_SERVICES_NOT_AVAILABLE`: Google Play Services not available

#### Facebook Sign-In
- `isCancelled: true`: User cancelled the sign-in
- No access token: Authentication failed
- Graph API errors: User data retrieval failed

#### Apple Sign-In
- Code `1001`: User cancelled the sign-in
- `NOT_AUTHORIZED`: Credential state not authorized
- No identity token: Authentication failed

### Error Recovery
- Graceful error messages to users
- Retry mechanisms for network errors
- Fallback to email/password authentication
- Configuration validation before attempting OAuth

## Testing

### Test Coverage

1. **Unit Tests** (`src/__tests__/services/oauth.test.ts`)
   - OAuth service methods
   - Error handling scenarios
   - Configuration validation

2. **Component Tests** (`src/__tests__/components/SocialLogin.test.tsx`)
   - Button rendering and interactions
   - Loading states
   - Error handling

3. **Integration Tests** (`src/__tests__/integration/oauth-flow.test.tsx`)
   - Complete OAuth flows
   - Redux state management
   - Navigation integration

4. **Simple Tests** (`src/__tests__/oauth-simple.test.ts`)
   - Configuration structure validation
   - Error scenario testing
   - Platform compatibility

### Running Tests

```bash
# Run OAuth-specific tests
npm test -- --testPathPattern="oauth"

# Run with coverage
npm test -- --testPathPattern="oauth" --coverage

# Run simple tests (no React Native dependencies)
npm test -- --testPathPattern="oauth-simple"
```

## Security Considerations

### Token Handling
- OAuth tokens never stored locally
- JWT tokens stored in secure storage
- Automatic token refresh handling
- Proper token cleanup on logout

### Configuration Security
- Client secrets never in mobile app
- Backend verification of all OAuth tokens
- Proper redirect URL validation
- HTTPS-only OAuth flows

### Privacy Compliance
- Minimal permission requests
- Clear privacy policy references
- User consent for data collection
- GDPR compliance considerations

## Platform-Specific Implementation

### iOS
- Apple Sign-In capability enabled
- URL schemes configured in Info.plist
- iOS 13+ requirement for Apple Sign-In
- Keychain integration for secure storage

### Android
- Google Play Services dependency
- SHA-1 fingerprint configuration
- Package name verification
- Intent filter configuration

## Backend Integration Requirements

### API Endpoints

The backend must implement these OAuth endpoints:

```
POST /api/v1/auth/oauth/google
POST /api/v1/auth/oauth/facebook
POST /api/v1/auth/oauth/apple
```

### Token Verification

Each endpoint should:
1. Verify OAuth token with provider
2. Extract user information
3. Create or update user account
4. Return JWT access token

### Example Implementation

```python
@router.post("/oauth/google")
async def google_oauth(token_data: OAuthToken):
    # Verify token with Google
    user_info = await verify_google_token(token_data.token)
    
    # Create or get user
    user = await get_or_create_oauth_user(
        email=user_info.email,
        first_name=user_info.given_name,
        last_name=user_info.family_name,
        provider='google',
        provider_id=user_info.sub
    )
    
    # Generate JWT
    access_token = create_access_token(user.id)
    
    return {
        "access_token": access_token,
        "refresh_token": create_refresh_token(user.id),
        "user": user
    }
```

## Deployment Checklist

### Development Setup
- [ ] Install OAuth dependencies
- [ ] Configure OAuth providers (Google, Facebook, Apple)
- [ ] Update app.json with OAuth configuration
- [ ] Set up development OAuth credentials
- [ ] Test OAuth flows on simulators/devices

### Production Setup
- [ ] Create production OAuth applications
- [ ] Configure production redirect URLs
- [ ] Update OAuth configuration with production credentials
- [ ] Test OAuth flows with production builds
- [ ] Verify backend OAuth endpoints
- [ ] Update app store configurations
- [ ] Test on physical devices

### App Store Requirements
- [ ] Privacy policy includes OAuth providers
- [ ] Terms of service updated
- [ ] App permissions properly declared
- [ ] OAuth provider compliance verified
- [ ] Data handling policies documented

## Troubleshooting

### Common Issues

1. **Google Sign-In fails on Android**
   - Verify SHA-1 fingerprint in Google Console
   - Check package name matches exactly
   - Ensure Google Play Services available

2. **Facebook login shows "App Not Setup"**
   - Verify app is in "Live" mode for production
   - Check bundle ID/package name configuration
   - Verify Facebook app permissions

3. **Apple Sign-In not available**
   - Only works on iOS 13+
   - Check capability enabled in app configuration
   - Verify Apple Developer account setup

4. **Backend token verification fails**
   - Check OAuth client IDs match
   - Verify token hasn't expired
   - Ensure proper HTTPS configuration

### Debug Steps

1. Enable debug logging in OAuth service
2. Check network requests in development tools
3. Verify redirect URLs match exactly
4. Test with fresh app installs
5. Check provider-specific error codes

## Future Enhancements

### Planned Features
- [ ] LinkedIn OAuth integration
- [ ] Twitter OAuth integration
- [ ] Microsoft OAuth integration
- [ ] Biometric authentication integration
- [ ] OAuth token refresh automation
- [ ] Enhanced error analytics

### Performance Optimizations
- [ ] OAuth provider preloading
- [ ] Token caching strategies
- [ ] Background token refresh
- [ ] Network request optimization

## Support and Maintenance

### Monitoring
- OAuth success/failure rates
- Provider-specific error tracking
- Token refresh patterns
- User authentication preferences

### Updates
- Regular dependency updates
- OAuth provider API changes
- Security patch management
- Platform compatibility updates

## Conclusion

The OAuth implementation provides a robust, secure, and user-friendly social authentication system for the Handwork Marketplace mobile app. The implementation follows best practices for security, error handling, and user experience while maintaining compatibility across iOS and Android platforms.

For setup instructions, see `OAUTH_SETUP.md`.
For testing information, see the test files in `src/__tests__/`.
For configuration details, see `src/config/oauth.ts`.