-- 53_add_performance_indexes.sql
-- Performance optimization: Add critical indexes for frequently queried patterns
-- Based on analysis of db-service.js query patterns

-- ============================================================
-- CALLS TABLE INDEXES
-- ============================================================

-- Index for getRecentCalls (organization_id, created_at)
-- Query: .eq('organization_id', org).order('created_at', desc)
CREATE INDEX IF NOT EXISTS idx_calls_org_created_at
ON public.calls (organization_id, created_at DESC)
WHERE organization_id IS NOT NULL;

-- Index for stats queries (organization_id, agent_id, created_at)
-- Query: .eq('organization_id', org).eq('agent_id', userId).gte('created_at', date)
CREATE INDEX IF NOT EXISTS idx_calls_org_agent_created
ON public.calls (organization_id, agent_id, created_at DESC)
WHERE organization_id IS NOT NULL AND agent_id IS NOT NULL;

-- Index for status filtering in stats
-- Query: .eq('status', 'completed')
CREATE INDEX IF NOT EXISTS idx_calls_status_created
ON public.calls (status, created_at DESC)
WHERE status IS NOT NULL;

-- ============================================================
-- LEADS TABLE INDEXES
-- ============================================================

-- Index for leads dashboard (organization_id, status, updated_at)
-- Query: .eq('organization_id', org).order('created_at', desc)
CREATE INDEX IF NOT EXISTS idx_leads_org_status_updated
ON public.leads (organization_id, status, updated_at DESC)
WHERE organization_id IS NOT NULL;

-- Index for owner queries (owner_id, status, created_at)
-- Query: .eq('owner_id', userId).order('created_at', desc)
CREATE INDEX IF NOT EXISTS idx_leads_owner_status_created
ON public.leads (owner_id, status, created_at DESC)
WHERE owner_id IS NOT NULL;

-- Index for priority filtering (priority, created_at)
-- Query: .eq('priority', 'Hot').order('created_at', desc)
CREATE INDEX IF NOT EXISTS idx_leads_priority_created
ON public.leads (priority, created_at DESC)
WHERE priority IS NOT NULL;

-- Index for at-risk leads (updated_at, status)
-- Query: .lt('updated_at', cutoff).not('status', 'eq', 'Closed')
CREATE INDEX IF NOT EXISTS idx_leads_updated_status
ON public.leads (updated_at ASC, status)
WHERE status != 'Closed';

-- Composite index for pipeline queries (organization_id, status, value)
-- Used in funnel analytics and pipeline dashboard
CREATE INDEX IF NOT EXISTS idx_leads_org_status_value
ON public.leads (organization_id, status, value)
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- ============================================================
-- USER_TARGETS TABLE INDEXES
-- ============================================================

-- Index for user targets lookup (user_id, period)
-- Query: .eq('user_id', userId).eq('period', 'day/week/month')
CREATE INDEX IF NOT EXISTS idx_user_targets_user_period
ON public.user_targets (user_id, period)
WHERE user_id IS NOT NULL;

-- Index for organization targets (organization_id, period)
-- Query: .eq('organization_id', org).eq('period', period)
CREATE INDEX IF NOT EXISTS idx_user_targets_org_period
ON public.user_targets (organization_id, period)
WHERE organization_id IS NOT NULL;

-- ============================================================
-- CALL_SUMMARIES TABLE INDEXES
-- ============================================================

-- Index for summaries with scores (created_at, score, successful)
-- Query: .gte('created_at', date).select('score, successful')
CREATE INDEX IF NOT EXISTS idx_call_summaries_created_score
ON public.call_summaries (created_at DESC, score, successful)
WHERE score IS NOT NULL;

-- Index for organization summaries
CREATE INDEX IF NOT EXISTS idx_call_summaries_org_created
ON public.call_summaries (organization_id, created_at DESC)
WHERE organization_id IS NOT NULL;

-- ============================================================
-- TASKS TABLE INDEXES
-- ============================================================

-- Index for tasks by organization and user
CREATE INDEX IF NOT EXISTS idx_tasks_org_user_status
ON public.tasks (organization_id, user_id, status)
WHERE organization_id IS NOT NULL;

-- Index for task due dates
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_status
ON public.tasks (due_date ASC, status)
WHERE due_date IS NOT NULL AND status != 'completed';

-- ============================================================
-- PROFILES TABLE INDEXES
-- ============================================================

-- Note: idx_profiles_org already exists from migration 44/46
-- Just ensuring it's properly defined
CREATE INDEX IF NOT EXISTS idx_profiles_org_role
ON public.profiles (organization_id, role)
WHERE organization_id IS NOT NULL;

-- ============================================================
-- CLEANUP: Remove duplicate or redundant indexes
-- ============================================================

-- Note: These indexes may have been created in previous migrations
-- Check if there are duplicates with different names but same columns

-- List of existing indexes (from previous migrations):
-- - idx_calls_org_agent (42_enable_rls_calls.sql) - overlaps with idx_calls_org_agent_created
-- - idx_leads_org_owner (43_enable_rls_leads.sql) - different from our new indexes
-- - idx_profiles_org (44/46) - kept, added role for better filtering
-- - idx_leads_status, idx_leads_created_at, etc. (48_optimize_pipeline_performance.sql)

-- We keep all indexes as they serve different query patterns
-- PostgreSQL's query planner will use the most efficient one

-- ============================================================
-- ANALYZE TABLES
-- ============================================================

-- Update table statistics for better query planning
ANALYZE public.calls;
ANALYZE public.leads;
ANALYZE public.user_targets;
ANALYZE public.call_summaries;
ANALYZE public.tasks;
ANALYZE public.profiles;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- To verify indexes were created, run:
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename IN ('calls', 'leads', 'user_targets', 'call_summaries', 'tasks', 'profiles')
-- ORDER BY tablename, indexname;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Performance indexes created successfully';
  RAISE NOTICE '   - Calls: 3 new indexes';
  RAISE NOTICE '   - Leads: 5 new indexes';
  RAISE NOTICE '   - User Targets: 2 new indexes';
  RAISE NOTICE '   - Call Summaries: 2 new indexes';
  RAISE NOTICE '   - Tasks: 2 new indexes';
  RAISE NOTICE '   - Profiles: 1 enhanced index';
  RAISE NOTICE '⚡ Query performance should be significantly improved';
END $$;
