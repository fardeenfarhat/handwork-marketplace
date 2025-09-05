# Timeout Scenarios and Performance Testing

This document describes the comprehensive test suite for validating timeout scenarios and performance requirements for the authentication system.

## Overview

The test suite validates the following requirements:
- **Requirement 1.1**: Registration completes within 10 seconds
- **Requirement 2.1**: Login completes within 5 seconds  
- **Requirement 3.1**: Email service timeout handling and development mode fallback
- **Requirement 4.2**: Proper error handling for network issues

## Test Structure

### Backend Tests

#### 1. Email Service Timeout Tests (`backend/tests/test_timeout_scenarios.py`)
- Tests email service timeout decorator functionality
- Validates development mode console fallback
- Tests SMTP connection timeout handling
- Validates email configuration error handling

#### 2. Integration Timeout Tests (`backend/tests/test_integration_timeout.py`)
- End-to-end registration and login performance tests
- Concurrent load testing
- Email service timeout integration
- Development mode integration testing

#### 3. Performance Validation (`backend/tests/test_performance_validation.py`)
- Comprehensive performance validation script
- Real-world scenario testing
- Performance metrics collection and analysis
- Requirements compliance validation

### Mobile Tests

#### 1. Auth Timeout Tests (`mobile/src/__tests__/timeout/auth-timeout.test.ts`)
- API request timeout handling (15 second limit)
- Timeout error message validation
- Retry logic on timeout errors
- Registration and login performance testing

#### 2. Auth Performance Tests (`mobile/src/__tests__/performance/auth-performance.test.ts`)
- API timeout configuration validation
- Error handling performance
- Retry logic performance with exponential backoff
- Loading state management efficiency
- Memory and resource management

## Running the Tests

### Quick Start - Run All Tests
```bash
# Run the comprehensive test suite
python run_timeout_tests.py
```

### Individual Test Categories

#### Backend Tests Only
```bash
# Email service timeout tests
python -m pytest backend/tests/test_timeout_scenarios.py -v

# Integration timeout tests  
python -m pytest backend/tests/test_integration_timeout.py -v

# Performance validation (requires running backend)
python backend/tests/test_performance_validation.py
```

#### Mobile Tests Only
```bash
cd mobile

# Auth timeout tests
npm test src/__tests__/timeout/auth-timeout.test.ts -- --run

# Auth performance tests
npm test src/__tests__/performance/auth-performance.test.ts -- --run

# Error handler tests
npm test src/__tests__/utils/errorHandler.test.ts -- --run

# Retry logic tests
npm test src/__tests__/utils/retry.test.ts -- --run
```

### Prerequisites

#### Backend Prerequisites
```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Install test dependencies
pip install pytest pytest-asyncio

# Set up test database
python create_db.py
```

#### Mobile Prerequisites
```bash
# Install Node.js dependencies
cd mobile
npm install

# Install test dependencies (should be included)
npm install --save-dev jest @testing-library/react-native
```

## Test Scenarios Covered

### 1. Email Service Timeout Handling
- ✅ Email operations timeout after 5 seconds
- ✅ Development mode falls back to console logging
- ✅ SMTP connection failures are handled gracefully
- ✅ Invalid email configuration doesn't block registration
- ✅ Console output includes API usage instructions

### 2. Registration Performance
- ✅ Registration completes within 10 seconds
- ✅ Email sending doesn't block registration flow
- ✅ Email failures don't prevent registration success
- ✅ Concurrent registrations perform adequately

### 3. Login Performance  
- ✅ Login completes within 5 seconds
- ✅ Database queries are optimized
- ✅ Password verification is efficient
- ✅ Performance metrics are logged

### 4. Mobile API Timeout Configuration
- ✅ Requests timeout after 15 seconds
- ✅ Timeout errors show appropriate messages
- ✅ Retry logic works on timeout errors
- ✅ Loading states are managed efficiently

### 5. Error Handling and Retry Logic
- ✅ Network errors are categorized correctly
- ✅ Exponential backoff is implemented properly
- ✅ Maximum retry limits are respected
- ✅ Timeout warnings are shown appropriately

## Performance Benchmarks

### Expected Performance Metrics

| Operation | Requirement | Typical Performance |
|-----------|-------------|-------------------|
| Registration | < 10 seconds | 2-5 seconds |
| Login | < 5 seconds | 1-3 seconds |
| Email Timeout | 5 seconds max | Immediate fallback in dev |
| API Timeout | 15 seconds | Configurable per request |

### Performance Validation Results

The performance validation script generates detailed metrics:

```json
{
  "registration": {
    "avg_duration": 2.34,
    "success_rate": 100.0,
    "requirement_met": true
  },
  "login": {
    "avg_duration": 1.87,
    "success_rate": 100.0,
    "requirement_met": true
  },
  "email_timeout": {
    "all_timeouts_handled": true,
    "fallback_working": true
  }
}
```

## Troubleshooting

### Common Issues

#### Backend Tests Failing
1. **Database Connection Issues**
   ```bash
   # Recreate test database
   cd backend
   python create_db.py
   ```

2. **Email Service Configuration**
   ```bash
   # Check email configuration in .env
   cat backend/.env | grep MAIL
   ```

3. **Import Errors**
   ```bash
   # Ensure PYTHONPATH is set
   export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend"
   ```

#### Mobile Tests Failing
1. **Node Modules Issues**
   ```bash
   cd mobile
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Jest Configuration**
   ```bash
   # Clear Jest cache
   npm test -- --clearCache
   ```

3. **TypeScript Issues**
   ```bash
   # Check TypeScript compilation
   npx tsc --noEmit
   ```

### Performance Issues

#### Slow Test Execution
- Ensure backend server is running locally for integration tests
- Use `--maxWorkers=1` for Jest if experiencing resource issues
- Check system resources (CPU, memory) during test execution

#### Timeout Test Failures
- Verify system clock accuracy
- Check for background processes affecting performance
- Ensure adequate system resources are available

## Continuous Integration

### GitHub Actions Integration
```yaml
name: Timeout and Performance Tests
on: [push, pull_request]
jobs:
  timeout-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run timeout tests
        run: python run_timeout_tests.py
```

### Local Pre-commit Hook
```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
python run_timeout_tests.py
if [ $? -ne 0 ]; then
    echo "Timeout tests failed. Commit aborted."
    exit 1
fi
```

## Monitoring and Alerting

### Performance Monitoring
- Login performance is logged with detailed breakdowns
- Email service timeouts are tracked and logged
- API timeout rates are monitored in production

### Alerting Thresholds
- Registration time > 8 seconds (warning)
- Login time > 4 seconds (warning)  
- Email timeout rate > 5% (alert)
- API timeout rate > 2% (alert)

## Contributing

When adding new timeout or performance tests:

1. **Follow the existing test structure**
2. **Include requirement references in test docstrings**
3. **Add performance assertions with reasonable thresholds**
4. **Update this README with new test scenarios**
5. **Ensure tests are deterministic and not flaky**

### Test Naming Convention
- `test_*_timeout_*` for timeout-specific tests
- `test_*_performance_*` for performance tests
- `test_*_error_handling_*` for error handling tests

### Performance Test Guidelines
- Use realistic test data sizes
- Include both success and failure scenarios
- Test edge cases (network issues, server errors)
- Validate both functional correctness and performance
- Include memory and resource usage validation where appropriate