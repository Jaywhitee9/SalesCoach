# Testing Guide - Sales Coach

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Mocking Strategies](#mocking-strategies)
6. [Coverage Requirements](#coverage-requirements)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This project uses **Vitest** as the primary testing framework for both backend and frontend tests. Vitest is a blazing-fast unit test framework powered by Vite, offering excellent TypeScript support and compatibility with Jest APIs.

### Test Categories

- **Backend Tests**: API endpoints, business logic, security, and database operations
- **Frontend Tests**: React components, hooks, and UI logic
- **Integration Tests**: End-to-end workflows spanning multiple systems

### Tools & Libraries

**Backend:**
- `vitest` - Test runner
- `@vitest/ui` - Interactive test UI
- `supertest` - HTTP assertion library
- `c8` - Code coverage

**Frontend:**
- `vitest` - Test runner
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - Custom DOM matchers
- `@testing-library/user-event` - User interaction simulation
- `happy-dom` - Lightweight DOM implementation

---

## Test Structure

```
Sales Coach/
├── tests/                          # Backend tests
│   ├── backend/
│   │   ├── security.test.js       # Security tests (CORS, rate limiting, validation)
│   │   ├── api.test.js            # API endpoint tests
│   │   └── database.test.js       # Database RLS & multi-tenant tests
│   ├── integration/
│   │   └── lead-flow.test.js      # Integration tests
│   └── helpers/
│       └── test-utils.js          # Shared test utilities
│
├── client/tests/                   # Frontend tests
│   ├── components/
│   │   ├── Dashboard.test.tsx
│   │   ├── TargetsDashboard.test.tsx
│   │   └── LeadDrawer.test.tsx
│   └── setup.ts                   # Test setup & global mocks
│
├── vitest.config.js               # Backend test config
└── client/vitest.config.ts        # Frontend test config
```

---

## Running Tests

### Backend Tests

```bash
# Run all backend tests
npm run test:backend

# Watch mode (re-runs on file changes)
npm run test:backend:watch

# Interactive UI mode
npm run test:backend:ui

# Generate coverage report
npm run test:backend:coverage
```

### Frontend Tests

```bash
# Run all frontend tests
npm run test:frontend

# Watch mode
npm run test:frontend:watch

# Interactive UI mode
npm run test:frontend:ui

# Generate coverage report
npm run test:frontend:coverage
```

### Integration Tests

```bash
# Run integration tests only
npm run test:integration
```

### All Tests

```bash
# Run all tests (backend + frontend + integration)
npm run test:all

# Run tests with type checking (CI mode)
npm run test:ci
```

---

## Writing Tests

### Backend Test Example

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, createMockReply } from '../helpers/test-utils.js';

describe('API Tests', () => {
  describe('POST /api/leads - Create Lead', () => {
    it('should create a new lead with valid data', async () => {
      const leadData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@acme.com',
      };

      // Your test logic here
      expect(leadData.name).toBe('John Doe');
    });

    it('should reject lead without required fields', () => {
      const invalidData = { company: 'Acme' };
      const requiredFields = ['name', 'phone'];
      const missing = requiredFields.filter(f => !invalidData[f]);

      expect(missing).toContain('name');
      expect(missing).toContain('phone');
    });
  });
});
```

### Frontend Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from '../../components/Dashboard/Dashboard';

describe('Dashboard', () => {
  it('should render dashboard component', () => {
    render(<Dashboard
      onStartCall={vi.fn()}
      isDarkMode={false}
      orgId="org-123"
    />);

    expect(document.body).toBeTruthy();
  });

  it('should calculate stats correctly', () => {
    const leads = [
      { status: 'new' },
      { status: 'contacted' },
      { status: 'won' },
    ];

    const newLeads = leads.filter(l => l.status === 'new').length;
    expect(newLeads).toBe(1);
  });
});
```

### Test Naming Conventions

- Use descriptive test names: `should [expected behavior] when [condition]`
- Group related tests using `describe` blocks
- Keep tests focused on a single behavior

**Good Examples:**
```javascript
it('should return 401 when authorization header is missing', () => {})
it('should filter leads by organization', () => {})
it('should calculate productivity score correctly', () => {})
```

**Bad Examples:**
```javascript
it('works', () => {})
it('test1', () => {})
it('should do everything', () => {})
```

---

## Mocking Strategies

### Mocking Supabase Client

