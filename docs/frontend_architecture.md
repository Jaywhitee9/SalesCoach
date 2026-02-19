# Frontend Architecture Guide

## Overview

This document describes the reorganized frontend architecture for the Sales Coach system. The new structure follows a domain-driven design approach for better maintainability and scalability.

## Directory Structure

```
client/
├── src/
│   ├── components/          # All React components (NEW)
│   │   ├── leads/          # Lead management
│   │   ├── calls/          # Call handling
│   │   ├── targets/        # Sales targets
│   │   ├── pipeline/       # Pipeline & funnel
│   │   ├── dashboard/      # Main dashboard
│   │   ├── settings/       # Settings pages
│   │   ├── tasks/          # Task management
│   │   ├── admin/          # Admin features
│   │   ├── panel/          # Panel views
│   │   ├── chat/           # Team chat
│   │   ├── gamification/   # Gamification
│   │   ├── auth/           # Authentication
│   │   ├── superadmin/     # Super admin
│   │   ├── notifications/  # Notifications
│   │   ├── search/         # Global search
│   │   ├── layout/         # Layout components
│   │   └── ui/             # Shared UI components
│   ├── hooks/              # Custom React hooks
│   ├── context/            # React contexts
│   └── lib/                # Utility libraries
├── components/             # Legacy structure (TO BE DEPRECATED)
├── App.tsx                 # Main app component
├── types.ts                # Frontend-specific types
└── tsconfig.json           # TypeScript configuration

types/                      # Shared types package (Agent 4)
└── index.ts
```

## Component Organization Principles

### 1. Domain-Driven Design

Components are organized by **business domain** rather than technical type:

- **Good**: `components/leads/LeadsDashboard.tsx`
- **Bad**: `components/dashboards/Leads.tsx`

### 2. Barrel Exports

Each domain folder has an `index.ts` file that exports all public components:

```typescript
// components/leads/index.ts
export { LeadsDashboard } from './LeadsDashboard';
export { LeadDrawer } from './LeadDrawer';
export { NewLeadDrawer } from './NewLeadDrawer';
// ... etc
```

This allows clean imports:

```typescript
// Good
import { LeadsDashboard, LeadDrawer } from '@components/leads';

// Bad (but still works)
import { LeadsDashboard } from '../components/leads/LeadsDashboard';
```

### 3. Component Size Guidelines

- **Maximum 500 lines** per component file
- If larger, split into sub-components
- Extract complex logic into custom hooks
- Separate presentational and container components

### 4. Component Structure

Standard component file structure:

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { Button } from '@ui';

// 2. Types/Interfaces
interface ComponentProps {
  // ...
}

// 3. Sub-components (if small)
const SubComponent = () => { /* ... */ };

