# Frontend Architecture Migration Guide

## Overview

This guide helps the development team migrate from the old flat component structure to the new domain-driven architecture.

## What Changed?

### Before (Old Structure)
```
client/
├── components/
│   ├── Common/
│   ├── Leads/
│   ├── Dashboard/
│   ├── Call/
│   └── ... (all mixed together)
└── App.tsx
```

### After (New Structure)
```
client/
├── src/
│   └── components/
│       ├── leads/
│       ├── calls/
│       ├── dashboard/
│       ├── ui/
│       └── ... (organized by domain)
├── components/ (legacy - still exists)
└── App.tsx
```

## Why This Change?

1. **Better Organization**: Components grouped by business domain
2. **Easier Navigation**: Find components faster
3. **Scalability**: Easier to add new features
4. **Performance**: Optimized with React.memo, useCallback, useMemo
5. **Maintainability**: Smaller, focused components
6. **Type Safety**: Better TypeScript integration with path aliases

## Migration Status

### Completed ✅

- [x] New directory structure created
- [x] All components copied to new locations
- [x] Barrel exports (index.ts) created for all domains
- [x] Path aliases configured in tsconfig.json
- [x] App.tsx updated with new imports
- [x] ErrorBoundary component created
- [x] Large components split into smaller pieces:
  - Dashboard.tsx → 6 focused components
  - KPICards, ScheduleTable, WeeklyPerformanceChart, CoachingPanel, TasksPanel
- [x] Performance optimizations added (React.memo, useCallback, useMemo)
- [x] Documentation created

### Pending ⏳

- [ ] Update all existing component imports across the codebase
- [ ] Update test files with new import paths
- [ ] Run full test suite and fix any issues
- [ ] Remove old `client/components/` directory (after verification)
- [ ] Update CI/CD pipelines if needed

## Step-by-Step Migration

### For Developers

#### 1. Update Your Working Branch

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies (if needed)
npm install
```

#### 2. Update Imports in Your Components

**Old Way:**
```typescript
import { Button } from '../components/Common/Button';
import { LeadsDashboard } from './components/Leads/LeadsDashboard';
import { Dashboard } from '../../components/Dashboard/Dashboard';
```

**New Way:**
```typescript
import { Button } from '@ui';
import { LeadsDashboard } from '@leads';
import { Dashboard } from '@dashboard';
```

#### 3. Common Import Patterns

| Old Import | New Import |
|------------|------------|
| `'../components/Common/Button'` | `'@ui'` |
| `'./components/Leads/LeadsDashboard'` | `'@leads'` |
| `'../../components/Dashboard/Dashboard'` | `'@dashboard'` |
| `'../components/Layout/Sidebar'` | `'@layout'` |
| `'./components/Call/EmptyCallState'` | `'@calls'` |

#### 4. Using Barrel Exports

Instead of importing each component individually:

**Old:**
```typescript
import { LeadsDashboard } from '@leads/LeadsDashboard';
import { LeadDrawer } from '@leads/LeadDrawer';
import { NewLeadDrawer } from '@leads/NewLeadDrawer';
```

**New (Better):**
```typescript
import { LeadsDashboard, LeadDrawer, NewLeadDrawer } from '@leads';
```

### For Component Creators

When creating a new component:

1. **Choose the right domain folder**:
   - Lead-related? → `src/components/leads/`
   - UI component? → `src/components/ui/`
   - Dashboard widget? → `src/components/dashboard/`

2. **Create your component file**:
   ```typescript
   // src/components/leads/MyNewComponent.tsx
   import React from 'react';
   import { Button } from '@ui';

   interface MyNewComponentProps {
     data: string;
   }

   export const MyNewComponent: React.FC<MyNewComponentProps> = ({ data }) => {
     return <div>{data}</div>;
   };
   ```

3. **Add to barrel export**:
   ```typescript
   // src/components/leads/index.ts
   export { LeadsDashboard } from './LeadsDashboard';
   export { LeadDrawer } from './LeadDrawer';
   export { MyNewComponent } from './MyNewComponent'; // Add this line
   ```

4. **Use it elsewhere**:
   ```typescript
   import { MyNewComponent } from '@leads';
   ```

## Path Alias Reference

| Alias | Maps To | Example |
|-------|---------|---------|
| `@components/*` | `./src/components/*` | `@components/leads/LeadsDashboard` |
| `@ui/*` | `./src/components/ui/*` | `@ui/Button` |
| `@leads/*` | `./src/components/leads/*` | `@leads/LeadsDashboard` |
| `@calls/*` | `./src/components/calls/*` | `@calls/ActiveCallPanel` |
| `@dashboard/*` | `./src/components/dashboard/*` | `@dashboard/KPICards` |
| `@targets/*` | `./src/components/targets/*` | `@targets/TargetsDashboard` |
| `@pipeline/*` | `./src/components/pipeline/*` | `@pipeline/PipelineDashboard` |
| `@tasks/*` | `./src/components/tasks/*` | `@tasks/TasksDashboard` |
| `@settings/*` | `./src/components/settings/*` | `@settings/SettingsDashboard` |
| `@layout/*` | `./src/components/layout/*` | `@layout/Sidebar` |
| `@auth/*` | `./src/components/auth/*` | `@auth/Login` |
| `@hooks/*` | `./src/hooks/*` | `@hooks/useLeads` |
| `@types` | `../types` | Shared types package |

## Performance Best Practices

### Use React.memo for Expensive Components

**Before:**
```typescript
export const ExpensiveList = ({ items }) => {
  return (
    <div>
      {items.map(item => <ExpensiveItem key={item.id} item={item} />)}
    </div>
  );
};
```

**After:**
```typescript
export const ExpensiveList = React.memo<ExpensiveListProps>(({ items }) => {
  return (
    <div>
      {items.map(item => <ExpensiveItem key={item.id} item={item} />)}
    </div>
  );
});

ExpensiveList.displayName = 'ExpensiveList';
```

### Use useCallback for Event Handlers

**Before:**
```typescript
const MyComponent = ({ onAction }) => {
  const handleClick = (id) => {
    onAction(id);
  };

  return <ChildComponent onClick={handleClick} />;
};
```

**After:**
```typescript
const MyComponent = ({ onAction }) => {
  const handleClick = useCallback((id) => {
    onAction(id);
  }, [onAction]);

  return <ChildComponent onClick={handleClick} />;
};
```

### Use useMemo for Expensive Calculations

**Before:**
```typescript
const MyComponent = ({ data }) => {
  const sortedData = data.sort((a, b) => /* complex sort */);

  return <DataTable data={sortedData} />;
};
```

**After:**
```typescript
const MyComponent = ({ data }) => {
  const sortedData = useMemo(() => {
    return data.sort((a, b) => /* complex sort */);
  }, [data]);

  return <DataTable data={sortedData} />;
};
```

## ErrorBoundary Usage

Wrap critical sections with ErrorBoundary:

```typescript
import { ErrorBoundary } from '@ui';