**Backend (test-utils.js):**
```javascript
export function createMockSupabase() {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
    },
  };
}
```

**Frontend (setup.ts):**
```typescript
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      // ... other methods
    })),
  })),
}));
```

### Mocking React Router

```typescript
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
  };
});
```

### Mocking Fetch API

```javascript
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: [] }),
    ok: true,
    status: 200,
  })
);
```

---

## Coverage Requirements

### Backend Coverage Targets

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

### Frontend Coverage Targets

- **Lines**: 60%
- **Functions**: 60%
- **Branches**: 60%
- **Statements**: 60%

### Viewing Coverage Reports

After running coverage commands, reports are generated in:
- Backend: `./coverage/`
- Frontend: `./client/coverage/`

Open `coverage/index.html` in your browser for an interactive HTML report.

### Coverage Exclusions

Files excluded from coverage:
- Configuration files (`*.config.js`, `*.config.ts`)
- Test files (`*.test.js`, `*.spec.ts`)
- Node modules
- Build artifacts (`dist/`, `coverage/`)
- Scripts and utilities

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- **Push** to `main`, `master`, or `develop` branches
- **Pull requests** targeting these branches

### Workflow Jobs

1. **Backend Tests** - Run on Node 18.x and 20.x
2. **Frontend Tests** - Run on Node 18.x and 20.x
3. **Integration Tests** - Run after backend and frontend pass
4. **Lint & Format Check** - Code quality checks
5. **Security Audit** - npm audit for vulnerabilities
6. **Build Check** - Ensure project builds successfully

### Status Badges

Add to README.md:
```markdown
![Tests](https://github.com/your-org/sales-coach/workflows/Test%20Suite/badge.svg)
[![codecov](https://codecov.io/gh/your-org/sales-coach/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/sales-coach)
```

---

## Troubleshooting

### Common Issues

#### 1. Import Errors in ESM/CommonJS

**Problem:** `Cannot use import statement outside a module`

**Solution:**
- Backend uses CommonJS (`type: "commonjs"` in package.json)
- Frontend uses ESM (`type: "module"` in client/package.json)
- Use appropriate import syntax for each

#### 2. Supabase Mocks Not Working

**Problem:** Tests fail with "Cannot read property 'from' of undefined"

**Solution:**
- Ensure `setup.ts` is properly configured in `vitest.config.ts`
- Check that mocks are defined before imports

#### 3. React Testing Library Errors

**Problem:** "TestingLibraryElementError: Unable to find element"

**Solution:**
- Use `screen.debug()` to see rendered output
- Check element queries (prefer `getByRole`, `getByLabelText`)
- Ensure components are fully rendered before assertions

#### 4. Timeout Errors

**Problem:** Tests timeout after 5 seconds

**Solution:**
- Increase timeout in vitest.config: `testTimeout: 10000`
- Check for unresolved promises
- Ensure async operations are properly awaited

### Debug Mode

Run tests in debug mode with verbose output:

```bash
# Backend
DEBUG=* npm run test:backend

# Frontend
npm run test:frontend -- --reporter=verbose
```

### Interactive UI Mode

Best for debugging failing tests:

```bash
npm run test:backend:ui
npm run test:frontend:ui
```

---

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Clean up mocks with `vi.clearAllMocks()`

### 2. Test Data

- Use factories (e.g., `createMockLead()`) for consistent test data
- Don't use production data in tests
- Keep test data minimal but realistic

### 3. Async Testing

```javascript
// Good - properly awaited
it('should fetch leads', async () => {
  const leads = await fetchLeads();
  expect(leads).toHaveLength(10);
});

// Bad - missing await
it('should fetch leads', () => {
  const leads = fetchLeads(); // Returns Promise!
  expect(leads).toHaveLength(10); // FAILS
});
```

### 4. Error Testing

```javascript
it('should throw error for invalid data', () => {
  expect(() => createLead(null)).toThrow('Invalid lead data');
});
```

### 5. Snapshot Testing (Use Sparingly)

```javascript
it('should match snapshot', () => {
  const component = render(<Dashboard />);
  expect(component).toMatchSnapshot();
});
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)

---

## Contributing

When adding new features:
1. Write tests FIRST (TDD approach recommended)
2. Ensure tests pass locally before pushing
3. Maintain or improve coverage
4. Update this guide if introducing new patterns

---

**Questions?** Contact the development team or open an issue on GitHub.
