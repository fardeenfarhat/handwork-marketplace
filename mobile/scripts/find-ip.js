#!/usr/bin/env node

const os = require('os');

function findLocalIP() {
  const interfaces = os.networkInterfaces();
  const results = [];

  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        results.push({
          name: name,
          address: interface.address,
          suggested: interface.address.startsWith('192.168.') || interface.address.startsWith('10.0.')
        });
      }
    }
  }

  console.log('🔍 Found network interfaces:');
  results.forEach(result => {
    const marker = result.suggested ? '✅' : '  ';
    console.log(`${marker} ${result.name}: ${result.address}`);
  });

  const suggested = results.find(r => r.suggested);
  if (suggested) {
    console.log('\n💡 Suggested configuration:');
    console.log(`Set EXPO_PUBLIC_LAN_IP=${suggested.address} in your .env file`);
    console.log(`Or update mobile/src/config/api.ts to use: http://${suggested.address}:8000`);
  } else {
    console.log('\n⚠️  No suitable local IP found. You might be using a different network setup.');
  }

  console.log('\n📱 For different platforms:');
  console.log('• Android Emulator: Use 10.0.2.2:8000 (maps to host machine)');
  console.log('• iOS Simulator: Use localhost:8000 or 127.0.0.1:8000');
  console.log('• Physical Device: Use your computer\'s IP address (see suggestions above)');
}

findLocalIP();