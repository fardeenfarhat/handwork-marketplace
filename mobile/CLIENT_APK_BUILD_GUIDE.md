# 📱 Build APK for Client - Simple Steps

## 🎯 What You Need to Do:

Follow these exact commands to build and share APK with your client:

---

## 📝 **STEP-BY-STEP INSTRUCTIONS:**

### **Step 1: Open PowerShell/Terminal**

Open PowerShell and navigate to mobile directory:

```powershell
cd D:\HandworkMarketplace\mobile
```

---

### **Step 2: Clean and Reinstall Dependencies** 

```powershell
npm install
```

This ensures all React Native modules are properly installed.

---

### **Step 3: Build APK with EAS**

```powershell
eas build --platform android --profile preview --non-interactive
```

**What this does:**
- Uploads your project to EAS servers
- Builds APK in the cloud (10-15 minutes)
- Gives you a download link

---

### **Step 4: Wait for Build to Complete**

You'll see:
```
✓ Uploaded to EAS
⠋ Building...
```

**Wait about 10-15 minutes**. Don't close the terminal.

---

### **Step 5: Get Download Link**

When complete, you'll see:
```
✓ Build completed!
📱 APK URL: https://expo.dev/artifacts/...
```

**Copy that URL!**

---

### **Step 6: Share with Client**

Send your client:
1. **The download link** (from Step 5)
2. **Installation instructions** (see below)

---

## 📲 **Instructions for Your Client:**

Send this message to your client:

```
Hi,

Please download and install the Handwork Marketplace app:

1. Download APK: [PASTE THE LINK HERE]

2. On your Android phone:
   - Open the link in your browser
   - Download the APK file
   - Tap the downloaded file
   - If prompted, enable "Install from Unknown Sources"
   - Tap "Install"
   - Open the app and test!

Features to test:
✅ Job Tracking Screen (completely revamped)
✅ Review Submission Screen (modern design)
✅ Reviews List Screen (premium cards)
✅ All gradient designs and animations

Let me know if you have any issues!
```

---

## 🔧 **If Build Fails Again:**

Run this alternative command:

```powershell
cd D:\HandworkMarketplace\mobile
npm install --legacy-peer-deps
eas build --platform android --profile preview --clear-cache --non-interactive
```

---

## ⚡ **Quick Checklist:**

Before building, ensure:
- ✅ You're in `D:\HandworkMarketplace\mobile` directory
- ✅ You're logged into EAS: `eas whoami`
- ✅ You have internet connection
- ✅ You have build credits (free: 30/month)

---

## 📊 **Build Status Tracking:**

While building, you can check status at:
```
https://expo.dev/accounts/fardeenfarhat/projects/handwork-marketplace-mobile/builds
```

---

## 💡 **After Successful Build:**

You'll get:
1. **Download URL** - Direct APK download link (share this!)
2. **QR Code** - Client can scan to download  
3. **Build ID** - For your tracking

**The APK link is valid for 30 days** - perfect for client testing!

---

## 🎯 **COMPLETE COMMANDS (Copy-Paste):**

```powershell
# Navigate to mobile directory
cd D:\HandworkMarketplace\mobile

# Install dependencies
npm install

# Build APK
eas build --platform android --profile preview --non-interactive

# Wait 10-15 minutes...
# Copy the download link when done
# Share link with client
```

---

## 📧 **Sample Email to Client:**

```
Subject: Handwork Marketplace App - Testing Build

Hi [Client Name],

The app is ready for testing! Here's how to install it:

Download Link: [PASTE APK LINK HERE]

Installation Steps:
1. Click the link on your Android phone
2. Download the APK file  
3. Open the file and tap "Install"
4. If asked, enable "Install from Unknown Sources" in settings
5. Launch the app!

What's New:
✨ Completely revamped Job Tracking screen with timeline
✨ Modern Review Submission with gradient designs
✨ Premium Reviews List with beautiful cards
✨ Smooth animations throughout

Please test and let me know your feedback!

Thanks,
[Your Name]
```

---

**Ready?** Run the commands and build your APK! 🚀

**Estimated Time:** 10-15 minutes  
**Result:** Downloadable APK link you can share anywhere