// 4. Main Component
export const Component: React.FC<ComponentProps> = (props) => {
  // Hooks
  const [state, setState] = useState();

  // Effects
  useEffect(() => { /* ... */ }, []);

  // Handlers
  const handleClick = () => { /* ... */ };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

## Path Aliases

The following path aliases are configured in `tsconfig.json`:

```typescript
{
  "@components/*": ["./src/components/*"],
  "@ui/*": ["./src/components/ui/*"],
  "@leads/*": ["./src/components/leads/*"],
  "@calls/*": ["./src/components/calls/*"],
  "@dashboard/*": ["./src/components/dashboard/*"],
  "@targets/*": ["./src/components/targets/*"],
  "@pipeline/*": ["./src/components/pipeline/*"],
  "@tasks/*": ["./src/components/tasks/*"],
  "@settings/*": ["./src/components/settings/*"],
  "@layout/*": ["./src/components/layout/*"],
  "@auth/*": ["./src/components/auth/*"],
  "@hooks/*": ["./src/hooks/*"],
  "@types": ["../types"]
}
```

### Usage Examples

```typescript
// UI components
import { Button, Badge, Modal } from '@ui';

// Domain components
import { LeadsDashboard } from '@leads';
import { Dashboard } from '@dashboard';

// Custom hooks
import { useLeads } from '@hooks/useLeads';

// Shared types
import { User, Lead } from '@types';
```

## Performance Optimizations

### 1. React.memo()

Use for components that re-render frequently with the same props:

```typescript
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  return <div>{/* render logic */}</div>;
});

ExpensiveComponent.displayName = 'ExpensiveComponent';
```

### 2. useMemo()

Use for expensive calculations:

```typescript
const sortedData = useMemo(() => {
  return data.sort((a, b) => /* complex sort */);
}, [data]);
```

### 3. useCallback()

Use for callback functions passed to child components:

```typescript
const handleClick = useCallback((id: string) => {
  // handle click
}, [/* dependencies */]);
```

### 4. Lazy Loading

Use for heavy components that aren't immediately needed:

```typescript
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <HeavyChart />
    </React.Suspense>
  );
}
```

### Components with Performance Optimizations

The following components have been optimized:

- **KPICards**: Memoized individual cards
- **ScheduleTable**: Memoized with useCallback for handlers
- **WeeklyPerformanceChart**: Memoized chart component
- **CoachingPanel**: Memoized coaching displays
- **TasksPanel**: Memoized with useCallback for toggles

## Error Boundaries

### ErrorBoundary Component

Located at `src/components/ui/ErrorBoundary.tsx`, this component catches and handles React errors gracefully.

### Usage

```typescript
import { ErrorBoundary } from '@ui';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Custom Fallback

```typescript
<ErrorBoundary
  fallback={<div>Custom error message</div>}
  onError={(error, errorInfo) => {
    // Log to error tracking service
    console.error(error, errorInfo);
  }}
>
  <FeatureComponent />
</ErrorBoundary>
```

## Component Splitting Strategy

### When to Split

Split components when:
1. File exceeds 500 lines
2. Component has multiple distinct responsibilities
3. Part of component is reusable elsewhere
4. Performance can be improved through memoization

### Example: Dashboard Split

**Before** (904 lines):
- `Dashboard.tsx` - monolithic component

**After** (split into 6 files):
- `Dashboard.tsx` (main orchestrator) - ~200 lines
- `KPICards.tsx` (KPI display) - ~100 lines
- `ScheduleTable.tsx` (schedule view) - ~150 lines
- `WeeklyPerformanceChart.tsx` (chart) - ~120 lines
- `CoachingPanel.tsx` (AI coaching) - ~100 lines
- `TasksPanel.tsx` (tasks widget) - ~150 lines

**Benefits**:
- Each file has single responsibility
- Easier to test and maintain
- Better performance through memoization
- Reusable components

## Testing

### Test Structure

Tests are located in `client/tests/components/`:

```
client/tests/components/
├── Dashboard.test.tsx
├── LeadDrawer.test.tsx
├── TargetsDashboard.test.tsx
└── ... etc
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test Dashboard.test.tsx

# Run in watch mode
npm test -- --watch
```

### Test Guidelines

1. Test user interactions, not implementation
2. Use React Testing Library
3. Mock API calls and external dependencies
4. Test accessibility (a11y)

## Migration from Legacy Structure

### Step-by-Step Migration

1. **Update imports in your file**:
   ```typescript
   // Old
   import { Button } from './components/Common/Button';

   // New
   import { Button } from '@ui';
   ```

2. **Use barrel exports**:
   ```typescript
   // Old
   import { LeadsDashboard } from './components/Leads/LeadsDashboard';
   import { LeadDrawer } from './components/Leads/LeadDrawer';

   // New
   import { LeadsDashboard, LeadDrawer } from '@leads';
   ```

3. **Test your changes**:
   ```bash
   npm run build
   npm test
   ```

### Compatibility Note

The old `client/components/` structure still exists for backwards compatibility. However, all new development should use the new `client/src/components/` structure.

## Adding New Components

### Checklist

1. **Choose the right domain folder**
   - Does it manage leads? → `leads/`
   - Is it a UI component? → `ui/`
   - Is it dashboard-specific? → `dashboard/`

2. **Create the component file**:
   ```typescript
   // src/components/leads/NewComponent.tsx
   export const NewComponent = () => {
     // implementation
   };
   ```

3. **Add to barrel export**:
   ```typescript
   // src/components/leads/index.ts
   export { NewComponent } from './NewComponent';
   ```

4. **Use TypeScript**:
   - Define props interface
   - Use shared types from `@types`
   - Avoid `any` type

5. **Add performance optimizations if needed**:
   - Memoize if component re-renders frequently
   - Use `useCallback` for event handlers
   - Use `useMemo` for expensive computations

6. **Write tests**:
   ```typescript
   // tests/components/NewComponent.test.tsx
   describe('NewComponent', () => {
     it('renders correctly', () => {
       // test implementation
     });
   });
   ```

## Best Practices

### Do's ✅

- Use path aliases for imports
- Keep components under 500 lines
- Use TypeScript for all components
- Memoize expensive components
- Use barrel exports
- Follow naming conventions
- Write tests for new components
- Use ErrorBoundary for critical sections
- Import types from `@types` package

### Don'ts ❌

- Don't use relative imports (`../../components/...`)
- Don't create components over 500 lines
- Don't use `any` type
- Don't forget to memoize expensive renders
- Don't skip tests
- Don't mix business logic with presentation
- Don't duplicate components across domains

## Naming Conventions

### Components

- PascalCase: `LeadsDashboard`, `KPICards`
- Descriptive: `NewLeadDrawer` not `Drawer2`
- Domain-specific: `LeadAssignmentDashboard` not `Assignment`

### Files

- Match component name: `LeadsDashboard.tsx`
- Use `.tsx` for React components
- Use `.ts` for utilities and types

### Hooks

- Start with `use`: `useLeads`, `useTasks`
- Descriptive: `useRealtimeLeads` not `useRL`

### Types

- Suffix interfaces: `LeadsDashboardProps`
- Use descriptive names: `SortConfig`, `WeeklyData`

## Troubleshooting

### Import Issues

**Problem**: `Cannot find module '@components/leads'`

**Solution**:
1. Check `tsconfig.json` has correct paths
2. Restart TypeScript server in IDE
3. Check barrel export exists in `index.ts`

### Build Issues

**Problem**: `Module not found: Error: Can't resolve`

**Solution**:
1. Clear build cache: `rm -rf node_modules/.cache`
2. Rebuild: `npm run build`
3. Check import paths are correct

### Performance Issues

**Problem**: Component re-renders too frequently

**Solution**:
1. Wrap in `React.memo()`
2. Use `useCallback` for handlers
3. Use `useMemo` for computed values
4. Check props for unnecessary changes

## Future Improvements

- [ ] Implement code splitting for routes
- [ ] Add Storybook for component documentation
- [ ] Set up visual regression testing
- [ ] Create design system documentation
- [ ] Add automated bundle size monitoring
- [ ] Implement progressive web app features

## Questions?

For questions or suggestions about the frontend architecture, please:
1. Check this documentation
2. Review the component guide (`COMPONENT_GUIDE.md`)
3. Ask the team in the development channel

---

**Last Updated**: 2026-02-16
**Maintained By**: Agent 5 - Frontend Architecture Specialist
