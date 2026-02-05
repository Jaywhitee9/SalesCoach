-- 03_enforce.sql
-- Purpose: ACTIVE ENFORCEMENT. Locks down RLS, Triggers, and Constraints.
-- WARNING: This script will break the app if Step 02 (Backfill) was not successful.
-- Actions: Attach Triggers, Set NOT NULL, Enable RLS, Update Auth Trigger.
-- Rollback: See bottom.

BEGIN;

-- =======================================================
-- 1. PRE-FLIGHT INTEGRITY CHECK
-- =======================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE organization_id IS NULL) OR
       EXISTS (SELECT 1 FROM public.tasks WHERE organization_id IS NULL) OR
       EXISTS (SELECT 1 FROM public.leads WHERE organization_id IS NULL) THEN
       RAISE EXCEPTION 'Blocking Enforce Script: Found NULL organization_id records. Run 02_backfill.sql first.';
    END IF;
END $$;

-- =======================================================
-- 2. UPDATE AUTH TRIGGER (Setup New Users correctly)
-- =======================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Fetch Default Org Safe Fallback
  SELECT id INTO default_org_id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1;
  
  IF default_org_id IS NULL THEN
      RAISE EXCEPTION 'Default Organization missing. Cannot create new user.';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, organization_id)
  VALUES (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'rep',
    default_org_id
  );
  return new;
END;
$$;

-- =======================================================
-- 3. SET NOT NULL CONSTRAINTS
-- =======================================================
ALTER TABLE public.profiles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.leads ALTER COLUMN organization_id SET NOT NULL;

-- =======================================================
-- 4. ATTACH SECURITY TRIGGERS (Tasks + Leads)
-- =======================================================
-- Ensure function exists from Step 01
DROP TRIGGER IF EXISTS trg_enforce_org_tasks ON public.tasks;
CREATE TRIGGER trg_enforce_org_tasks
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_organization_id();

DROP TRIGGER IF EXISTS trg_enforce_org_leads ON public.leads;
CREATE TRIGGER trg_enforce_org_leads
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.enforce_organization_id();

-- =======================================================
-- 5. ENABLE & CONFIGURE RLS (Tasks + Leads)
-- =======================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop generic policies if they exist (clean slate for specific tables)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.leads;

-- Create Strict Org-Based Policies (BOTH USING AND WITH CHECK)
CREATE POLICY "Org Isolation Policy" ON public.tasks
FOR ALL
TO authenticated
USING (organization_id = public.current_org_id())
WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "Org Isolation Policy" ON public.leads
FOR ALL
TO authenticated
USING (organization_id = public.current_org_id())
WITH CHECK (organization_id = public.current_org_id());

-- =======================================================
-- 6. SECURE PROFILES (RLS + Immutability)
-- =======================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- SELECT: User sees themselves
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- UPDATE: User updates themselves (Partial)
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- CRITICAL: Prevent User from changing their own Organization via Client
-- We revoke column-level UPDATE privilege on organization_id for normal users.
REVOKE UPDATE (organization_id) ON public.profiles FROM authenticated;

COMMIT;

-- =======================================================
-- VERIFICATION QUERIES
-- =======================================================
-- 1. Try to fetch tasks (should return only yours): SELECT count(*) FROM tasks;
-- 2. Try to insert task without org (Should fail/auto-fill): INSERT INTO tasks (title) VALUES ('Test');
-- 3. Check Constraints: \d tasks (look for NOT NULL on organization_id)

-- =======================================================
-- ROLLBACK
-- =======================================================
-- BEGIN;
-- ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Org Isolation Policy" ON public.tasks;
-- DROP POLICY IF EXISTS "Org Isolation Policy" ON public.leads;
-- DROP TRIGGER IF EXISTS trg_enforce_org_tasks ON public.tasks;
-- DROP TRIGGER IF EXISTS trg_enforce_org_leads ON public.leads;
-- ALTER TABLE public.profiles ALTER COLUMN organization_id DROP NOT NULL;
-- ALTER TABLE public.tasks ALTER COLUMN organization_id DROP NOT NULL;
-- ALTER TABLE public.leads ALTER COLUMN organization_id DROP NOT NULL;
-- GRANT UPDATE (organization_id) ON public.profiles TO authenticated;
-- COMMIT;
