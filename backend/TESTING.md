# TravelSphere Dashboard Testing Guide

This document covers the testing strategy and implementation for the TravelSphere Admin Dashboard and its microservices.

## Overview

The testing suite includes:
- Unit tests for individual components and functions
- Integration tests for API endpoints
- Component tests for React UI elements
- End-to-end tests for critical user flows

## Test Structure

```
backend/
├── microservices/
│   ├── auth-service/
│   │   └── src/__tests__/
│   │       ├── services/       # Unit tests for services
│   │       ├── middleware/     # Middleware tests
│   │       └── integration/    # API integration tests
│   ├── analytics-service/
│   │   └── src/__tests__/
│   └── search-console-service/
│       └── src/__tests__/
└── admin-dashboard/
    └── src/__tests__/
        ├── components/         # Component tests
        ├── contexts/          # Context tests
        └── pages/             # Page component tests
```

## Running Tests

### All Tests
```bash
./run-tests.sh
```

### Individual Service Tests

#### Auth Service
```bash
cd microservices/auth-service
npm test
```

#### React Dashboard
```bash
cd admin-dashboard
npm test
```

### Coverage Reports
```bash
# Generate coverage for auth service
cd microservices/auth-service
npm test -- --coverage

# Generate coverage for React dashboard
cd admin-dashboard
npm run test:coverage
```

## Test Categories

### 1. Unit Tests

#### Service Layer Tests
- TokenService: JWT generation and verification
- UserService: User CRUD operations
- RedisService: Cache operations

Example:
```typescript
describe('TokenService', () => {
  it('should generate valid JWT tokens', () => {
    const tokens = tokenService.generateTokens(mockUser);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });
});
```

#### Component Tests
- ProtectedRoute: Authentication guards
- AuthContext: Authentication state management
- UI Components: User interaction and rendering

### 2. Integration Tests

#### API Endpoint Tests
- Authentication flow
- Token refresh mechanism
- User management endpoints
- Role-based access control

Example:
```typescript
describe('POST /auth/refresh', () => {
  it('should refresh valid token', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: validToken });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });
});
```

### 3. Component Tests

#### React Component Tests
- Authentication flow
- Protected routes
- User management UI
- Dashboard widgets

Example:
```typescript
describe('ProtectedRoute', () => {
  it('should redirect to login when not authenticated', () => {
    render(
      <ProtectedRoute>
        <ProtectedContent />
      </ProtectedRoute>
    );
    
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
```

## Test Configuration

### Jest Configuration

#### Backend Services (jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

#### React Dashboard (jest.config.js)
```javascript
module.exports = {
  preset: 'react-scripts',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
```

## Mocking Strategies

### External Services
- Google OAuth: Mock passport strategies
- Redis: Mock RedisService methods
- HTTP requests: Mock axios

### React Testing
- useAuth hook: Mock authentication state
- API calls: Mock axios responses
- Router: Use MemoryRouter for navigation tests

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Don't make real API calls
3. **Test User Behavior**: Focus on what users do, not implementation
4. **Coverage Goals**: Aim for >80% coverage
5. **Descriptive Test Names**: Use clear, descriptive test names

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: ./run-tests.sh
      - uses: codecov/codecov-action@v3
```

## Debugging Tests

### Run Single Test File
```bash
npm test -- TokenService.test.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

## Common Issues

### 1. Redis Connection Errors
Make sure to mock RedisService in tests:
```typescript
jest.mock('../../services/RedisService');
```

### 2. Async Test Timeouts
Increase timeout for integration tests:
```typescript
jest.setTimeout(10000); // 10 seconds
```

### 3. React Testing Library Queries
Use appropriate queries:
- `getBy...` - Throws error if not found
- `queryBy...` - Returns null if not found
- `findBy...` - Returns promise for async elements

## Future Improvements

1. **E2E Tests**: Add Cypress or Playwright tests
2. **Performance Tests**: Add load testing with K6
3. **Visual Regression**: Add visual testing with Percy
4. **Mutation Testing**: Add Stryker for mutation testing
5. **Contract Testing**: Add Pact for API contract tests