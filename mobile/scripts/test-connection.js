#!/usr/bin/env node

const http = require('http');

const testUrls = [
  'http://192.168.18.19:8000',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://10.0.2.2:8000'
];

async function testConnection(url) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ url, status: 'timeout', error: 'Connection timed out after 3 seconds' });
    }, 3000);

    const req = http.get(url, (res) => {
      clearTimeout(timeout);
      resolve({ 
        url, 
        status: 'success', 
        statusCode: res.statusCode,
        headers: Object.keys(res.headers)
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ url, status: 'error', error: error.message });
    });
  });
}

async function testAllConnections() {
  console.log('🔍 Testing API server connections...\n');
  
  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    const result = await testConnection(url);
    
    if (result.status === 'success') {
      console.log(`✅ SUCCESS - Status: ${result.statusCode}`);
    } else if (result.status === 'timeout') {
      console.log(`⏰ TIMEOUT - ${result.error}`);
    } else {
      console.log(`❌ ERROR - ${result.error}`);
    }
    console.log('');
  }
  
  console.log('💡 Tips:');
  console.log('• Make sure your backend server is running');
  console.log('• Check if the server is listening on 0.0.0.0:8000 (not just localhost)');
  console.log('• Verify firewall settings allow connections on port 8000');
  console.log('• For Django: python manage.py runserver 0.0.0.0:8000');
  console.log('• For Node.js: Make sure the server binds to 0.0.0.0, not just localhost');
}

testAllConnections().catch(console.error);