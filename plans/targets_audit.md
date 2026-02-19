# Targets Screen Audit

## Current Status
The **Targets Dashboard** (`TargetsDashboard.tsx`) provides a UI for managers to view and edit performance targets for their team. It successfully fetches and saves target settings to the `user_targets` table.

However, the **Performance Tracking** aspect is non-functional. The "Current" values for all metrics (Calls, Deals, Revenue, etc.) are currently hardcoded to `0` or static mock data.

## Key Findings

### 1. Missing Performance Data Integration
-   **File**: `TargetsDashboard.tsx`
-   **Issue**: The `getUserTarget` function constructs the `RepTargets` object. While it reads the *target* value from the DB, the *current* value is hardcoded:
    ```typescript
    calls: { target: userTargets?.calls || 40, current: 0 }, // Current still mock/0
    revenue: { target: userTargets?.revenue || 50000, current: 0 }
    ```
-   **Impact**: Managers can set goals but cannot track progress against them. The progress bars remain empty.

### 2. Data Structure (EAV Pattern)
-   **Table**: `user_targets`
-   **Structure**: Uses an Entity-Attribute-Value pattern:
    -   `user_id`
    -   `target_type` (e.g., 'calls', 'revenue')
    -   `target_value`
    -   `period` ('day', 'week', 'month')
-   **Observation**: This is flexible for adding new metric types without schema changes, but requires transformation logic in the frontend (implemented in `fetchData`) to map rows to a usable object.

### 3. UI/UX Observations
-   **TargetDrawer**: Defaults for `conversion` (15%) and `quality` (80) are hardcoded in the drawer if not found in the DB.
-   **Visuals**: The table layout is clean, with progress bars and badges. The "Manager Only" badge clearly indicates permissions.
-   **Filters**: Period switching ('day', 'week', 'month') works for fetching *targets*, but since *current stats* are missing, it doesn't filter actual performance.

### 4. Code Quality
-   **Hardcoded Fallbacks**: There are several magic numbers (e.g., default revenue 50000) scattered in the transformation logic.
-   **Type Safety**: `RepTargets` interface is well-defined, but the casting from the EAV fetch could be more robust.

## Recommendations for Improvement

### Phase 1: Real Integration (Critical)
1.  **Backend Endpoint**: Create a new API endpoint (e.g., `/api/targets/progress`) or update `getPanelStats` to accept a `userId` and `period`.
    -   This endpoint needs to aggregate `calls`, `deals` (from CRM), and `revenue` for the specified time range.
2.  **Frontend Integration**: Update `TargetsDashboard.tsx` to fetch this performance data in parallel with the targets and populate the `current` fields.

### Phase 2: Enhanced UI
1.  **Historical Trends**: Show a trendline (Sparkline) for the last 3 periods to show if the rep is improving.
2.  **Gamification**: highlighting "On Track" vs "At Risk" targets more prominently (e.g., changing row background or adding warning icons).

### Phase 3: Automation
1.  **Auto-Adjust**: Allow setting targets based on historical average (e.g., "Set to 10% above last month's average").
