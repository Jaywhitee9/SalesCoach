-- FINAL RLS FIX
-- We found the specific policy causing the infinite loop.

-- 1. Drop the legacy policy that checks "Am I a manager?" by reading the table itself (causing the loop).
DROP POLICY IF EXISTS "Managers can see all profiles" ON public.profiles;

-- 2. Confirm it's gone
SELECT 'Legacy Policy Dropped' as status;
