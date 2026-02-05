-- NUCLEAR RLS RESTORE
-- Use this to clear ALL policies and set up a simple, non-recursive ruleset.

BEGIN;

-- 1. Disable RLS to stop recursion immediately
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop legacy/broken policies (try to catch all common names)
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Allow logged-in read" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all authenticated to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "3l536p_0" ON public.profiles;
DROP POLICY IF EXISTS "3l536p_1" ON public.profiles;
DROP POLICY IF EXISTS "3l536p_2" ON public.profiles;

-- 3. Re-Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Simple, Non-Recursive Policies

-- READ: Allow any authenticated user to read ANY profile
-- This is essential for:
--  - "Manager" seeing "Rep" info
--  - "Rep" seeing "Manager" name in chat
--  - Initial profile load
CREATE POLICY "global_read_policy"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Allow user to update ONLY their own row
CREATE POLICY "self_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- INSERT: Allow user to insert ONLY their own row (via trigger/manual)
CREATE POLICY "self_insert_policy"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 5. Grant Permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

COMMIT;

SELECT 'RLS Reset Complete' as status;
