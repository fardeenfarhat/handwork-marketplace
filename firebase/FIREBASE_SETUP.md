# Firebase Setup Guide for Handwork Marketplace Messaging

## Prerequisites

1. **Firebase CLI**: Install Firebase CLI

   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Account**: Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `handwork-marketplace`
4. Enable Google Analytics (optional)
5. Create project

## Step 2: Enable Firebase Services

### Authentication

1. Go to Authentication → Sign-in method
2. Enable Email/Password
3. Enable Google (optional)
4. Configure authorized domains

### Firestore Database

1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (we'll update rules later)
4. Select location (choose closest to your users)

### Storage

1. Go to Storage
2. Click "Get started"
3. Choose "Start in test mode"
4. Select location

### Cloud Functions

1. Go to Functions
2. Click "Get started"
3. Upgrade to Blaze plan (required for Cloud Functions)

### Cloud Messaging

1. Go to Cloud Messaging
2. No setup required, automatically enabled

## Step 3: Configure Firebase Project

### Initialize Firebase in your project

```bash
cd firebase
firebase login
firebase init
```

Select:

- ✅ Firestore: Configure security rules and indexes files
- ✅ Functions: Configure a Cloud Functions directory and its files
- ✅ Storage: Configure a security rules file for Cloud Storage

Choose existing project: `handwork-marketplace`

### Deploy Firebase Configuration

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage

# Deploy Cloud Functions
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Step 4: Get Firebase Configuration

1. Go to Project Settings → General
2. Scroll to "Your apps"
3. Click "Add app" → Web app
4. Register app name: `handwork-marketplace-web`
5. Copy the Firebase config object

### Web App Config

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCnb-LrVBYO1KCmZi21VgQBXqjIFw7vrzA",
  authDomain: "handwork-marketplace.firebaseapp.com",
  projectId: "handwork-marketplace",
  storageBucket: "handwork-marketplace.firebasestorage.app",
  messagingSenderId: "1079112680705",
  appId: "1:1079112680705:web:1a24d87f936e29ecf7c700",
  measurementId: "G-LEL4315Z62",
};
```

### React Native Config

1. Add Android app in Firebase Console
2. Download `google-services.json` → `mobile/android/app/`
3. Add iOS app in Firebase Console
4. Download `GoogleService-Info.plist` → `mobile/ios/`

## Step 5: Backend Configuration

### Environment Variables

Create `.env` file in backend directory:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=handwork-marketplace
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@handwork-marketplace.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40handwork-marketplace.iam.gserviceaccount.com

# Or use service account file path
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
```

### Service Account Key

1. Go to Project Settings → Service accounts
2. Click "Generate new private key"
3. Save as `firebase-service-account.json` in backend directory
4. Add to `.gitignore`

## Step 6: React Native Setup

### Install Dependencies

```bash
cd mobile
npm install @react-native-firebase/app
npm install @react-native-firebase/auth
npm install @react-native-firebase/firestore
npm install @react-native-firebase/storage
npm install @react-native-firebase/messaging
npm install @react-native-firebase/functions
```

### Android Configuration

1. Add to `android/build.gradle`:

   ```gradle
   dependencies {
     classpath 'com.google.gms:google-services:4.3.15'
   }
   ```

2. Add to `android/app/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

### iOS Configuration

1. Add `GoogleService-Info.plist` to iOS project in Xcode
2. Update `ios/Podfile`:

   ```ruby
   use_frameworks! :linkage => :static
   ```

3. Run:
   ```bash
   cd ios && pod install
   ```

## Step 7: Security Rules

### Firestore Rules (already configured)

- Users can read/write their own data
- Messages are accessible to sender/receiver only
- Conversations are accessible to participants only
- Proper validation for all operations

### Storage Rules (already configured)

- Users can upload to their own folders
- File type and size validation
- Secure access control

## Step 8: Testing

### Test Firebase Connection

```bash
# Test Cloud Functions locally
firebase emulators:start

# Test Firestore rules
firebase emulators:start --only firestore
```

### Test React Native Integration

```javascript
// Test Firebase connection in React Native
import { firebase } from "@react-native-firebase/app";

console.log("Firebase App:", firebase.app().name);
```

## Step 9: Production Deployment

### Update Security Rules for Production

1. Review and tighten Firestore rules
2. Review and tighten Storage rules
3. Enable App Check for additional security

### Performance Optimization

1. Set up Firestore indexes for queries
2. Configure Cloud Functions regions
3. Set up monitoring and alerts

### Backup and Recovery

1. Enable Firestore backups
2. Set up Cloud Storage lifecycle rules
3. Monitor usage and costs

## Environment-Specific Configuration

### Development

```javascript
// Use Firebase emulators for development
if (__DEV__) {
  firestore().useEmulator("localhost", 8080);
  auth().useEmulator("http://localhost:9099");
  storage().useEmulator("localhost", 9199);
}
```

### Production

- Use production Firebase project
- Enable security features
- Monitor performance and costs

## Monitoring and Analytics

### Set up Firebase Analytics

1. Enable Google Analytics
2. Track messaging events
3. Monitor user engagement

### Performance Monitoring

1. Enable Performance Monitoring
2. Track app performance
3. Monitor Firestore performance

### Crashlytics

1. Enable Crashlytics
2. Track app crashes
3. Monitor error rates

## Cost Optimization

### Firestore

- Optimize queries to reduce reads
- Use pagination for large datasets
- Clean up old data regularly

### Storage

- Compress images before upload
- Set up lifecycle rules
- Monitor storage usage

### Cloud Functions

- Optimize function execution time
- Use appropriate memory allocation
- Monitor function invocations

## Troubleshooting

### Common Issues

1. **Authentication errors**: Check API keys and configuration
2. **Permission denied**: Review Firestore security rules
3. **Network errors**: Check internet connection and Firebase status
4. **Build errors**: Ensure all dependencies are installed correctly

### Debug Tools

- Firebase Console logs
- React Native Flipper
- Chrome DevTools for web
- Xcode/Android Studio debuggers

## Next Steps

1. **Implement push notifications**: Set up FCM for mobile notifications
2. **Add offline support**: Configure Firestore offline persistence
3. **Implement real-time features**: Use Firestore real-time listeners
4. **Add advanced features**: Voice messages, video calls, etc.
5. **Scale for production**: Optimize for performance and cost

---

This Firebase setup provides a robust, scalable messaging system that's much more suitable for a production mobile application than the previous WebSocket-based approach.
