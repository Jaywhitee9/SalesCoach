# Type System Documentation

## Overview

The Sales Coach application now has comprehensive type safety across the entire stack using TypeScript and JSDoc. This document explains the type system architecture, how to use it, and best practices.

## Architecture

### Directory Structure

```
types/
├── entities/          # Core business entity types
│   ├── User.ts
│   ├── Lead.ts
│   ├── Call.ts
│   ├── Organization.ts
│   ├── Target.ts
│   ├── Task.ts
│   └── Notification.ts
├── api/              # API request/response types
│   ├── requests.ts
│   ├── responses.ts
│   └── common.ts
├── database.ts       # Database schema types
└── index.ts         # Central export file

client/
└── types.ts         # Client-specific UI types (re-exports shared types)

src/services/
└── db-service-types.js  # JSDoc type definitions for backend
```

### Type Categories

#### 1. Entity Types (`types/entities/`)

Core business objects representing the domain model:

- **User/Profile** - User accounts, roles, and preferences
- **Lead** - Sales leads with status, priority, and metadata
- **Call** - Phone calls with transcripts and coaching data
- **Organization** - Companies using the system
- **Target** - Sales goals and performance metrics
- **Task** - To-do items and reminders
- **Notification** - System notifications

#### 2. API Types (`types/api/`)

Types for API communication:

- **requests.ts** - Request body types for all API endpoints
- **responses.ts** - Response types including success/error structures
- **common.ts** - Shared types like pagination, filters, errors

#### 3. Database Types (`types/database.ts`)

Database table schema types matching Supabase structure. These use the `DB` prefix (e.g., `DBLead`, `DBCall`) to distinguish from entity types.

#### 4. Client Types (`client/types.ts`)

UI-specific types that only exist in the frontend (e.g., `Stage`, `Insight`, `CoachSuggestion`).

## Usage

### Frontend (TypeScript)

Import types directly:

```typescript
import { Lead, User, CallStatus } from '../types';
// or from specific modules
import { Lead } from '../types/entities/Lead';
import { CreateLeadRequest } from '../types/api/requests';

// Use in components
const MyComponent: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const createLead = async (data: CreateLeadRequest) => {
    // type-safe API call
  };
};
```

### Backend (JSDoc)

Use JSDoc comments for type safety:

```javascript
/**
 * @typedef {import('../../types').DBLead} DBLead
 * @typedef {import('./db-service-types').CreateLeadInput} CreateLeadInput
 */

/**
 * Create a new lead
 * @param {CreateLeadInput} leadData - Lead data to create
 * @returns {Promise<DBLead>} Created lead record
 */
async function createLead(leadData) {
  // Implementation with type checking
}
```

### API Handlers

Type API routes with JSDoc:

```javascript
/**
 * @typedef {import('../../types').LeadWebhookRequest} LeadWebhookRequest
 * @typedef {import('../../types').ApiResponse} ApiResponse
 */

fastify.post('/api/leads/webhook', async (request, reply) => {
  /** @type {LeadWebhookRequest} */
  const leadData = request.body;

  // TypeScript/IDE will now provide autocomplete and type checking
});
```

## Type Checking

### Commands

```bash
# Check all types (frontend + backend)
npm run type-check

# Check backend only (JSDoc)
npm run type-check:backend

# Check frontend only (TypeScript)
npm run type-check:frontend
```

### Configuration

**Root `tsconfig.json`** - Frontend TypeScript configuration
**Root `jsconfig.json`** - Backend JSDoc configuration

Both configurations are set up to:
- Enable strict type checking
- Support ES2020+ features
- Use path aliases for imports
- Skip lib checks for faster builds

## Best Practices

### 1. Always Define Types

❌ **Bad:**
```typescript
const user = { id: '123', name: 'John' };
```

✅ **Good:**
```typescript
const user: User = {
  id: '123',
  name: 'John',
  role: 'rep',
  type: 'rep',
  avatar: '/default.png'
};
```

