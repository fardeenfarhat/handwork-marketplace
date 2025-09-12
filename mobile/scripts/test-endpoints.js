#!/usr/bin/env node

const http = require('http');

const baseUrl = 'http://192.168.18.19:8000';
const endpoints = [
  '/api/v1/auth/me',
  '/api/v1/users/profile',
  '/api/v1/users/worker-profile',
  '/api/v1/users/client-profile',
  '/api/v1/jobs',
  '/health',
  '/api/v1/',
  '/'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = `${baseUrl}${endpoint}`;
    const timeout = setTimeout(() => {
      resolve({ endpoint, status: 'timeout', error: 'Connection timed out after 3 seconds' });
    }, 3000);

    const req = http.get(url, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          endpoint, 
          status: 'response', 
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          dataLength: data.length
        });
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ endpoint, status: 'error', error: error.message });
    });
  });
}

async function testAllEndpoints() {
  console.log(`🔍 Testing API endpoints on ${baseUrl}...\n`);
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    const result = await testEndpoint(endpoint);
    
    if (result.status === 'response') {
      const statusEmoji = result.statusCode < 300 ? '✅' : result.statusCode < 500 ? '⚠️' : '❌';
      console.log(`${statusEmoji} ${result.statusCode} - ${result.contentType || 'unknown'} (${result.dataLength} bytes)`);
    } else if (result.status === 'timeout') {
      console.log(`⏰ TIMEOUT - ${result.error}`);
    } else {
      console.log(`❌ ERROR - ${result.error}`);
    }
    console.log('');
  }
  
  console.log('💡 Status Code Guide:');
  console.log('• 200-299: Success ✅');
  console.log('• 300-399: Redirect ⚠️');
  console.log('• 400-499: Client Error (endpoint may not exist) ⚠️');
  console.log('• 500-599: Server Error ❌');
}

testAllEndpoints().catch(console.error);