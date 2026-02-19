# Type System Architecture

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SALES COACH TYPE SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        SHARED TYPES (/types)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   ENTITIES   │  │     API      │  │   DATABASE   │         │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤         │
│  │ • User       │  │ • Requests   │  │ • DBLead     │         │
│  │ • Lead       │  │ • Responses  │  │ • DBCall     │         │
│  │ • Call       │  │ • Common     │  │ • DBProfile  │         │
│  │ • Organization│  │ • Errors     │  │ • ...        │         │
│  │ • Target     │  │ • Filters    │  │              │         │
│  │ • Task       │  │ • Pagination │  │              │         │
│  │ • Notification│ │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Import & Re-export
                              ▼
        ┌─────────────────────────────────────────┐
        │                                         │
        ▼                                         ▼
┌───────────────────┐                  ┌──────────────────┐
│  BACKEND (JSDoc)  │                  │  FRONTEND (TS)   │
├───────────────────┤                  ├──────────────────┤
│                   │                  │                  │
│ • db-service.js   │◄────────────────►│ • Components     │
│ • api-handler.js  │   Type-safe API  │ • Hooks          │
│ • coaching-*.js   │                  │ • Services       │
│                   │                  │ • types.ts       │
│ Uses:             │                  │                  │
│ @typedef imports  │                  │ Uses:            │
│ JSDoc comments    │                  │ TypeScript       │
│                   │                  │ imports          │
└───────────────────┘                  └──────────────────┘
        │                                        │
        │                                        │
        ▼                                        ▼
┌───────────────────┐                  ┌──────────────────┐
│   SUPABASE DB     │                  │   REACT UI       │
├───────────────────┤                  ├──────────────────┤
│ • leads           │                  │ • Dashboard      │
│ • calls           │                  │ • Leads          │
│ • profiles        │                  │ • Pipeline       │
│ • organizations   │                  │ • Settings       │
│ • tasks           │                  │ • Chat           │
│ • notifications   │                  │                  │
└───────────────────┘                  └──────────────────┘
```

## Type Flow

### Request Flow (Frontend → Backend → Database)

```
USER ACTION
    │
    │ 1. User fills form
    ▼
┌─────────────────────┐
│  React Component    │  Type: CreateLeadRequest
│  (TypeScript)       │  {
└─────────────────────┘    organization_id: string
    │                      name: string
    │ 2. Submit form        phone: string
    ▼                      ...
┌─────────────────────┐  }
│  API Call           │
│  fetch('/api/leads')│
└─────────────────────┘
    │
    │ 3. HTTP POST with typed body
    ▼
┌─────────────────────┐
│  Fastify Route      │  Type: LeadWebhookRequest
│  api-handler.js     │  (JSDoc validates)
└─────────────────────┘
    │
    │ 4. Call service
    ▼
┌─────────────────────┐
│  DB Service         │  Type: CreateLeadInput → DBLead
│  db-service.js      │  (JSDoc validates)
└─────────────────────┘
    │
    │ 5. Insert to DB
    ▼
┌─────────────────────┐
│  Supabase           │  Columns match DBLead type
│  leads table        │
└─────────────────────┘
```

### Response Flow (Database → Backend → Frontend)

```
┌─────────────────────┐
│  Supabase Query     │
│  SELECT * FROM leads│
└─────────────────────┘
    │
    │ Returns array of rows
    ▼
┌─────────────────────┐
│  DB Service         │  Returns: Promise<DBLead[]>
│  getLeads()         │  (JSDoc documents)
└─────────────────────┘
    │
    │ Transform to API format
    ▼
┌─────────────────────┐
│  API Handler        │  Returns: LeadsResponse
│  /api/leads         │  {
└─────────────────────┘    success: true,
    │                      leads: DBLead[]
    │ JSON response       }
    ▼
┌─────────────────────┐
│  React Component    │  Type: LeadsResponse
│  setLeads(data)     │  TypeScript validates
└─────────────────────┘
    │
    │ Render to UI
    ▼
USER SEES DATA
```

## Type Relationships

### Entity Hierarchy

```
Organization
    │
    ├── Profiles (Users)
    │   ├── Rep
    │   ├── Manager
    │   └── Super Admin
    │
    ├── Leads
    │   ├── Tasks
    │   └── Calls
    │       ├── Transcripts
    │       ├── Messages
    │       └── Call Summaries
    │
    ├── Campaigns
    │   └── Leads (filtered)
    │
    ├── Phone Numbers
    │   └── Calls
    │
    └── Settings
        ├── Distribution Rules
        ├── API Keys
        └── Knowledge Base
