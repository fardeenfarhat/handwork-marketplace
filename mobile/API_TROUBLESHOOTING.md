# API Connection Troubleshooting

If you're experiencing timeout issues when running the mobile app, follow these steps:

## 1. Find Your Local IP Address

Run this command to find your computer's IP address:

```bash
npm run find-ip
```

This will show you available network interfaces and suggest the best IP to use.

## 2. Configure Your API URL

### Option A: Using Environment Variables (Recommended)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your IP address:
   ```
   EXPO_PUBLIC_LAN_IP=192.168.1.100  # Replace with your actual IP
   ```

### Option B: Direct Configuration

Edit `mobile/src/config/api.ts` and update the IP addresses in the `resolveDevBase()` function.

## 3. Platform-Specific Settings

### Android Emulator
- Use `10.0.2.2:8000` (this maps to your host machine's localhost)
- Set: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`

### iOS Simulator
- Use `localhost:8000` or `127.0.0.1:8000`
- Set: `EXPO_PUBLIC_API_URL=http://localhost:8000`

### Physical Device
- Use your computer's actual IP address on the local network
- Find it with `npm run find-ip`
- Set: `EXPO_PUBLIC_LAN_IP=192.168.1.100` (replace with your IP)

## 4. Backend Server

Make sure your backend server is running on port 8000:

```bash
# Example - adjust based on your backend setup
python manage.py runserver 0.0.0.0:8000
# or
npm start
# or
yarn dev
```

## 5. Development Mode

The app automatically uses mock data in development mode when API endpoints are not available. This prevents timeout issues while you're building your backend.

If you want to test against real API endpoints, you can:
1. Implement the missing endpoints in your backend
2. Or set `__DEV__ = false` temporarily to test production behavior

## 6. Check Available Endpoints

Test which endpoints are working on your backend:

```bash
npm run test-endpoints
```

This will show you the status of all API endpoints the app tries to use.

## 6. Network Troubleshooting

### Check Connectivity
1. Make sure your phone/emulator and computer are on the same network
2. Test the connection by opening `http://YOUR_IP:8000` in a browser
3. Check firewall settings - make sure port 8000 is accessible

### Common Issues
- **Firewall blocking connections**: Allow port 8000 through your firewall
- **Wrong IP address**: Use `npm run find-ip` to find the correct one
- **Backend not running**: Start your backend server first
- **Different network**: Ensure both devices are on the same WiFi network

## 7. Debug Information

The app logs detailed connection information in the console:
- Base URL being used
- Timeout settings
- Retry attempts
- Connection test results

Check the Metro bundler console for these logs when the app starts.