-- 42_enable_rls_calls.sql
-- Enable Row Level Security on calls table
-- Critical security: Prevent cross-organization data leaks

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users see only their org calls" ON public.calls;
DROP POLICY IF EXISTS "Agents can create calls for their org" ON public.calls;
DROP POLICY IF EXISTS "Agents can update their own calls" ON public.calls;
DROP POLICY IF EXISTS "Managers see all org calls" ON public.calls;
DROP POLICY IF EXISTS "Service role full access" ON public.calls;

-- Policy 1: Users can only see calls from their organization
CREATE POLICY "Users see only their org calls" ON public.calls
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy 2: Agents can insert calls for their organization
CREATE POLICY "Agents can create calls for their org" ON public.calls
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
    AND agent_id = auth.uid()
  );

-- Policy 3: Agents can update their own calls
CREATE POLICY "Agents can update their own calls" ON public.calls
  FOR UPDATE
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Policy 4: Managers can see all org calls
CREATE POLICY "Managers see all org calls" ON public.calls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND organization_id = public.calls.organization_id
      AND role IN ('manager', 'admin')
    )
  );

-- Policy 5: Service role bypass (for server-side operations)
CREATE POLICY "Service role full access" ON public.calls
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Performance optimization: Index for RLS queries
CREATE INDEX IF NOT EXISTS idx_calls_org_agent 
ON public.calls (organization_id, agent_id)
WHERE organization_id IS NOT NULL;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled on calls table with 5 policies';
END $$;
