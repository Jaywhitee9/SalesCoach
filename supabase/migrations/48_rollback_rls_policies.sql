-- ROLLBACK: Remove all RLS policies that broke the system
-- The app was secure BEFORE RLS via server-side organization_id filtering

-- Remove policies from calls
DROP POLICY IF EXISTS "Users see only their org calls" ON public.calls;
DROP POLICY IF EXISTS "Agents can create calls for their org" ON public.calls;
DROP POLICY IF EXISTS "Agents can update their own calls" ON public.calls;
DROP POLICY IF EXISTS "Managers see all org calls" ON public.calls;
DROP POLICY IF EXISTS "Service role full access" ON public.calls;

-- Remove policies from leads
DROP POLICY IF EXISTS "Users see only their org leads" ON public.leads;
DROP POLICY IF EXISTS "Agents update their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can create leads for their org" ON public.leads;
DROP POLICY IF EXISTS "Managers manage all org leads" ON public.leads;
DROP POLICY IF EXISTS "Service role full access" ON public.leads;

-- Remove policies from profiles
DROP POLICY IF EXISTS "Users see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users see org colleagues" ON public.profiles;
DROP POLICY IF EXISTS "Managers manage org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Disable RLS completely (back to original state)
ALTER TABLE public.calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Keep only the useful additions (live_state + indexes)
-- These migrations are still good:
-- - 41_add_call_live_state.sql ✅ (call persistence)
-- The indexes from 42-44 are also fine to keep

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Rolled back RLS policies - system restored to working state';
  RAISE NOTICE '✅ Kept: live_state column + indexes for performance';
END $$;
