# Comprehensive System Audit & Improvement Plan
**Date:** February 16, 2026
**Version:** 1.0

## 1. Executive Summary
The **Sales Coach** system is built on a modern, high-performance stack (React/Vite + Fastify + Supabase). It leverages real-time capabilities and a clean UI. However, the system faces significant risks due to a **lack of automated testing**, **permissive security configurations** (CORS), and **unstable database permissions** (RLS churn).

While the feature set is expanding (Lead Distribution, Targets), the foundation needs reinforcement to scale safely.

---

## 2. Architecture Overview
*   **Frontend**: React (Vite), Tailwind CSS v4, Lucide Icons, Recharts.
*   **Backend**: Node.js with Fastify (High performance), WebSocket support.
*   **Database**: Supabase (PostgreSQL) with Realtime enabled.
*   **Integration**: Twilio (Voice), OpenAI (Intelligence).

---

## 3. Critical Findings (P0 - Immediate Action Required)

### 🚨 3.1 Security Risks
1.  **CORS Wildcard**: The server is configured with `origin: '*'` (server.js:9). This allows *any* website to make requests to your API.
    *   **Risk**: High. Cross-Site Request Forgery (CSRF) and unauthorized API usage.
    *   **Fix**: Restrict `origin` to your actual frontend domain(s) and localhost.
2.  **RLS Instability**: Migration history shows repeated toggling of Row Level Security (`42_enable...`, `47_temporary_disable...`, `48_rollback...`, `52_tasks_rls...`).
    *   **Risk**: High. Data leaks or accidental access denial. "Hotfixing" production permissions suggests a lack of a stable testing environment for permissions.
    *   **Fix**: Create a dedicated test suite for RLS policies before applying them.

### 🧪 3.2 Lack of Testing
*   **Status**: `package.json` script is `"test": "echo \"Error: no test specified\""`.
*   **Risk**: Critical. Any widespread refactor (like the recent directory changes or RLS updates) could silently break core features.
*   **Recommendation**:
    *   **Backend**: Add `jest` or `tap` for API route testing.
    *   **Frontend**: Add `vitest` + `react-testing-library` for critical flows (Lead creation, Call handling).

---

## 4. Code Quality & Maintenance (P1)

### 4.1 Backend Type Safety
*   **Observation**: Backend is written in plain JavaScript (`require`, `module.exports`), while Frontend is TypeScript.
*   **Impact**: Missing out on type safety for shared data structures (Entities like `Lead`, `User`).
*   **Fix**: Migrate Backend to TypeScript or use JSDoc + `checkJs` to share types with the frontend types definitions.

### 4.2 Frontend Architecture
*   **Observation**: `client/src/components` is a flat directory with ~86 items.
*   **Impact**: Hard to navigate and maintain.
*   **Recommendation**: Reorganize by Feature (Domain-Driven):
    ```
    components/
      leads/       (LeadCard, LeadTable...)
      calls/       (Dialer, CallHistory...)
      dashboard/   (Stats, Charts...)
      ui/          (Shared atoms like Button, Input...)
    ```
*   **Component Size**: Some files (`App.tsx` @ 17KB) are getting large and should be broken down.

### 4.3 Database Schema
*   **Observation**: `user_targets` uses an EAV (Entity-Attribute-Value) pattern.
*   **Impact**: Flexible but makes aggregation queries (SUM/AVG) complex and slow at scale.
*   **Recommendation**: For core metrics (revenue, leads), consider specific columns or a dedicated summary table.

---

## 5. Feature Gaps (P2)

### 5.1 Performance Tracking (As noted in `targets_audit.md`)
*   **Status**: Targets exist, but *actual progress* is hardcoded to 0.
*   **Action**: Connect `TargetsDashboard` to real aggregation endpoints.

### 5.2 Observability
*   **Status**: Using standard console logging.
*   **Action**: Integrate a logging service (like Sentry or LogRocket) to catch client-side errors and backend exceptions in production.

---

## 6. Recommended Roadmap

### Phase 1: Security & Stability (Week 1)
1.  [ ] **Fix CORS**: Lock down API access.
2.  [ ] **Audit RLS**: Finalize policies and stop the "enable/disable" cycle.
3.  [ ] **Add Basic Tests**: Write one end-to-end test for "Create Lead" -> "Distribute Lead".

### Phase 2: Core Data Integrity (Week 2)
1.  [ ] **Implement Targets API**: Show real numbers on the dashboard.
2.  [ ] **Type Sync**: Share TypeScript interfaces (`Lead`, `User`) between Client and Server to prevent payload mismatch errors.

### Phase 3: Refactoring (Month 1)
1.  [ ] **Component Cleanup**: Group frontend components by feature.
2.  [ ] **Logging**: Add error tracking.
