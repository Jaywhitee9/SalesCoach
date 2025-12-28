-- FIX PROFILE PERMISSIONS
-- Run this in Supabase SQL Editor

-- 1. Ensure RLS is on
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop potentially conflicting policies
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- 3. Create a clean, working policy
-- This allows any logged-in user to see ONLY their own row in 'profiles'
CREATE POLICY "Users can see own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 4. Just in case, grant table permissions to the authenticated role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- 5. Verify the profiles actually exist (Optional check for you)
-- SELECT * FROM public.profiles;
