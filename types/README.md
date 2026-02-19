# Shared Types Package

This directory contains shared TypeScript types used across the entire Sales Coach application (frontend and backend).

## Structure

```
types/
├── entities/          # Core business entity types
│   ├── User.ts       # User, Profile, TeamMember types
│   ├── Lead.ts       # Lead, Deal types
│   ├── Call.ts       # Call, Message, Transcript types
│   ├── Organization.ts # Organization, Campaign, Settings types
│   ├── Target.ts     # RepTargets, GoalProgress types
│   ├── Task.ts       # Task types
│   └── Notification.ts # Notification types
├── api/              # API types
│   ├── requests.ts   # Request body types
│   ├── responses.ts  # Response types
│   └── common.ts     # Shared API types
├── database.ts       # Database schema types (DB* prefixed)
└── index.ts         # Central export (import from here)
```

## Usage

### TypeScript (Frontend)

```typescript
import { Lead, User, CallStatus } from '../types';
```

### JSDoc (Backend)

```javascript
/**
 * @typedef {import('../../types').Lead} Lead
 * @typedef {import('../../types').User} User
 */
```

## Naming Conventions

- **Entity Types**: PascalCase (e.g., `Lead`, `User`)
- **Database Types**: `DB` prefix (e.g., `DBLead`, `DBCall`)
- **Enums/Literals**: PascalCase (e.g., `LeadStatus`, `UserRole`)
- **API Types**: Descriptive names (e.g., `CreateLeadRequest`, `StatsResponse`)

## Type Categories

### Entities
Business domain objects - the core data models

### API
Request and response types for all API endpoints

### Database
Types that match the exact Supabase database schema

## Adding New Types

1. Determine the category (entity, API, or database)
2. Add the type to the appropriate file
3. Export from `index.ts` if needed globally
4. Document with JSDoc comments
5. Run type checking to verify

## Principles

- **DRY**: Don't repeat type definitions
- **Single Source of Truth**: One canonical type per concept
- **Explicit**: Prefer explicit types over `any`
- **Documented**: Add JSDoc comments for complex types
