-- 43_enable_rls_leads.sql
-- Enable Row Level Security on leads table
-- Critical security: Prevent cross-organization data leaks

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users see only their org leads" ON public.leads;
DROP POLICY IF EXISTS "Agents update their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can create leads for their org" ON public.leads;
DROP POLICY IF EXISTS "Managers manage all org leads" ON public.leads;
DROP POLICY IF EXISTS "Service role full access" ON public.leads;

-- Policy 1: Users can only see leads from their organization
CREATE POLICY "Users see only their org leads" ON public.leads
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy 2: Agents can update their assigned leads
CREATE POLICY "Agents update their assigned leads" ON public.leads
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy 3: Agents can insert leads for their org
CREATE POLICY "Agents can create leads for their org" ON public.leads
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
    AND owner_id = auth.uid()
  );

-- Policy 4: Managers can manage all org leads
CREATE POLICY "Managers manage all org leads" ON public.leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND organization_id = public.leads.organization_id
      AND role IN ('manager', 'admin')
    )
  );

-- Policy 5: Service role bypass (for server-side operations)
CREATE POLICY "Service role full access" ON public.leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Performance optimization: Index for RLS queries
CREATE INDEX IF NOT EXISTS idx_leads_org_owner 
ON public.leads (organization_id, owner_id)
WHERE organization_id IS NOT NULL;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled on leads table with 5 policies';
END $$;
