-- ===========================================================
-- NUCLEAR CLEAN: Remove ALL old policies and keep only safe ones
-- ===========================================================

-- DROP all profiles policies
DROP POLICY IF EXISTS "Org members can see profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform Admins manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform Admins see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins see all" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users see own profile" ON public.profiles;
DROP POLICY IF EXISTS "global_read_policy" ON public.profiles;
DROP POLICY IF EXISTS "self_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "self_update_policy" ON public.profiles;

-- DROP all leads policies  
DROP POLICY IF EXISTS "Access Own Org Leads" ON public.leads;
DROP POLICY IF EXISTS "Org Isolation Policy" ON public.leads;

-- DROP all calls policies
DROP POLICY IF EXISTS "Access Own Org Calls" ON public.calls;
DROP POLICY IF EXISTS "Org isolation calls" ON public.calls;

-- DROP all tasks policies
DROP POLICY IF EXISTS "Org Isolation Policy" ON public.tasks;

-- Also drop call_summaries problematic policies
DROP POLICY IF EXISTS "Managers see all summaries" ON public.call_summaries;

-- Verify only clean policies remain
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
