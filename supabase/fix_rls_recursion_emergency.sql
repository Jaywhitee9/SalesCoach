-- =====================================================
-- EMERGENCY FIX: Profiles RLS Recursion
-- Run this IMMEDIATELY in Supabase SQL Editor
-- =====================================================

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "view_org_profiles" ON profiles;

-- 2. Create a SECURITY DEFINER function to get user's org without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Create safe profiles policies
-- Users can view their own profile
CREATE POLICY "profiles_view_own" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Users can view org members using the SECURITY DEFINER function
CREATE POLICY "profiles_view_org" ON profiles
FOR SELECT USING (
    organization_id = public.get_my_org_id()
);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- 4. Same fix for leads
DROP POLICY IF EXISTS "leads_select" ON leads;

CREATE POLICY "leads_select" ON leads
FOR SELECT USING (
    organization_id = public.get_my_org_id()
    AND (
        public.get_my_role() IN ('admin', 'sales_manager', 'manager', 'platform_admin')
        OR owner_id = auth.uid()
        OR owner_id IS NULL
    )
);

-- 5. Same fix for calls
DROP POLICY IF EXISTS "calls_org_select" ON calls;

CREATE POLICY "calls_org_select" ON calls
FOR SELECT USING (
    organization_id = public.get_my_org_id()
    AND (
        public.get_my_role() IN ('admin', 'sales_manager', 'manager', 'platform_admin')
        OR agent_id = auth.uid()
    )
);

-- 6. Refresh schema
NOTIFY pgrst, 'reload schema';

SELECT 'RLS RECURSION FIX COMPLETED!' as result;
