# Testing Guide

This guide covers the testing strategy and implementation for the OpenTable Clone frontend.

## Testing Stack

- **Unit & Integration Tests**: Jest + React Testing Library
- **End-to-End Tests**: Playwright
- **Component Development**: Storybook
- **Code Coverage**: Jest Coverage Reports

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test src/components/__tests__/Header.test.tsx
```

### End-to-End Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui

# Run e2e tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific e2e test
npm run test:e2e reservation-flow.spec.ts
```

### Component Development

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build-storybook
```

## Test Structure

```
frontend/
├── src/
│   ├── components/__tests__/    # Component tests
│   ├── hooks/__tests__/          # Hook tests
│   ├── lib/__tests__/            # Library/service tests
│   ├── utils/__tests__/          # Utility tests
│   └── app/__tests__/            # Page tests
├── e2e/                          # End-to-end tests
├── jest.config.js                # Jest configuration
├── jest.setup.js                 # Jest setup file
└── playwright.config.ts          # Playwright configuration
```

## Writing Tests

### Unit Tests

Example component test:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Tests

Example hook test:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());
    
    expect(result.current.count).toBe(0);
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

### Integration Tests

Example API integration test:

```typescript
import { unifiedApiClient } from '../api/unified-client';

// Mock fetch
global.fetch = jest.fn();

describe('API Integration', () => {
  it('should fetch restaurants', async () => {
    const mockData = { restaurants: [] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await unifiedApiClient.get('/restaurants');
    expect(result).toEqual(mockData);
  });
});
```

### E2E Tests

Example Playwright test:

```typescript
import { test, expect } from '@playwright/test';

test('user can search for restaurants', async ({ page }) => {
  await page.goto('/');
  
  // Search for Italian restaurants
  await page.fill('[placeholder="Location, Restaurant, or Cuisine"]', 'Italian');
  await page.click('button:has-text("Search")');
  
  // Verify results
  await expect(page).toHaveURL(/\/search/);
  await expect(page.locator('[data-testid="restaurant-card"]')).toHaveCount(10);
});
```

## Test Coverage

Current coverage thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

View coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Best Practices

### 1. Test Organization
- Keep tests close to the code they test
- Use descriptive test names
- Group related tests with `describe` blocks

### 2. Test Data
- Use factories or fixtures for test data
- Avoid hardcoded values
- Mock external dependencies

### 3. Async Testing
- Always use `await` with async operations
- Use `waitFor` for elements that appear asynchronously
- Set appropriate timeouts

### 4. Mocking
- Mock at the appropriate level
- Don't over-mock
- Verify mock calls when relevant

### 5. E2E Best Practices
- Use data-testid for reliable element selection
- Avoid CSS selectors that might change
- Test user flows, not implementation details
- Run against a test database

## Common Testing Patterns

### Testing Authentication

```typescript
// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { email: 'test@example.com' } },
    status: 'authenticated',
  })),
}));
```

### Testing Navigation

```typescript
// Mock Next.js router
const mockRouter = { push: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));
```

### Testing API Calls

```typescript
// Mock API client
jest.mock('@/lib/api/unified-client', () => ({
  unifiedApiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));
```

## Debugging Tests

### Jest Debugging

```bash
# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test file
npm test -- --testPathPattern=Header.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"
```

### Playwright Debugging

```bash
# Debug mode
PWDEBUG=1 npm run test:e2e

# Headed mode with slowMo
npm run test:e2e:headed -- --slowmo=1000

# Generate trace
npm run test:e2e -- --trace on
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Check jest.config.js moduleNameMapper
   - Verify import paths

2. **React hooks errors**
   - Ensure proper mocking of hooks
   - Use renderHook for testing hooks

3. **Async test failures**
   - Add proper awaits
   - Increase timeouts if needed
   - Use waitFor for dynamic content

4. **Playwright timeouts**
   - Increase timeout in config
   - Check if dev server is running
   - Verify selectors exist

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)