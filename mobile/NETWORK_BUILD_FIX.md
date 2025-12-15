# 🌐 Network Connectivity Issue - Build Fix

## ❌ **THE PROBLEM:**

```
Could not GET 'https://dl.google.com/...'
> No such host is known (dl.google.com)
```

**Translation:** Gradle can't download Android build tools from Google's servers.

---

## 🔍 **WHAT'S HAPPENING:**

Gradle needs to download dependencies from:
- `dl.google.com` (Google's Maven repository)
- `repo1.maven.org` (Maven Central)
- `jcenter.bintray.com` (JCenter)

Your computer can't reach these servers right now.

---

## ✅ **SOLUTIONS (Try in Order):**

### **Solution 1: Check Internet Connection** ⭐ (Most Common)

1. **Test if you can reach Google:**
   ```powershell
   Test-NetConnection dl.google.com -Port 443
   ```

2. **If it fails, check:**
   - Is your internet working? (Try browsing websites)
   - Is your VPN blocking Google services?
   - Is your firewall blocking Gradle?
   - Are you behind a corporate proxy?

---

### **Solution 2: Retry the Build** (Network might be temporarily down)

Just run it again:
```powershell
cd D:\HandworkMarketplace\mobile\android
.\gradlew assembleRelease
```

Sometimes Google's servers have temporary hiccups. Try 2-3 times.

---

### **Solution 3: Use Gradle with Offline Mode (if you built before)**

If you've successfully built before and have cached dependencies:
```powershell
cd D:\HandworkMarketplace\mobile\android
.\gradlew assembleRelease --offline
```

⚠️ This only works if you already downloaded dependencies previously.

---

### **Solution 4: Configure Proxy (if behind corporate network)**

If you're behind a corporate proxy, configure Gradle:

1. **Create/Edit** `gradle.properties` in `mobile/android/`:
   ```properties
   systemProp.http.proxyHost=your.proxy.host
   systemProp.http.proxyPort=8080
   systemProp.https.proxyHost=your.proxy.host
   systemProp.https.proxyPort=8080
   systemProp.http.nonProxyHosts=localhost|127.0.0.1
   ```

2. **Ask your IT team** for proxy settings if you don't know them.

---

### **Solution 5: Disable VPN/Firewall Temporarily**

If you have VPN or firewall active:

1. **Temporarily disable VPN**
2. **Allow Gradle through Windows Firewall:**
   - Open Windows Defender Firewall
   - Click "Allow an app or feature through Windows Defender Firewall"
   - Find Java/Gradle and allow it

3. **Retry the build**

---

### **Solution 6: Use Alternative Maven Repositories**

Add backup repositories to `build.gradle`:

**Edit:** `mobile/android/build.gradle`

Find the `repositories` section and add mirrors:
```gradle
repositories {
    google()
    mavenCentral()
    
    // Add backup mirrors
    maven { url "https://maven.google.com" }
    maven { url "https://repo1.maven.org/maven2" }
}
```

---

### **Solution 7: Clear Gradle Cache and Retry**

Corrupted cache might be causing issues:

```powershell
# Clean Gradle cache
cd D:\HandworkMarketplace\mobile\android
.\gradlew clean
.\gradlew --stop

# Delete Gradle cache (optional - will re-download everything)
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches"

# Rebuild
.\gradlew assembleRelease
```

⚠️ This will re-download all dependencies (may take 15-30 minutes).

---

### **Solution 8: Use Mobile Hotspot**

If your Wi-Fi/network has restrictions:

1. Enable mobile hotspot on your phone
2. Connect your computer to your phone's hotspot
3. Run the build again

This bypasses corporate/restrictive networks.

---

## 🚀 **RECOMMENDED QUICK FIXES:**

### **Try This First:**

```powershell
# Test connectivity
Test-NetConnection dl.google.com -Port 443

# If that works, retry build
cd D:\HandworkMarketplace\mobile\android
.\gradlew assembleRelease --refresh-dependencies
```

### **If That Fails:**

```powershell
# Clean and rebuild
cd D:\HandworkMarketplace\mobile\android
.\gradlew clean
.\gradlew assembleRelease
```

---

## 🔧 **ALTERNATIVE: Use EAS Build (Cloud)**

If local building keeps failing due to network issues, use Expo's cloud build:

```powershell
cd D:\HandworkMarketplace\mobile
npx eas build --platform android --profile preview
```

This runs the build on Expo's servers (requires internet but avoids local network issues).

---

## 📊 **DIAGNOSTIC COMMANDS:**

### **Check if Gradle can reach the internet:**
```powershell
# Test Google Maven
Test-NetConnection dl.google.com -Port 443

# Test Maven Central
Test-NetConnection repo1.maven.org -Port 443
```

### **Check Gradle status:**
```powershell
cd D:\HandworkMarketplace\mobile\android
.\gradlew --version
.\gradlew --status
```

### **Check network config:**
```powershell
# Check DNS
nslookup dl.google.com

# Check if proxy is set
echo $env:HTTP_PROXY
echo $env:HTTPS_PROXY
```

---

## ✅ **AFTER FIX:**

Once network is working, build should complete in 5-10 minutes:

```
BUILD SUCCESSFUL in Xm Ys
```

Then your APK will be at:
```
D:\HandworkMarketplace\mobile\android\app\build\outputs\apk\release\app-release.apk
```

---

## 🆘 **STILL NOT WORKING?**

### **Quick Checklist:**
- [ ] Internet connection is active (can browse websites)
- [ ] VPN is disabled (or allows Google domains)
- [ ] Firewall allows Java/Gradle
- [ ] Not behind restrictive proxy
- [ ] Tried retry 2-3 times (Google servers might be temporarily down)

### **Last Resort:**
Use **EAS Build** (cloud) or ask someone with better internet to build for you.

---

**Most Common Fix:** Just retry the build. Network hiccups happen! 🔄
