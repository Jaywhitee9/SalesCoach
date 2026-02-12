-- 46_fix_profiles_rls_with_anon_support.sql
-- Fix RLS on profiles to support both authenticated and service role access
-- Critical: Allow service role full access while maintaining security

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users see org colleagues" ON public.profiles;
DROP POLICY IF EXISTS "Managers manage org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Policy 1: Service role has full access (MOST IMPORTANT - for server-side operations)
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Authenticated users can see their own profile
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 3: Authenticated users can update their own profile
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 4: Authenticated users can see colleagues in same org
CREATE POLICY "Users see org colleagues" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy 5: Managers can manage org profiles
CREATE POLICY "Managers manage org profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = public.profiles.organization_id
      AND p.role IN ('manager', 'admin')
    )
  );

-- Performance optimization
CREATE INDEX IF NOT EXISTS idx_profiles_org 
ON public.profiles (organization_id)
WHERE organization_id IS NOT NULL;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'RLS re-enabled on profiles with proper role separation';
END $$;
