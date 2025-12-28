-- FINAL PRODUCTION FIX FOR PROFILES
-- This script configures the permissions correctly for a Team/SaaS application.

-- 1. Reset: Enable Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Clean Slate: Remove all existing (potentially broken) policies
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Allow logged-in read" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "3l536p_0" ON public.profiles;
DROP POLICY IF EXISTS "3l536p_1" ON public.profiles;
DROP POLICY IF EXISTS "3l536p_2" ON public.profiles;

-- 3. PERMANENT POLICY: READ ACCESS
-- In a team app, any logged-in user needs to be able to see names/avatars of other users (e.g. for "Assigned To", "Team View", etc).
-- This is secure (requires login) but prevents the "Recursion" bug.
CREATE POLICY "Allow all authenticated to view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 4. PERMANENT POLICY: UPDATE ACCESS
-- Only the user can update their OWN profile.
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 5. PERMANENT POLICY: INSERT ACCESS
-- Allow users (via the Trigger or manually) to insert their own profile.
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 6. Grant basic table access to the authenticated role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Confirmation
SELECT 'Permissions Fixed' as status;
