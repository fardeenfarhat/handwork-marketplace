# 🚀 Quick Start: Build APK for Client Testing

## ⚡ Super Quick Method (3 Steps)

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```
(Create account at https://expo.dev/signup if needed)

### Step 3: Build APK
```bash
cd mobile
npm run build:apk
```

**That's it!** Wait 10-15 minutes and you'll get a download link for the APK.

---

## 📋 Alternative Methods

### Method A: Using PowerShell Script (Windows)
```powershell
cd mobile
.\build-apk.ps1
```
This interactive script will guide you through the process.

### Method B: Using EAS CLI Directly
```bash
cd mobile
eas build --platform android --profile preview
```

### Method C: Using npm Scripts
```bash
cd mobile
npm run build:apk          # Quick testing APK
npm run build:staging      # Staging environment APK
npm run build:production   # Production build for Play Store
```

---

## 📱 After Build Completes

1. **You'll receive:**
   - Download link for APK file
   - QR code for easy installation
   - Build details at https://expo.dev

2. **Share with client:**
   - Send the download link
   - Client downloads on Android device
   - Client taps to install
   - May need to enable "Install from Unknown Sources"

3. **Test features:**
   - ✅ Job Tracking Screen (revamped)
   - ✅ Review Submission Screen (revamped)
   - ✅ Reviews List Screen (revamped)
   - ✅ All modern gradient designs
   - ✅ Glass-morphism effects

---

## 🛠️ Troubleshooting

### "Command not found: eas"
```bash
npm install -g eas-cli
```

### "Not logged in"
```bash
eas login
```

### "No build credits"
- Free Expo accounts get limited builds
- Sign up for paid plan or use GitHub Actions

### Build fails
```bash
# Check for errors
npm run type-check
npm run lint

# Ensure dependencies installed
npm install
```

---

## 💰 Build Credits

- **Free Tier:** 30 builds/month for Android
- **Production Tier:** Unlimited builds
- Check your credits: https://expo.dev/accounts/[your-account]/settings/billing

---

## 📚 Full Documentation

See `BUILD_APK_GUIDE.md` for comprehensive instructions and troubleshooting.

---

**Ready to build?** Run: `npm run build:apk`

**Estimated time:** 10-15 minutes

**Output:** Installable APK file for Android testing
