# Comprehensive Testing Suite

This document describes the comprehensive testing suite implemented for the Handwork Marketplace application, covering both backend API and React Native mobile app testing.

## Overview

The testing suite includes:

1. **Unit Tests** - Test individual components and functions
2. **Integration Tests** - Test database operations and external service integrations
3. **End-to-End Tests** - Test complete user workflows
4. **Performance Tests** - Test API response times and mobile app performance
5. **Security Tests** - Test authentication, authorization, and data protection
6. **Load Tests** - Test system performance under concurrent load

## Backend Testing

### Test Structure

```
backend/tests/
├── conftest.py                    # Test configuration and fixtures
├── test_auth.py                   # Authentication tests
├── test_jobs.py                   # Job management tests
├── test_profiles.py               # User profile tests
├── test_bookings.py               # Booking system tests
├── test_payments.py               # Payment processing tests
├── test_messaging.py              # Messaging system tests
├── test_reviews.py                # Review and rating tests
├── test_admin_endpoints.py        # Admin functionality tests
├── test_integration.py            # Integration tests
├── test_performance.py            # Performance tests
├── test_security.py               # Security tests
├── test_payment_processing.py     # Payment security tests
└── test_load_testing.py           # Load testing
```

### Running Backend Tests

#### Prerequisites

```bash
cd backend
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx psutil
```

#### Run All Tests

```bash
python run_comprehensive_tests.py
```

#### Run Specific Test Categories

```bash
# Unit tests only
python run_comprehensive_tests.py --unit

# Integration tests only
python run_comprehensive_tests.py --integration

# Performance tests only
python run_comprehensive_tests.py --performance

# Security tests only
python run_comprehensive_tests.py --security

# Load tests only
python run_comprehensive_tests.py --load

# With coverage report
python run_comprehensive_tests.py --coverage

# With HTML coverage report
python run_comprehensive_tests.py --html-report
```

#### Individual Test Files

```bash
# Run specific test file
pytest tests/test_auth.py -v

# Run with coverage
pytest tests/test_auth.py --cov=app --cov-report=html

# Run specific test class
pytest tests/test_auth.py::TestUserRegistration -v

# Run specific test method
pytest tests/test_auth.py::TestUserRegistration::test_register_user_success -v
```

### Backend Test Categories

#### 1. Unit Tests

- **Authentication Tests** (`test_auth.py`)
  - User registration and validation
  - Login and token generation
  - Password reset functionality
  - Email and phone verification
  - OAuth integration

- **Job Management Tests** (`test_jobs.py`)
  - Job creation and validation
  - Job listing and filtering
  - Job applications and hiring
  - Job status updates

- **Profile Tests** (`test_profiles.py`)
  - Worker and client profile management
  - KYC verification process
  - Profile image uploads
  - Skill and category management

#### 2. Integration Tests (`test_integration.py`)

- Database relationship integrity
- External service integrations (Stripe, email, SMS)
- End-to-end workflow testing
- Transaction rollback testing

#### 3. Performance Tests (`test_performance.py`)

- API response time testing
- Concurrent request handling
- Database query performance
- Memory usage monitoring
- Pagination performance

#### 4. Security Tests (`test_security.py`)

- JWT token validation and expiration
- Password hashing security
- SQL injection protection
- XSS protection
- Role-based access control
- Input validation
- Rate limiting

#### 5. Payment Processing Tests (`test_payment_processing.py`)

- Stripe integration testing
- PayPal integration testing
- Escrow system testing
- Payment security validation
- Payment reporting and analytics

#### 6. Load Tests (`test_load_testing.py`)

- Concurrent user registration
- Concurrent login requests
- Mixed workload simulation
- Database connection pool testing
- Memory usage under load

## Mobile App Testing

### Test Structure

```
mobile/src/__tests__/
├── __mocks__/
│   └── apiService.ts              # Mock API service
├── components/                    # Component unit tests
├── hooks/                         # Custom hook tests
├── services/                      # Service layer tests
├── e2e/
│   └── UserFlows.test.tsx         # End-to-end user flow tests
├── performance/
│   └── AppPerformance.test.tsx    # Performance tests
└── integration/                   # Integration tests
```

### Running Mobile Tests

#### Prerequisites

