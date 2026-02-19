# Testing Infrastructure Setup Guide

## Installation Instructions

Follow these steps to install all testing dependencies and verify the setup.

---

## Step 1: Install Backend Testing Dependencies

Run this command in the **root directory**:

```bash
npm install --save-dev vitest @vitest/ui supertest c8 happy-dom
```

**What gets installed:**
- `vitest` (v1.x) - Fast unit test framework
- `@vitest/ui` - Interactive test UI
- `supertest` (v6.x) - HTTP assertion library
- `c8` - Code coverage tool
- `happy-dom` - Lightweight DOM for Node.js

---

## Step 2: Install Frontend Testing Dependencies

Run this command in the **client directory**:

```bash
cd client
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom
```

**What gets installed:**
- `@testing-library/react` (v14.x) - React component testing utilities
- `@testing-library/jest-dom` (v6.x) - Custom DOM matchers
- `@testing-library/user-event` (v14.x) - User interaction simulation
- `happy-dom` - DOM implementation for Vitest

---

## Step 3: Verify Installation

### Check Backend Dependencies

```bash
# From root directory
npm list vitest @vitest/ui supertest c8
```

Expected output:
```
sales-coach@1.0.0
├── @vitest/ui@1.x.x
├── c8@9.x.x
├── supertest@6.x.x
└── vitest@1.x.x
```

### Check Frontend Dependencies

```bash
# From client directory
cd client
npm list @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected output:
```
salesflow-ai@0.0.0
├── @testing-library/jest-dom@6.x.x
├── @testing-library/react@14.x.x
└── @testing-library/user-event@14.x.x
```

---

## Step 4: Run Tests to Verify Setup

### Test Backend

```bash
# From root directory
npm run test:backend
```

Expected: All tests pass (or show results if tests exist)

### Test Frontend

```bash
# From client directory (or root)
npm run test:frontend
```

Expected: All tests pass

### Run All Tests

```bash
# From root directory
npm run test:all
```

---

## Step 5: Try Interactive UI (Optional)

### Backend UI

```bash
npm run test:backend:ui
```

This opens an interactive web UI at `http://localhost:51204` where you can:
- See all tests
- Run individual tests
- View test output
- Inspect coverage

### Frontend UI

```bash
npm run test:frontend:ui
```

---

## Troubleshooting

### Issue: "Cannot find module 'vitest'"

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm install --save-dev vitest @vitest/ui supertest c8 happy-dom
```

### Issue: "Module not found: @testing-library/react"

**Solution:**
```bash
# In client directory
cd client
rm -rf node_modules package-lock.json
npm install
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom
```

### Issue: ESM/CommonJS Conflicts

**Solution:**
- Backend uses CommonJS (check `"type": "commonjs"` in root package.json)
- Frontend uses ESM (check `"type": "module"` in client/package.json)
- Don't mix import/require - use appropriate syntax for each

### Issue: Tests Hang or Timeout

**Solution:**
```bash
# Increase timeout in vitest.config.js
testTimeout: 15000  # 15 seconds instead of 10
```

---

## Quick Reference

### Package Versions (Recommended)

**Root package.json devDependencies:**
```json
{
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitest/ui": "^1.0.0",
    "c8": "^9.0.0",
    "happy-dom": "^12.0.0",
    "supertest": "^6.3.0",
    "typescript": "~5.8.2",
    "vitest": "^1.0.0"
  }
}
```

**client/package.json devDependencies:**
```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "happy-dom": "^12.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Post-Installation Checklist

- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] `npm run test:backend` works
- [ ] `npm run test:frontend` works
- [ ] `npm run test:all` works
- [ ] Coverage reports generated
- [ ] CI/CD workflow file exists (`.github/workflows/test.yml`)
- [ ] Documentation reviewed (`docs/testing_guide.md`)

---

## Next Steps

1. **Run tests in watch mode** while developing:
   ```bash
   npm run test:backend:watch
   npm run test:frontend:watch
   ```

2. **Generate coverage reports** before commits:
   ```bash
   npm run test:backend:coverage
   npm run test:frontend:coverage
   ```

3. **Use interactive UI** for debugging:
   ```bash
   npm run test:backend:ui
   npm run test:frontend:ui
   ```

4. **Review failing tests** in CI/CD:
   - Check GitHub Actions tab
   - Review coverage reports
   - Fix failing tests before merging

---

## Complete Installation Script

For a fresh setup, run all commands at once:

```bash
# Root directory
npm install --save-dev vitest @vitest/ui supertest c8 happy-dom

# Client directory
cd client
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom
cd ..

# Verify
npm run test:all
```

---

**Setup Complete!**

Your testing infrastructure is ready. See `docs/testing_guide.md` for detailed usage instructions.