```

### Type Dependencies

```
Lead
  ├─► User (owner)
  ├─► Organization
  ├─► Campaign (optional)
  ├─► LeadScoreDetails (optional)
  └─► Tags (string[])

Call
  ├─► User (agent)
  ├─► Lead
  ├─► Organization
  ├─► PhoneNumber (optional)
  ├─► Transcript
  ├─► AccumulatedSignals
  └─► CallSummary (optional)

Task
  ├─► User (owner)
  ├─► Lead (optional)
  └─► Organization (implied)

Notification
  ├─► User (recipient)
  └─► Metadata (optional context)
```

## Type Safety Layers

### Layer 1: Database Schema

```typescript
// database.ts
export interface DBLead {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  // ... exact DB columns
}
```

**Purpose:** Match Supabase table structure exactly

### Layer 2: Business Entities

```typescript
// entities/Lead.ts
export interface Lead {
  id: string;
  name: string;
  company: string;
  owner?: User;  // Populated from join
  scoreDetails?: LeadScoreDetails;
  // ... business logic fields
}
```

**Purpose:** Represent domain concepts with relationships

### Layer 3: API Contracts

```typescript
// api/requests.ts
export interface CreateLeadRequest {
  organization_id: string;
  name: string;
  phone: string;
  // ... only what client sends
}

// api/responses.ts
export interface LeadsResponse {
  success: boolean;
  leads?: Lead[];
  error?: string;
}
```

**Purpose:** Define API boundaries and validation

### Layer 4: UI Types

```typescript
// client/types.ts
export interface KPIMetric {
  label: string;
  value: string;  // Formatted for display
  trendDirection: 'up' | 'down' | 'neutral';
}
```

**Purpose:** UI-specific display types

## Type Checking Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    TYPE CHECKING PROCESS                     │
└─────────────────────────────────────────────────────────────┘

1. DEVELOPMENT TIME
   ├─► Frontend: TypeScript compiler checks .ts/.tsx files
   ├─► Backend: TypeScript compiler validates JSDoc comments
   └─► IDE: Real-time type checking & autocomplete

2. BUILD TIME
   ├─► npm run type-check
   │   ├─► type-check:frontend (TSC on client/)
   │   └─► type-check:backend (TSC on src/ with JSDoc)
   └─► Fix errors before deployment

3. RUNTIME
   ├─► No type checking (types are stripped)
   └─► Consider adding Zod/Yup validation for APIs
```

## Best Practices by Layer

### Database Layer
- ✅ Use `DB` prefix for all database types
- ✅ Match column names exactly
- ✅ Include all required fields
- ✅ Use nullable types (`?`) for optional columns

### Entity Layer
- ✅ Use business-friendly names
- ✅ Include relationships as properties
- ✅ Add computed/derived fields
- ✅ Use union types for status enums

### API Layer
- ✅ Separate request and response types
- ✅ Include validation constraints in JSDoc
- ✅ Use generic `ApiResponse<T>` wrapper
- ✅ Document error cases

### UI Layer
- ✅ Format data for display
- ✅ Use presentational types
- ✅ Keep types simple and flat
- ✅ Avoid business logic in types

## Migration Checklist

When adding a new feature:

- [ ] Define database table type in `database.ts`
- [ ] Create entity type in `types/entities/`
- [ ] Add API request type in `types/api/requests.ts`
- [ ] Add API response type in `types/api/responses.ts`
- [ ] Export from `types/index.ts`
- [ ] Add JSDoc to backend functions
- [ ] Import types in frontend components
- [ ] Run `npm run type-check`
- [ ] Test functionality

## Tools & Configuration

### TypeScript Compiler

```bash
# Check everything
npm run type-check

# Watch mode for development
tsc --noEmit --watch
```

### VS Code Settings

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "javascript.suggestionActions.enabled": true,
  "typescript.suggest.autoImports": true
}
```

### ESLint Integration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ]
};
```

## Future Enhancements

### Phase 2: Runtime Validation
- Add Zod schemas for API validation
- Generate types from Zod schemas
- Validate at API boundaries

### Phase 3: Auto-generation
- Generate DB types from Supabase
- Generate API types from OpenAPI
- Sync types automatically

### Phase 4: Full TypeScript
- Convert backend .js → .ts
- Remove JSDoc in favor of native TS
- Use TypeScript for build process

---

**Last Updated:** February 16, 2026
**Maintained By:** TypeScript Migration Team
