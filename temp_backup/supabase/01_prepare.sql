-- 01_prepare.sql
-- Purpose: Safely introduce Multi-Tenancy schema (Non-Breaking).
-- Actions: Create table, functions, columns, indexes. NO TRIGGERS attached yet.
-- Rollback: See bottom of file.

BEGIN;

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Add organization_id column (NULLABLE for existing app compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
        ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'organization_id') THEN
        ALTER TABLE public.tasks ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'organization_id') THEN
        ALTER TABLE public.leads ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
    END IF;
END $$;

-- 3. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id);

-- 4. Helper Function: current_org_id()
-- Strict Security Definer in safe path.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    org_id uuid;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN org_id;
END;
$$;

-- 5. Trigger Function: enforce_organization_id()
-- Will be attached in step 03_enforce.sql
CREATE OR REPLACE FUNCTION public.enforce_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    curr_org_id uuid;
BEGIN
    -- Get Current Org
    curr_org_id := public.current_org_id();

    -- Strict Check: Context Validity
    IF curr_org_id IS NULL THEN
        RAISE EXCEPTION 'Security Violation: User is not assigned to an Organization.';
    END IF;

    -- IF INSERT: Force Override
    IF TG_OP = 'INSERT' THEN
        NEW.organization_id := curr_org_id;
    END IF;

    -- IF UPDATE: Prevent Change & Ensure Consistency
    IF TG_OP = 'UPDATE' THEN
        IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
             RAISE EXCEPTION 'Security Violation: Cannot transfer records between organizations.';
        END IF;
        -- Force keep original just in case of injection attempt
        NEW.organization_id := OLD.organization_id;
    END IF;

    RETURN NEW;
END;
$$;

COMMIT;

-- =======================================================
-- VERIFICATION QUERIES
-- =======================================================
-- 1. Check Table
-- SELECT * FROM public.organizations;
-- 2. Check Columns
-- SELECT table_name FROM information_schema.columns WHERE column_name = 'organization_id';
-- 3. Check Functions
-- SELECT proname FROM pg_proc WHERE proname IN ('current_org_id', 'enforce_organization_id');

-- =======================================================
-- ROLLBACK
-- =======================================================
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;
-- DROP FUNCTION IF EXISTS public.enforce_organization_id;
-- DROP FUNCTION IF EXISTS public.current_org_id;
-- DROP TABLE IF EXISTS public.organizations;

-- =======================================================
-- UPCOMING STEP 03_enforce.sql (PREVIEW)
-- =======================================================
-- 1. Attach Triggers:
--    CREATE TRIGGER trg_enforce_org_tasks BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION enforce_organization_id();
-- 2. Set NOT NULL:
--    ALTER TABLE tasks ALTER COLUMN organization_id SET NOT NULL;
-- 3. RLS Policies (USING + WITH CHECK):
--    CREATE POLICY "Org Isolation" ON tasks FOR ALL USING (organization_id = current_org_id()) WITH CHECK (organization_id = current_org_id());
