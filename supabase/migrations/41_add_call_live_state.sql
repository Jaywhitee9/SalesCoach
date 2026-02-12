-- 41_add_call_live_state.sql
-- Add live state persistence for in-progress calls
-- This enables recovery after server crashes/restarts

-- Add live state column for real-time call data
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS live_state JSONB DEFAULT NULL;

-- Add heartbeat timestamp for detecting stale calls
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ DEFAULT NOW();

-- Index for fast recovery queries (only index in-progress calls)
CREATE INDEX IF NOT EXISTS idx_calls_live_state 
ON public.calls (status, organization_id, last_heartbeat) 
WHERE status = 'in-progress';

-- Index for RLS performance optimization
CREATE INDEX IF NOT EXISTS idx_calls_org_agent 
ON public.calls (organization_id, agent_id);

-- Column documentation
COMMENT ON COLUMN public.calls.live_state IS 'Real-time call state (transcripts, coaching history, accumulated signals) - cleared on completion to save storage';
COMMENT ON COLUMN public.calls.last_heartbeat IS 'Last successful state save timestamp - used to detect crashed calls (stale if >2 minutes old)';
