# Syncing Pipeline Stages with Organization Settings

## Goal Description
The **Pipeline Dashboard** and **Lead Drawer** currently use hardcoded pipeline stages (New, Discovery, Proposal, Negotiation, Closed). The user needs these to dynamically reflect the custom stages defined in their **Organization Settings**.

## User Review Required
> [!IMPORTANT]
> **Data Migration Note**: Existing leads with statuses that do not match the new organization settings will need to be mapped or will fall into a "Unknown" or default bucket. The current implementation defaults them to "New". We will maintain this fallback behavior to prevent data loss or UI errors.

## Proposed Changes

### Backend Logic
#### [MODIFY] [db-service.js](file:///Users/omerzano/Downloads/עבודה/Sales Coach/src/services/db-service.js)
- **Update [getPipelineFunnel](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/src/services/db-service.js#883-1028)**:
    - Call `this.getOrganizationSettings(organizationId)` to retrieve `stages_config`.
    - Instead of the hardcoded `counts` object (`{'New': 0 ...}`), dynamically initialize counts based on `stages_config`.
    - Iterate through leads and match `lead.status` to the dynamic stages.
        - *Fallback*: If a lead's status isn't in the config, map it to the first stage (or keep separate "Other" bucket if preferred, but usually first stage is safest).
    - Return the formatted array matching the [PipelineDashboard](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/client/components/Pipeline/PipelineDashboard.tsx#91-535) expectation (id, label, count, value, etc.), but using the dynamic labels.

### Frontend Components
#### [MODIFY] [LeadDrawer.tsx](file:///Users/omerzano/Downloads/עבודה/Sales Coach/client/components/Leads/LeadDrawer.tsx)
- **Remove Hardcoded Maps**: Delete [getStatusLabel](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/client/components/Leads/LeadDrawer.tsx#255-268) and [getStatusColor](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/client/components/Leads/LeadDrawer.tsx#238-254) switch statements.
- **Fetch Settings**: Add## Phase 2 Fixes (Current)
The previous phase missed updating the main Leads Dashboard and the New Lead form.

### Leads Dashboard ([client/components/Leads/LeadsDashboard.tsx](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/client/components/Leads/LeadsDashboard.tsx))
- [x] Pass `orgId` to `<LeadDrawer />` (currently missing, causing Edit form to fall back to defaults).
- [x] Pass `statuses` (dynamic `statusOptions`) to `<NewLeadDrawer />`.

### New Lead Form ([client/components/Leads/NewLeadDrawer.tsx](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/client/components/Leads/NewLeadDrawer.tsx))
- [x] Update props to accept `statuses: {id, label, color}[]`.
- [x] Replace hardcoded `<select>` options with mapping over `statuses`.
- [x] Default `status` state should be the first available status ID.

### Verification
- [ ] Create a new lead and verify the status dropdown shows custom stages.
- [ ] Edit an existing lead in the Kanban view and verify the status dropdown is correct.
- [x] Verify Dashboard caching is disabled (temporarily).

## Phase 3: Performance Optimization
- [ ] **Parallel Fetching**: Ensure [PipelineDashboard.tsx](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/client/components/Pipeline/PipelineDashboard.tsx) fetches all data in parallel (already implemented, need to verify).
- [ ] **Database Indexing**: Add indexes to [leads](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/src/routes/leads-handler.js#5-439) table on `organization_id`, `status`, and `created_at` to speed up filtering.
- [ ] **Smart Caching**: Re-introduce caching but with a "stale-while-revalidate" strategy or a shorter TTL, so user navigation is instant but data updates quickly.
- [ ] **Optimized Queries**: Review [getPipelineFunnel](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/src/services/db-service.js#883-1028) and [getStats](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/src/services/db-service.js#358-458) to ensure they don't fetch unnecessary columns or rows.
ntext). 
    - *Optimization*: Since [PipelineDashboard](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/client/components/Pipeline/PipelineDashboard.tsx#91-535) loads settings, we could pass them down, but [LeadDrawer](file:///Users/omerzano/Downloads/%D7%A2%D7%91%D7%95%D7%93%D7%94/Sales%20Coach/client/components/Leads/LeadDrawer.tsx#31-1322) is often improved to be standalone. We'll fetch if missing.
- **Dynamic Dropdown**: Render the "Status" select options based on the fetched `stages_config`.

#### [MODIFY] [PipelineDashboard.tsx](file:///Users/omerzano/Downloads/עבודה/Sales Coach/client/components/Pipeline/PipelineDashboard.tsx)
- **No fundamental changes needed** to rendering logic (it iterates `funnelData`), but verified that `STAGE_GRADIENTS` will cycle correctly for any number of stages.

## Verification Plan

### Manual Verification
1.  **Check Settings**: Verify `organization_settings` table has the Hebrew stages shown in the user's screenshot.
2.  **Dashboard Load**: Reload the Pipeline Dashboard.
    - *Expected*: Columns should now match the Hebrew stages (e.g., "פתיחה והיכרות", "גילוי צרכים...").
    - *Expected*: Value and counts should be distributed among these columns.
3.  **Lead Drawer**: Click a lead to open the drawer.
    - *Expected*: "Status" dropdown lists the Hebrew stages.
    - *Expected*: Current status is correctly selected.
4.  **Update Cycle**: Change status to the last stage -> Save -> Dashboard updates immediately (or after refresh).