### 2. Use Shared Types

❌ **Bad:**
```typescript
// Duplicating type definitions
interface MyLead {
  id: string;
  name: string;
  // ...
}
```

✅ **Good:**
```typescript
import { Lead } from '../types';
// Use the shared type
```

### 3. Document with JSDoc in Backend

❌ **Bad:**
```javascript
async function getLeads(organizationId) {
  // No type information
}
```

✅ **Good:**
```javascript
/**
 * Get all leads for an organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<DBLead[]>} Array of leads
 */
async function getLeads(organizationId) {
  // IDE provides autocomplete and type checking
}
```

### 4. Handle API Responses Properly

❌ **Bad:**
```typescript
const response = await fetch('/api/leads');
const leads = await response.json(); // any type
```

✅ **Good:**
```typescript
const response = await fetch('/api/leads');
const data = await response.json() as LeadsResponse;
if (data.success && data.leads) {
  // TypeScript knows leads is Lead[]
  setLeads(data.leads);
}
```

### 5. Use Type Guards

```typescript
function isLead(obj: any): obj is Lead {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
}

// Usage
if (isLead(data)) {
  // TypeScript knows data is Lead here
  console.log(data.name);
}
```

## Common Types Reference

### Lead Statuses

```typescript
type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
```

### User Roles

```typescript
type UserRole = 'rep' | 'manager' | 'super_admin';
```

### Call Statuses

```typescript
type CallStatus = 'Completed' | 'Missed' | 'In Progress' | 'Scheduled' | 'completed' | 'in_progress' | 'failed';
```

### API Response Pattern

All API responses follow this structure:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

## Migration Guide

### Migrating Existing Code

1. **Add type imports** at the top of the file
2. **Add JSDoc comments** to functions (backend)
3. **Add type annotations** to variables (frontend)
4. **Run type checker** and fix errors
5. **Test thoroughly** to ensure no runtime issues

### Example Migration

**Before:**
```javascript
async function createLead(leadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert(leadData);
  return data;
}
```

**After:**
```javascript
/**
 * @typedef {import('../../types').CreateLeadInput} CreateLeadInput
 * @typedef {import('../../types').DBLead} DBLead
 */

/**
 * Create a new lead
 * @param {CreateLeadInput} leadData - Lead data to create
 * @returns {Promise<DBLead>} Created lead record
 * @throws {Error} If creation fails
 */
async function createLead(leadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert(leadData);

  if (error) throw error;
  return data;
}
```

## Troubleshooting

### Type Errors

**Error:** `Cannot find module '../../types'`

**Solution:** Ensure the types directory exists and tsconfig/jsconfig paths are configured correctly.

**Error:** `Property 'xyz' does not exist on type 'Lead'`

**Solution:** Check if the property is defined in the type. You may need to update the type definition or use optional chaining.

### IDE Support

For best TypeScript support:

1. **VS Code** - Install TypeScript and ESLint extensions
2. **Cursor** - Built-in TypeScript support
3. **WebStorm** - Built-in TypeScript support

Configure your IDE to:
- Enable TypeScript validation
- Show inline type hints
- Auto-import types

## Testing Type Safety

### Backend (JSDoc)

1. Add JSDoc comments
2. Run `npm run type-check:backend`
3. Fix any errors reported by TypeScript

### Frontend (TypeScript)

1. Write TypeScript code
2. Run `npm run type-check:frontend`
3. Fix any errors before building

## Future Improvements

- [ ] Add runtime validation using Zod or Yup
- [ ] Generate API client from types
- [ ] Add end-to-end type safety with tRPC
- [ ] Generate database types from Supabase CLI
- [ ] Add type coverage metrics

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [JSDoc Reference](https://jsdoc.app/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

## Support

For questions or issues with the type system:
1. Check this documentation
2. Review example code in the codebase
3. Consult team lead or senior developer
