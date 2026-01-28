-- =====================================================
-- NUCLEAR FIX: Profiles RLS Infinite Recursion
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop ALL policies on profiles
DROP POLICY IF EXISTS "profiles_org_select" ON profiles;
DROP POLICY IF EXISTS "profiles_self_select" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_org" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_view_own" ON profiles;
DROP POLICY IF EXISTS "profiles_view_org" ON profiles;
DROP POLICY IF EXISTS "view_org_profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Step 2: Create SECURITY DEFINER function (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Step 3: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SIMPLE policies (no recursion possible)

-- Policy 1: User can read their OWN profile
CREATE POLICY "profiles_read_self" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Policy 2: User can read OTHER profiles in their org
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "profiles_read_org" ON profiles
FOR SELECT USING (
    organization_id = public.get_my_organization_id()
);

-- Policy 3: User can update their own profile
CREATE POLICY "profiles_update_self" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Step 5: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Step 6: Verify
SELECT 'NUCLEAR RLS FIX COMPLETED!' as result;

SELECT schemaname, tablename, policyname
FROM pg_policies 
WHERE tablename = 'profiles';
