-- 44_enable_rls_profiles.sql
-- Enable Row Level Security on profiles table
-- Critical security: Prevent cross-organization data leaks

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users see org colleagues" ON public.profiles;
DROP POLICY IF EXISTS "Managers manage org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Policy 1: Users can see their own profile
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Users can update their own profile (limited fields)
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: Users can see colleagues in same org
CREATE POLICY "Users see org colleagues" ON public.profiles
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy 4: Managers can manage org profiles
CREATE POLICY "Managers manage org profiles" ON public.profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = public.profiles.organization_id
      AND p.role IN ('manager', 'admin')
    )
  );

-- Policy 5: Service role bypass (for server-side operations)
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Performance optimization: Index for RLS queries
CREATE INDEX IF NOT EXISTS idx_profiles_org 
ON public.profiles (organization_id)
WHERE organization_id IS NOT NULL;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled on profiles table with 5 policies';
END $$;