```bash
cd mobile
npm install
```

#### Run All Tests

```bash
npm run test:comprehensive
```

#### Run Specific Test Categories

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Performance tests only
npm run test:performance

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

#### Individual Test Commands

```bash
# Run specific test file
npx jest src/__tests__/components/JobCard.test.tsx

# Run tests matching pattern
npx jest --testNamePattern="login"

# Update snapshots
npx jest --updateSnapshot
```

### Mobile Test Categories

#### 1. Unit Tests

- **Component Tests**
  - UI component rendering
  - User interaction handling
  - Props validation
  - State management

- **Hook Tests**
  - Custom hook functionality
  - State updates
  - Side effects

- **Service Tests**
  - API service methods
  - Error handling
  - Data transformation

#### 2. End-to-End Tests (`UserFlows.test.tsx`)

- Complete user registration flow
- Job posting and application workflow
- Messaging between users
- Payment processing flow
- Review and rating submission
- Profile management
- Search and filtering

#### 3. Performance Tests (`AppPerformance.test.tsx`)

- App launch performance
- Navigation performance
- List rendering with large datasets
- Image loading performance
- API response handling
- Memory usage monitoring
- Animation performance
- Search performance with debouncing

#### 4. Integration Tests

- API integration testing
- State management integration
- Navigation integration
- External service integration

## Test Configuration

### Backend Configuration

#### pytest.ini
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
asyncio_mode = auto
```

#### Coverage Configuration
```toml
[tool.coverage.run]
source = ["app"]
omit = [
    "*/tests/*",
    "*/venv/*",
    "*/migrations/*"
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError"
]
```

### Mobile Configuration

#### jest.config.js
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**/*',
    '!src/**/__mocks__/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Comprehensive Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx psutil
      - name: Run comprehensive tests
        run: |
          cd backend
          python run_comprehensive_tests.py --coverage

  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: 16
      - name: Install dependencies
        run: |
          cd mobile
          npm install
      - name: Run comprehensive tests
        run: |
          cd mobile
          npm run test:comprehensive
```

## Test Data Management

### Backend Test Data

- Uses SQLite in-memory database for tests
- Fixtures in `conftest.py` provide reusable test data
- Each test gets a fresh database instance
- Mock external services (Stripe, email, SMS)

### Mobile Test Data

- Mock API service provides consistent test data
- AsyncStorage mocked for state persistence tests
- External dependencies mocked (location, notifications)
- Test data reset between tests

## Performance Benchmarks

### Backend Performance Targets

- API endpoints: < 1 second response time
- Database queries: < 500ms
- Concurrent requests: Handle 50+ simultaneous requests
- Memory usage: < 100MB increase under load

### Mobile Performance Targets

- App launch: < 3 seconds
- Navigation: < 500ms between screens
- List rendering: < 1 second for 100+ items
- Image loading: < 2 seconds for profile images
- Search: < 500ms response time

## Security Testing

### Backend Security Tests

- Authentication bypass attempts
- SQL injection prevention
- XSS protection validation
- Authorization boundary testing
- Input validation testing
- Rate limiting verification

### Mobile Security Tests

- Secure storage validation
- API communication security
- Input sanitization
- Deep link security
- Biometric authentication (if implemented)

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Ensure test database is properly configured
   - Check connection pool settings

2. **Mock Service Issues**
   - Verify mock responses match expected format
   - Check mock service reset between tests

3. **Async Test Issues**
   - Use proper async/await patterns
   - Ensure proper test cleanup

4. **Performance Test Variability**
   - Run tests multiple times for consistency
   - Consider system load when interpreting results

### Debug Commands

```bash
# Backend debugging
pytest tests/test_auth.py::test_login_success -v -s --pdb

# Mobile debugging
npx jest --detectOpenHandles --forceExit
```

## Contributing

When adding new features:

1. Write tests before implementation (TDD)
2. Ensure all test categories are covered
3. Update test documentation
4. Maintain performance benchmarks
5. Add security considerations

## Reporting

Test results are automatically generated with:
- Coverage reports (HTML and terminal)
- Performance metrics
- Security scan results
- Load test summaries

Reports are saved in:
- Backend: `htmlcov/` directory
- Mobile: `coverage/` directory