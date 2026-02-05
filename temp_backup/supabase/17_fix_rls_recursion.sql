-- ===========================================================
-- FIX: Infinite Recursion in RLS Policies
-- The issue: Policies on profiles query profiles, causing recursion
-- Solution: Use SECURITY DEFINER functions to bypass RLS for checks
-- ===========================================================

-- 1. DROP all problematic policies first
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers see org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin see all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Reps see own leads" ON public.leads;
DROP POLICY IF EXISTS "Managers see org leads" ON public.leads;
DROP POLICY IF EXISTS "Admin see all leads" ON public.leads;
DROP POLICY IF EXISTS "Reps manage own leads" ON public.leads;

DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers see org tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin see all tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users see own calls" ON public.calls;
DROP POLICY IF EXISTS "Managers see org calls" ON public.calls;
DROP POLICY IF EXISTS "Admin see all calls" ON public.calls;

-- 2. Create SECURITY DEFINER helper functions (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'manager' 
        AND organization_id = target_org_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('platform_admin', 'super_admin')
    );
$$;

-- 3. PROFILES Policies (using helper functions)
-- Users see own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Managers see profiles in their org (using helper function)
CREATE POLICY "profiles_select_org" ON public.profiles
    FOR SELECT USING (public.is_manager_of_org(organization_id));

-- Platform admins see all
CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT USING (public.is_platform_admin());

-- 4. LEADS Policies
-- Reps see own leads
CREATE POLICY "leads_select_own" ON public.leads
    FOR SELECT USING (auth.uid() = owner_id);

-- Reps manage own leads
CREATE POLICY "leads_all_own" ON public.leads
    FOR ALL USING (auth.uid() = owner_id);

-- Managers see org leads
CREATE POLICY "leads_select_org" ON public.leads
    FOR SELECT USING (public.is_manager_of_org(organization_id));

-- Admins see all leads
CREATE POLICY "leads_select_admin" ON public.leads
    FOR SELECT USING (public.is_platform_admin());

-- 5. TASKS Policies
-- Users manage own tasks
CREATE POLICY "tasks_all_own" ON public.tasks
    FOR ALL USING (auth.uid() = owner_id);

-- Managers see org tasks
CREATE POLICY "tasks_select_org" ON public.tasks
    FOR SELECT USING (public.is_manager_of_org(organization_id));

-- Admins see all tasks
CREATE POLICY "tasks_select_admin" ON public.tasks
    FOR SELECT USING (public.is_platform_admin());

-- 6. CALLS Policies
-- Users see own calls
CREATE POLICY "calls_select_own" ON public.calls
    FOR SELECT USING (auth.uid() = agent_id);

-- Managers see org calls
CREATE POLICY "calls_select_org" ON public.calls
    FOR SELECT USING (public.is_manager_of_org(organization_id));

-- Admins see all calls
CREATE POLICY "calls_select_admin" ON public.calls
    FOR SELECT USING (public.is_platform_admin());

-- 7. Verify policies
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
