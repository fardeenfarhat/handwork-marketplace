# OAuth Setup Guide

This guide explains how to configure social authentication (Google, Facebook, Apple) for the Handwork Marketplace mobile app.

## Prerequisites

Before setting up OAuth, you need to:
1. Have developer accounts with Google, Facebook, and Apple
2. Have your app's bundle identifier and package name ready
3. Have access to your backend API endpoints

## Google OAuth Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API and Google Sign-In API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"

### 2. Create OAuth Client IDs

Create three OAuth client IDs:

#### Web Client ID (for backend verification)
- Application type: Web application
- Authorized redirect URIs: `https://your-backend-domain.com/auth/google/callback`

#### iOS Client ID
- Application type: iOS
- Bundle ID: `com.handworkmarketplace.mobile`

#### Android Client ID
- Application type: Android
- Package name: `com.handworkmarketplace.mobile`
- SHA-1 certificate fingerprint: (get from your keystore)

### 3. Update Configuration

Update `mobile/src/config/oauth.ts`:
```typescript
google: {
  webClientId: 'your-web-client-id.googleusercontent.com',
  iosClientId: 'your-ios-client-id.googleusercontent.com',
  androidClientId: 'your-android-client-id.googleusercontent.com',
}
```

Update `mobile/app.json` iOS section:
```json
"infoPlist": {
  "CFBundleURLTypes": [
    {
      "CFBundleURLName": "google-oauth",
      "CFBundleURLSchemes": ["your-ios-client-id"]
    }
  ]
}
```

## Facebook OAuth Setup

### 1. Facebook Developer Console Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs

### 2. Configure Facebook App

#### Basic Settings
- App Name: Handwork Marketplace
- App Domains: your-domain.com
- Privacy Policy URL: https://your-domain.com/privacy
- Terms of Service URL: https://your-domain.com/terms

#### Facebook Login Settings
- Valid OAuth Redirect URIs: `https://your-backend-domain.com/auth/facebook/callback`
- Valid Deauthorize Callback URL: `https://your-backend-domain.com/auth/facebook/deauthorize`

### 3. Update Configuration

Update `mobile/src/config/oauth.ts`:
```typescript
facebook: {
  appId: 'your-facebook-app-id',
  appName: 'Handwork Marketplace',
}
```

Update `mobile/app.json`:
```json
"ios": {
  "infoPlist": {
    "CFBundleURLTypes": [
      {
        "CFBundleURLName": "facebook-oauth",
        "CFBundleURLSchemes": ["fb{your-facebook-app-id}"]
      }
    ]
  }
}
```

## Apple Sign-In Setup

### 1. Apple Developer Console Setup

1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Go to "Certificates, Identifiers & Profiles"
3. Create or update your App ID
4. Enable "Sign In with Apple" capability

### 2. Configure Service ID (for web/backend)

1. Create a new Services ID
2. Configure it for "Sign In with Apple"
3. Add your domain and redirect URL

### 3. Update Configuration

Update `mobile/app.json`:
```json
"ios": {
  "usesAppleSignIn": true
}
```

Apple Sign-In doesn't require client-side configuration beyond enabling the capability.

## Backend Integration

Your backend needs to handle OAuth tokens from each provider:

### API Endpoints Required

```
POST /api/v1/auth/oauth/google
POST /api/v1/auth/oauth/facebook  
POST /api/v1/auth/oauth/apple
```

### Token Verification

Each endpoint should:
1. Verify the OAuth token with the provider
2. Extract user information
3. Create or update user account
4. Return JWT token for app authentication

### Example Backend Implementation (Python/FastAPI)

```python
@router.post("/oauth/google")
async def google_oauth(token_data: OAuthToken):
    # Verify token with Google
    user_info = await verify_google_token(token_data.token)
    
    # Create or get user
    user = await get_or_create_user(
        email=user_info.email,
        first_name=user_info.given_name,
        last_name=user_info.family_name,
        provider='google'
    )
    
    # Generate JWT
    access_token = create_access_token(user.id)
    
    return {
        "access_token": access_token,
        "user": user
    }
```

## Testing OAuth Integration

### Development Testing

1. Use test accounts for each provider
2. Test on both iOS and Android simulators/devices
3. Verify token exchange with backend
4. Test error scenarios (cancelled login, network errors)

### Production Checklist

- [ ] All OAuth client IDs configured
- [ ] Backend endpoints implemented and tested
- [ ] App store configurations updated
- [ ] Privacy policy includes OAuth providers
- [ ] Terms of service updated
- [ ] Error handling implemented
- [ ] Logout functionality working

## Troubleshooting

### Common Issues

1. **Google Sign-In fails on Android**
   - Check SHA-1 fingerprint in Google Console
   - Ensure package name matches exactly

2. **Facebook login shows "App Not Setup"**
   - Check app is in "Live" mode for production
   - Verify bundle ID/package name

3. **Apple Sign-In not available**
   - Only works on iOS 13+
   - Check capability is enabled in Xcode

4. **Token verification fails on backend**
   - Check client IDs match between frontend and backend
   - Verify token hasn't expired

### Debug Tips

1. Enable debug logging in OAuth service
2. Check network requests in development tools
3. Verify redirect URLs match exactly
4. Test with fresh app installs

## Security Considerations

1. Never store OAuth client secrets in mobile app
2. Always verify tokens on backend
3. Use HTTPS for all OAuth redirects
4. Implement proper token refresh logic
5. Handle token revocation gracefully
6. Log OAuth events for security monitoring

## Support

For OAuth setup issues:
1. Check provider documentation
2. Review error logs
3. Test with minimal implementation first
4. Contact provider support if needed