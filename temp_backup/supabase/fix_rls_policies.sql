-- ==========================================
-- FIX: Infinite Recursion in RLS Policies
-- ==========================================

-- Problem: Checking (role = 'manager') prevents policies from working because 
-- querying the 'profiles' table triggers its own policy again and again.

-- Solution: Use a "Security Definer" function. 
-- This function runs with "superuser" privileges, bypassing RLS for the role check only.

-- 1. Create the helper function
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Runs as creator (admin), bypassing RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'manager'
  );
END;
$$;

-- 2. Drop ALL recursive policies (Clean Slate)
DROP POLICY IF EXISTS "Managers can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers see all leads" ON public.leads;
DROP POLICY IF EXISTS "Managers see all calls" ON public.calls;
DROP POLICY IF EXISTS "Managers see all summaries" ON public.call_summaries;
DROP POLICY IF EXISTS "Managers see all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can update any task" ON public.tasks;

-- 3. Re-create Policies using the new safe function

-- PROFILES
CREATE POLICY "Managers can see all profiles" ON public.profiles
  FOR SELECT USING ( is_manager() );

-- LEADS
-- LEADS
CREATE POLICY "Managers see all leads" ON public.leads
  FOR SELECT USING ( is_manager() );

CREATE POLICY "Managers can update all leads" ON public.leads
  FOR UPDATE USING ( is_manager() );

CREATE POLICY "Reps can update own leads" ON public.leads
  FOR UPDATE USING ( auth.uid() = owner_id );

-- CALLS
CREATE POLICY "Managers see all calls" ON public.calls
  FOR SELECT USING ( is_manager() );

-- CALL SUMMARIES
CREATE POLICY "Managers see all summaries" ON public.call_summaries
  FOR SELECT USING ( is_manager() );

-- TASKS
CREATE POLICY "Managers see all tasks" ON public.tasks
  FOR SELECT USING ( is_manager() );

CREATE POLICY "Managers can update any task" ON public.tasks
  FOR UPDATE USING ( is_manager() );

-- 4. Ensure Reps can Insert Leads (Fixing the specific error you saw)
-- If this policy was missing or recursive, add it simply:
DROP POLICY IF EXISTS "Reps can insert leads" ON public.leads;
CREATE POLICY "Reps can insert leads" ON public.leads
  FOR INSERT WITH CHECK ( auth.uid() = owner_id );
