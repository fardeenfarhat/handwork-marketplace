# 📱 Building APK for Client Testing

This guide will help you build a testing APK for the Handwork Marketplace mobile app.

## 🎯 Prerequisites

1. **Install EAS CLI** (if not already installed):
```bash
npm install -g eas-cli
```

2. **Login to Expo Account**:
```bash
eas login
```
If you don't have an Expo account, create one at https://expo.dev/signup

3. **Configure Your Project** (if first time):
```bash
cd mobile
eas build:configure
```

## 🚀 Building the APK

### Option 1: Preview Build (Quick Testing APK)
This is the fastest way to get a testing APK:

```bash
cd mobile
eas build --platform android --profile preview
```

**Advantages:**
- Fast build (usually 10-15 minutes)
- Internal distribution
- Easy to share via download link
- No Google Play Store needed

### Option 2: Staging Build
For more thorough testing with staging environment:

```bash
cd mobile
eas build --platform android --profile staging
```

## 📦 Build Process

1. **Start the build**:
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```

2. **EAS will:**
   - Upload your project to Expo servers
   - Build the APK in the cloud
   - Provide a download link when complete

3. **Monitor progress**:
   - Watch the terminal for build logs
   - Or visit: https://expo.dev/accounts/[your-account]/projects/handwork-marketplace-mobile/builds

4. **Download APK**:
   - Once complete, you'll get a download link
   - Download the `.apk` file
   - Share with your client

## 📲 Installing on Android Device

### Method 1: Direct Download
1. Send the download link to your client
2. Open link on Android device
3. Download and install the APK
4. You may need to enable "Install from Unknown Sources" in Settings

### Method 2: Manual Transfer
1. Download APK to computer
2. Transfer to Android device via USB/email/cloud
3. Open file manager on device
4. Tap the APK file to install

## ⚙️ Important Configuration

### Update app.json Before Building

Make sure your `app.json` has proper Android configuration:

```json
{
  "expo": {
    "name": "Handwork Marketplace",
    "version": "1.0.0",
    "android": {
      "package": "com.handworkmarketplace.mobile",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#007AFF"
      },
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "NOTIFICATIONS"
      ]
    }
  }
}
```

## 🔧 Troubleshooting

### Build Fails?
1. Check your Expo account has build credits
2. Ensure all dependencies are properly installed
3. Check for TypeScript/ESLint errors: `npm run type-check`
4. Review build logs for specific errors

### APK Won't Install?
1. Enable "Install from Unknown Sources" in device settings
2. Check Android version compatibility (minimum API level)
3. Ensure enough storage space on device

### App Crashes on Launch?
1. Check backend API is accessible
2. Verify API URL in environment configuration
3. Check device logs using `adb logcat`

## 📊 Build Variants Explained

### Preview Build
- **Purpose:** Quick testing
- **Type:** APK (not Play Store)
- **Distribution:** Internal only
- **Best for:** Client testing, QA

### Staging Build
- **Purpose:** Pre-production testing
- **Type:** APK
- **Distribution:** Internal
- **Best for:** UAT, extensive testing

### Production Build
- **Purpose:** App Store release
- **Type:** AAB (App Bundle)
- **Distribution:** Google Play Store
- **Best for:** Public release

## 🎨 Current App Features (All Revamped!)

Your client will be testing these newly revamped screens:
- ✅ Job Tracking Screen (with timeline, payments, reviews)
- ✅ Review Submission Screen (complete modern redesign)
- ✅ Reviews List Screen (premium card design)
- ✅ Modern gradient themes throughout
- ✅ Glass-morphism effects
- ✅ Consistent design system

## 🔗 Useful Commands

```bash
# Check build status
eas build:list

# Cancel a build
eas build:cancel

# View build details
eas build:view [build-id]

# Re-download APK
eas build:download --platform android --profile preview
```

## 📱 QR Code Installation

After building, EAS provides a QR code. Your client can:
1. Install Expo Go app
2. Scan QR code
3. Download and install APK directly

## 🚀 Quick Start (TL;DR)

```bash
# Navigate to mobile directory
cd mobile

# Install EAS CLI (if needed)
npm install -g eas-cli

# Login
eas login

# Build APK
eas build --platform android --profile preview

# Wait for build to complete (~10-15 mins)
# Download APK from provided link
# Share with client
```

## 💡 Pro Tips

1. **Increment version** before each build for easy tracking
2. **Test locally first** with `npm start` and Expo Go
3. **Document changes** for each build you share
4. **Keep build logs** for debugging
5. **Use descriptive commit messages** before building

## 📞 Support

If you encounter issues:
- Check Expo documentation: https://docs.expo.dev/build/setup/
- Expo Discord: https://chat.expo.dev/
- Stack Overflow: Tag with `expo` and `eas-build`

---

**Build Status:** Ready to build! 🎉
**Last Updated:** October 6, 2025
