-- 48_optimize_pipeline_performance.sql
-- Add critical indexes to improve Pipeline Dashboard loading speed
-- These indexes target the most common query patterns in getPipelineFunnel and getStats

-- Index 1: Status column for funnel grouping and filtering
CREATE INDEX IF NOT EXISTS idx_leads_status
ON public.leads(status)
WHERE status IS NOT NULL;

-- Index 2: Created_at for time range filtering (used in all dashboard queries)
CREATE INDEX IF NOT EXISTS idx_leads_created_at
ON public.leads(created_at DESC);

-- Index 3: Composite index for the most common dashboard query pattern
-- This covers: organization_id filter + created_at range + status grouping
CREATE INDEX IF NOT EXISTS idx_leads_org_created_status
ON public.leads(organization_id, created_at DESC, status)
WHERE organization_id IS NOT NULL;

-- Index 4: For owner-specific queries (rep dashboard)
CREATE INDEX IF NOT EXISTS idx_leads_owner_created
ON public.leads(owner_id, created_at DESC)
WHERE owner_id IS NOT NULL;

-- Index 5: For value calculations in funnel
-- Partial index for leads with actual monetary value
CREATE INDEX IF NOT EXISTS idx_leads_status_value
ON public.leads(status, value)
WHERE value > 0;

-- Analyze tables to update query planner statistics
ANALYZE public.leads;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Pipeline performance indexes created successfully';
  RAISE NOTICE 'Expected improvement: 3-10x faster dashboard queries';
END $$;
