-- TEMPORARY: Disable RLS on all tables until we fix client-side queries
-- This is NOT PRODUCTION READY - re-enable after fixing authentication flow

-- Disable RLS
ALTER TABLE public.calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Log warning
DO $$
BEGIN
  RAISE WARNING 'RLS DISABLED on calls, leads, profiles - NOT PRODUCTION SAFE!';
  RAISE NOTICE 'Re-enable after fixing client authentication flow';
END $$;