function FeaturePage() {
  return (
    <ErrorBoundary>
      <CriticalFeature />
    </ErrorBoundary>
  );
}
```

For custom error handling:

```typescript
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Log to monitoring service
    console.error('Feature crashed:', error, errorInfo);
  }}
>
  <CriticalFeature />
</ErrorBoundary>
```

## Testing After Migration

### 1. Update Test Imports

**Before:**
```typescript
import { Dashboard } from '../components/Dashboard/Dashboard';
```

**After:**
```typescript
import { Dashboard } from '@dashboard';
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test Dashboard.test.tsx

# Run tests in watch mode
npm test -- --watch
```

### 3. Fix Failing Tests

Common issues:
- Import paths changed → Update to new aliases
- Component location changed → Update imports
- Props changed (rare) → Update test to match new props

## Common Issues & Solutions

### Issue 1: "Cannot find module '@components/leads'"

**Cause**: TypeScript not recognizing path aliases

**Solution**:
1. Restart TypeScript server in your IDE
2. Check `tsconfig.json` has correct paths
3. Rebuild: `npm run build`

### Issue 2: "Module not found: Error: Can't resolve"

**Cause**: Webpack not resolving aliases

**Solution**:
1. Clear cache: `rm -rf node_modules/.cache`
2. Reinstall: `npm install`
3. Rebuild: `npm run build`

### Issue 3: "Component not exported from module"

**Cause**: Missing barrel export

**Solution**:
Add export to `index.ts` in the domain folder:
```typescript
// src/components/leads/index.ts
export { MissingComponent } from './MissingComponent';
```

### Issue 4: Tests failing after migration

**Cause**: Old import paths in test files

**Solution**:
Update test imports to use new aliases:
```typescript
// Old
import { Component } from '../components/Domain/Component';

// New
import { Component } from '@domain';
```

## Rollback Plan

If critical issues arise:

1. **Revert App.tsx changes**:
   ```bash
   git checkout HEAD -- client/App.tsx
   ```

2. **Use old imports temporarily**:
   ```typescript
   // Fallback to old structure
   import { Button } from './components/Common/Button';
   ```

3. **File an issue** with details for the team to fix

## Checklist for Pull Requests

Before submitting a PR:

- [ ] All imports use new path aliases
- [ ] No relative imports (`../../components/...`)
- [ ] Barrel exports updated if you added components
- [ ] Tests pass locally
- [ ] No build errors
- [ ] Components under 500 lines
- [ ] Performance optimizations added (if needed)
- [ ] ErrorBoundary added for critical sections

## Timeline

| Phase | Status | Date |
|-------|--------|------|
| Structure Setup | ✅ Complete | 2026-02-16 |
| Component Migration | ✅ Complete | 2026-02-16 |
| App.tsx Update | ✅ Complete | 2026-02-16 |
| Documentation | ✅ Complete | 2026-02-16 |
| Team Migration | 🔄 In Progress | TBD |
| Legacy Cleanup | ⏳ Pending | TBD |

## Resources

- **Architecture Guide**: `docs/frontend_architecture.md`
- **Component Guide**: `client/COMPONENT_GUIDE.md`
- **This Guide**: `docs/MIGRATION_GUIDE.md`

## Questions?

1. Check the documentation above
2. Review existing migrated components
3. Ask in the development channel
4. File an issue for bugs

## Success Metrics

We'll know the migration is successful when:

- ✅ All components use new import structure
- ✅ All tests pass
- ✅ Build time improves
- ✅ Development velocity increases
- ✅ New developers onboard faster

---

**Migration Owner**: Agent 5 - Frontend Architecture Specialist
**Last Updated**: 2026-02-16
**Version**: 1.0
