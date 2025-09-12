# Android Emulator Setup (Windows)

Use this guide to run the Expo React Native app on a local Android emulator so `10.0.2.2` can reach your backend at `localhost`.

## 1. Prerequisites
- Windows 10/11 (64‑bit) with virtualization enabled in BIOS (Intel VT-x / AMD-V)
- At least 8 GB RAM (16 GB recommended)
- Node.js + npm already installed (you have this)

## 2. Install Android Studio
1. Download: https://developer.android.com/studio
2. During setup, keep the boxes checked: *Android SDK*, *Android SDK Platform*, *Android Virtual Device*.
3. Launch Android Studio when done.

## 3. Install SDK Components
In Android Studio:
1. Open **More Actions → SDK Manager**.
2. Under **SDK Platforms** select (recommended):
   - Android 14 (API 34) or Android 13 (API 33)
3. Under **SDK Tools** ensure these are checked:
   - Android SDK Build-Tools (latest)
   - Android SDK Platform-Tools
   - Android Emulator
   - Android SDK Tools
   - Intel x86_64 Emulator Accelerator (HAXM) *or* "Windows Hypervisor Platform" (WHPX) (HAXM only if Intel + supported)
4. Apply / OK and let them download.

## 4. Create a Virtual Device
1. **Device Manager → Create Device**.
2. Pick a phone profile (Pixel 6 or Pixel 5).
3. Choose a system image that matches what you installed (e.g. API 34 x86_64).
4. Finish. Start the device (green play ▶).

## 5. Environment Variables (PowerShell)
Add these so React Native tools find the SDK (adjust path if different):
```powershell
# Run in an elevated PowerShell once
$env:ANDROID_SDK_ROOT="C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT',$env:ANDROID_SDK_ROOT,'User')
[Environment]::SetEnvironmentVariable('ANDROID_HOME',$env:ANDROID_SDK_ROOT,'User')
$platformTools = "$env:ANDROID_SDK_ROOT\platform-tools"
$currentPath = [Environment]::GetEnvironmentVariable('Path','User')
if (-not $currentPath.Contains($platformTools)) { [Environment]::SetEnvironmentVariable('Path',"$currentPath;$platformTools",'User') }
```
Restart PowerShell after this.

## 6. Verify Tools
```powershell
adb --version
```
Should print the Android Debug Bridge version.

## 7. Start Backend Correctly
Bind to all interfaces so the emulator can reach it:
```powershell
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Access from PC: http://127.0.0.1:8000/docs
From emulator: http://10.0.2.2:8000/docs

## 8. Set Expo API URL
In a new PowerShell (project root):
```powershell
cd mobile
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:8000"
npx expo start --android
```
This launches Metro + installs/opens the app on the running emulator.

## 9. Test Connectivity Inside Emulator
In the Expo app, open Developer Menu → Open JS Console; or add a temporary test:
```ts
fetch('http://10.0.2.2:8000/health')
  .then(r=>r.json())
  .then(j=>console.log('HEALTH OK', j))
  .catch(e=>console.log('HEALTH FAIL', e));
```
If it fails, re-check backend host binding and firewall.

## 10. Common Issues
| Problem | Fix |
|---------|-----|
| Request timeout / AbortError | Ensure backend uses `--host 0.0.0.0` and app points to `10.0.2.2` |
| Emulator can’t start (VT-x) | Enable virtualization in BIOS / disable Hyper-V if conflicting |
| `adb` not found | Re-open terminal after setting environment variables |
| Stuck installing app | Click *Cold Boot Now* in Device Manager and retry `npx expo start --android` |
| Using physical device | Use your PC LAN IP instead of 10.0.2.2 (e.g. `http://192.168.1.34:8000`) |

## 11. Optional: Speed Up Emulator
- In Emulator settings enable: Hardware graphics, 4 GB RAM, 2–4 CPUs.
- Disable animations in developer options inside the virtual device.

## 12. Clean Exit / Reset
If Metro is stuck:
```powershell
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*mobile*' } | Stop-Process
```
Then restart with `npx expo start --android`.

---
After this, registration calls should succeed (watch for 200 vs timeouts). Remove the temporary fetch test when done.
