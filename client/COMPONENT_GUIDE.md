# Component Quick Reference Guide

A quick reference for finding and using components in the Sales Coach frontend.

## Table of Contents

- [Component Locations](#component-locations)
- [Common Imports](#common-imports)
- [Component Standards](#component-standards)
- [Quick Find](#quick-find)

## Component Locations

### UI Components (`@ui`)

**Location**: `src/components/ui/`

| Component | Purpose | Import |
|-----------|---------|--------|
| Button | Primary action button | `import { Button } from '@ui'` |
| Badge | Status/label badges | `import { Badge } from '@ui'` |
| Modal | Modal dialogs | `import { Modal } from '@ui'` |
| Toast | Toast notifications | `import { Toast } from '@ui'` |
| ErrorBoundary | Error handling | `import { ErrorBoundary } from '@ui'` |
| DatePicker | Date selection | `import { DatePicker } from '@ui'` |
| TimePicker | Time selection | `import { TimePicker } from '@ui'` |
| DateTimePicker | Date & time selection | `import { DateTimePicker } from '@ui'` |

### Lead Management (`@leads`)

**Location**: `src/components/leads/`

| Component | Purpose | Import |
|-----------|---------|--------|
| LeadsDashboard | Main leads view | `import { LeadsDashboard } from '@leads'` |
| LeadDrawer | View/edit lead details | `import { LeadDrawer } from '@leads'` |
| NewLeadDrawer | Create new lead | `import { NewLeadDrawer } from '@leads'` |
| LeadsTable | Leads table view | `import { LeadsTable } from '@leads'` |
| LeadsKanban | Leads kanban board | `import { LeadsKanban } from '@leads'` |
| CSVImportModal | Bulk import leads | `import { CSVImportModal } from '@leads'` |
| BulkAssignModal | Assign leads in bulk | `import { BulkAssignModal } from '@leads'` |
| LeadAssignmentDashboard | Lead distribution | `import { LeadAssignmentDashboard } from '@leads'` |

### Call Management (`@calls`)

**Location**: `src/components/calls/`

| Component | Purpose | Import |
|-----------|---------|--------|
| CallStatusPanel | Call status display | `import { CallStatusPanel } from '@calls'` |
| ActiveCallPanel | Active call interface | `import { ActiveCallPanel } from '@calls'` |
| EmptyCallState | No active call state | `import { EmptyCallState } from '@calls'` |
| CallSummaryModal | Post-call summary | `import { CallSummaryModal } from '@calls'` |
| LivePlaybook | Real-time call guide | `import { LivePlaybook } from '@calls'` |
| InsightsPanel | Call insights | `import { InsightsPanel } from '@calls'` |
| QuickActionsBar | Quick call actions | `import { QuickActionsBar } from '@calls'` |
| DraggableCallScript | Call script widget | `import { DraggableCallScript } from '@calls'` |

### Dashboard (`@dashboard`)

**Location**: `src/components/dashboard/`

| Component | Purpose | Import |
|-----------|---------|--------|
| Dashboard | Rep dashboard | `import { Dashboard } from '@dashboard'` |
| ManagerDashboard | Manager dashboard | `import { ManagerDashboard } from '@dashboard'` |
| KPICards | KPI metrics cards | `import { KPICards } from '@dashboard'` |
| ScheduleTable | Daily schedule | `import { ScheduleTable } from '@dashboard'` |
| WeeklyPerformanceChart | Performance chart | `import { WeeklyPerformanceChart } from '@dashboard'` |
| CoachingPanel | AI coaching tips | `import { CoachingPanel } from '@dashboard'` |
| TasksPanel | Tasks widget | `import { TasksPanel } from '@dashboard'` |
| LiveFloor | Team activity floor | `import { LiveFloor } from '@dashboard'` |
| PerformanceMetrics | Detailed metrics | `import { PerformanceMetrics } from '@dashboard'` |

### Targets (`@targets`)

**Location**: `src/components/targets/`

| Component | Purpose | Import |
|-----------|---------|--------|
| TargetsDashboard | Targets overview | `import { TargetsDashboard } from '@targets'` |
| TargetDrawer | Edit targets | `import { TargetDrawer } from '@targets'` |

### Pipeline (`@pipeline`)

**Location**: `src/components/pipeline/`

| Component | Purpose | Import |
|-----------|---------|--------|
| PipelineDashboard | Pipeline funnel view | `import { PipelineDashboard } from '@pipeline'` |

### Tasks (`@tasks`)

**Location**: `src/components/tasks/`

| Component | Purpose | Import |
|-----------|---------|--------|
| TasksDashboard | Tasks management | `import { TasksDashboard } from '@tasks'` |
| AddTaskModal | Create new task | `import { AddTaskModal } from '@tasks'` |

### Settings (`@settings`)

**Location**: `src/components/settings/`

| Component | Purpose | Import |
|-----------|---------|--------|
| SettingsDashboard | Main settings | `import { SettingsDashboard } from '@settings'` |
| LeadDistributionSettings | Lead routing rules | `import { LeadDistributionSettings } from '@settings'` |
| DistributionSettingsModal | Distribution modal | `import { DistributionSettingsModal } from '@settings'` |
| PipelineSettings | Pipeline config | `import { PipelineSettings } from '@settings'` |
| SettingsCalls | Call settings | `import { SettingsCalls } from '@settings'` |
| WebhookSettings | Webhook config | `import { WebhookSettings } from '@settings'` |
| CampaignSettings | Campaign settings | `import { CampaignSettings } from '@settings'` |
| KnowledgeBase | Knowledge base | `import { KnowledgeBase } from '@settings'` |

### Layout (`@layout`)

**Location**: `src/components/layout/`

| Component | Purpose | Import |
|-----------|---------|--------|
| Sidebar | Main navigation | `import { Sidebar } from '@layout'` |
| TopBar | Top header bar | `import { TopBar } from '@layout'` |

### Authentication (`@auth`)

**Location**: `src/components/auth/`

| Component | Purpose | Import |
|-----------|---------|--------|
| Login | Login page | `import { Login } from '@auth'` |
| AcceptInvitationPage | User invitation | `import { AcceptInvitationPage } from '@auth'` |

## Common Imports

### Dashboard Page

```typescript
import { Dashboard, ManagerDashboard } from '@dashboard';
import { ErrorBoundary } from '@ui';
import { User } from '@types';
```

### Leads Page

```typescript
import {
  LeadsDashboard,
  LeadDrawer,
  NewLeadDrawer
} from '@leads';
import { Button, Badge } from '@ui';
import { Lead } from '@types';
```

### Settings Page

```typescript
import {
  SettingsDashboard,
  LeadDistributionSettings
} from '@settings';
import { Modal, Button } from '@ui';
```

## Component Standards

### Props Interface

All components should have a typed props interface:

```typescript
interface ComponentNameProps {
  // Required props
  data: SomeType;
  onAction: (id: string) => void;

  // Optional props
  className?: string;
  isDarkMode?: boolean;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  data,
  onAction,
  className,
  isDarkMode = false
}) => {
  // Implementation
};
```

### Event Handlers

Use descriptive handler names:

```typescript
// Good
const handleSaveClick = () => { /* ... */ };
const handleLeadSelect = (id: string) => { /* ... */ };

// Bad
const onClick = () => { /* ... */ };
const handler = (id: string) => { /* ... */ };
```

### State Management

Use descriptive state variable names:

```typescript
// Good
const [isLoading, setIsLoading] = useState(false);
const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

// Bad
const [loading, setLoading] = useState(false);
const [id, setId] = useState(null);
```

## Quick Find

### "I need to..."

**Display a button**
```typescript
import { Button } from '@ui';
<Button onClick={handleClick}>Click Me</Button>
```

**Show a status badge**
```typescript
import { Badge } from '@ui';
<Badge variant="success">Active</Badge>
```

**Open a modal**
```typescript
import { Modal } from '@ui';
<Modal isOpen={isOpen} onClose={onClose}>Content</Modal>
```

**Show lead details**
```typescript
import { LeadDrawer } from '@leads';
<LeadDrawer lead={selectedLead} onClose={onClose} />
```

**Create a new lead**
```typescript
import { NewLeadDrawer } from '@leads';
<NewLeadDrawer isOpen={isOpen} onClose={onClose} onSave={handleSave} />
```

**Display KPI metrics**
```typescript
import { KPICards } from '@dashboard';
<KPICards kpis={metricsData} />
```

**Show a schedule table**
```typescript
import { ScheduleTable } from '@dashboard';
<ScheduleTable
  calls={scheduledCalls}
  timeRange="day"
  onStartCall={handleStartCall}
/>
```

**Display performance chart**
```typescript
import { WeeklyPerformanceChart } from '@dashboard';
<WeeklyPerformanceChart data={weeklyData} isDarkMode={isDarkMode} />
```

**Show error boundary**
```typescript
import { ErrorBoundary } from '@ui';
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**Show toast notification**
```typescript
import { Toast } from '@ui';
<Toast
  message="Success!"
  type="success"
  onClose={() => setToast(null)}
/>
```

### "I'm looking for..."

**Lead management** → `@leads`
**Call features** → `@calls`
**Dashboard components** → `@dashboard`
**Settings pages** → `@settings`
**UI elements** → `@ui`
**Navigation** → `@layout`
**Authentication** → `@auth`

## Component File Structure

Standard structure for all components:

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { Button } from '@ui';
import { Lead } from '@types';

// 2. Types/Interfaces
interface ComponentProps {
  data: Lead[];
  onSelect: (id: string) => void;
}

// 3. Constants (if needed)
const DEFAULT_PAGE_SIZE = 20;

// 4. Helper functions (if small)
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('he-IL');
};

// 5. Main Component
export const Component: React.FC<ComponentProps> = ({
  data,
  onSelect
}) => {
  // State
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // Handlers
  const handleClick = (id: string) => {
    setSelectedId(id);
    onSelect(id);
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

// 6. Display name (for debugging)
Component.displayName = 'Component';
```

## Performance Checklist

When creating/updating components:

- [ ] Use `React.memo()` for components that re-render frequently
- [ ] Use `useCallback()` for event handlers passed to children
- [ ] Use `useMemo()` for expensive computations
- [ ] Avoid inline object/array creation in JSX
- [ ] Keep component size under 500 lines
- [ ] Extract reusable logic into custom hooks

## Testing Checklist

- [ ] Component renders without crashing
- [ ] Props are correctly passed and used
- [ ] Event handlers work as expected
- [ ] Loading states are handled
- [ ] Error states are handled
- [ ] Accessibility (keyboard navigation, ARIA labels)
- [ ] Responsive design (mobile, tablet, desktop)

## Styling Guidelines

### Tailwind Classes

Use consistent spacing and colors:

```typescript
// Good - consistent brand colors
<div className="bg-brand-500 text-white rounded-lg p-4">

// Bad - hardcoded colors
<div className="bg-blue-600 text-white rounded-lg p-4">
```

### Dark Mode

Always support dark mode:

```typescript
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
```

### Responsive Design

Use responsive classes:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

## Common Patterns

### Conditional Rendering

```typescript
// Loading state
{loading ? <Loader /> : <Content data={data} />}

// Empty state
{data.length === 0 ? <EmptyState /> : <DataTable data={data} />}

// Error state
{error ? <ErrorMessage error={error} /> : <NormalView />}
```

### Form Handling

```typescript
const [formData, setFormData] = useState({
  name: '',
  email: ''
});

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // Submit logic
};
```

### Modal Pattern

```typescript
const [isOpen, setIsOpen] = useState(false);

const handleOpen = () => setIsOpen(true);
const handleClose = () => setIsOpen(false);

return (
  <>
    <Button onClick={handleOpen}>Open Modal</Button>
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* Modal content */}
    </Modal>
  </>
);
```

## Need Help?

- Check `docs/frontend_architecture.md` for detailed architecture
- Review existing components for examples
- Ask in the development channel

---

**Last Updated**: 2026-02-16
**Quick Reference Version**: 1.0
