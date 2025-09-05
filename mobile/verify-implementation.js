// Simple verification script for our timeout implementation
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying timeout implementation...\n');

// Check API configuration
const apiConfigPath = path.join(__dirname, 'src/config/api.ts');
if (fs.existsSync(apiConfigPath)) {
  const apiConfig = fs.readFileSync(apiConfigPath, 'utf8');
  
  console.log('✅ API Configuration file exists');
  
  // Check timeout value
  if (apiConfig.includes('REQUEST_TIMEOUT: 15000')) {
    console.log('✅ Request timeout set to 15 seconds');
  } else {
    console.log('❌ Request timeout not properly configured');
  }
  
  // Check retry configuration
  if (apiConfig.includes('RETRY_ATTEMPTS: 3')) {
    console.log('✅ Retry attempts configured');
  } else {
    console.log('❌ Retry attempts not configured');
  }
  
  // Check error messages
  if (apiConfig.includes('ERROR_MESSAGES')) {
    console.log('✅ Error messages configured');
  } else {
    console.log('❌ Error messages not configured');
  }
} else {
  console.log('❌ API Configuration file missing');
}

// Check retry utility
const retryUtilPath = path.join(__dirname, 'src/utils/retry.ts');
if (fs.existsSync(retryUtilPath)) {
  console.log('✅ Retry utility exists');
} else {
  console.log('❌ Retry utility missing');
}

// Check auth hook
const authHookPath = path.join(__dirname, 'src/hooks/useAuthWithRetry.ts');
if (fs.existsSync(authHookPath)) {
  console.log('✅ Auth retry hook exists');
} else {
  console.log('❌ Auth retry hook missing');
}

// Check API service updates
const apiServicePath = path.join(__dirname, 'src/services/api.ts');
if (fs.existsSync(apiServicePath)) {
  const apiService = fs.readFileSync(apiServicePath, 'utf8');
  
  console.log('✅ API Service file exists');
  
  // Check timeout update
  if (apiService.includes('API_CONFIG.REQUEST_TIMEOUT')) {
    console.log('✅ API Service uses configurable timeout');
  } else {
    console.log('❌ API Service timeout not updated');
  }
  
  // Check retry import
  if (apiService.includes('withRetry')) {
    console.log('✅ API Service imports retry utility');
  } else {
    console.log('❌ API Service missing retry import');
  }
  
  // Check retry method
  if (apiService.includes('requestWithRetry')) {
    console.log('✅ API Service has retry method');
  } else {
    console.log('❌ API Service missing retry method');
  }
} else {
  console.log('❌ API Service file missing');
}

// Check auth slice updates
const authSlicePath = path.join(__dirname, 'src/store/slices/authSlice.ts');
if (fs.existsSync(authSlicePath)) {
  const authSlice = fs.readFileSync(authSlicePath, 'utf8');
  
  console.log('✅ Auth slice file exists');
  
  // Check error handler import
  if (authSlice.includes('ErrorHandler')) {
    console.log('✅ Auth slice imports error handler');
  } else {
    console.log('❌ Auth slice missing error handler import');
  }
  
  // Check retry state
  if (authSlice.includes('isRetrying') && authSlice.includes('retryCount')) {
    console.log('✅ Auth slice has retry state');
  } else {
    console.log('❌ Auth slice missing retry state');
  }
} else {
  console.log('❌ Auth slice file missing');
}

// Check error handler updates
const errorHandlerPath = path.join(__dirname, 'src/utils/errorHandler.ts');
if (fs.existsSync(errorHandlerPath)) {
  const errorHandler = fs.readFileSync(errorHandlerPath, 'utf8');
  
  console.log('✅ Error handler file exists');
  
  // Check timeout handling
  if (errorHandler.includes('timeout') && errorHandler.includes('API_CONFIG')) {
    console.log('✅ Error handler has timeout handling');
  } else {
    console.log('❌ Error handler missing timeout handling');
  }
} else {
  console.log('❌ Error handler file missing');
}

// Check screen updates
const loginScreenPath = path.join(__dirname, 'src/screens/auth/LoginScreen.tsx');
if (fs.existsSync(loginScreenPath)) {
  const loginScreen = fs.readFileSync(loginScreenPath, 'utf8');
  
  console.log('✅ Login screen file exists');
  
  // Check retry hook usage
  if (loginScreen.includes('useAuthWithRetry')) {
    console.log('✅ Login screen uses retry hook');
  } else {
    console.log('❌ Login screen not updated with retry hook');
  }
  
  // Check retry state
  if (loginScreen.includes('isRetrying')) {
    console.log('✅ Login screen handles retry state');
  } else {
    console.log('❌ Login screen missing retry state handling');
  }
} else {
  console.log('❌ Login screen file missing');
}

console.log('\n🎯 Implementation verification complete!');