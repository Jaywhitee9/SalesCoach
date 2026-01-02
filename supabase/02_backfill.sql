-- 02_backfill.sql
-- Purpose: Backfill organization_id for ALL existing data.
-- Actions: Create Default Org, Link Profiles, Link Data.
-- Rollback: See bottom of file.

BEGIN;

-- 1. Create Default Organization (Idempotent)
INSERT INTO public.organizations (name)
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'Default Organization');

-- 2. Execution Block
DO $$
DECLARE
    default_org_id uuid;
BEGIN
    SELECT id INTO default_org_id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1;
    
    IF default_org_id IS NULL THEN
        RAISE EXCEPTION 'Default Organization could not be found or created.';
    END IF;

    -- 3. Backfill Profiles (CRITICAL FIRST STEP)
    -- Assign all orphan profiles to Default Org
    UPDATE public.profiles
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    -- 4. Backfill Tasks
    -- Join with profiles to get the correct org for each task's owner
    UPDATE public.tasks t
    SET organization_id = p.organization_id
    FROM public.profiles p
    WHERE t.owner_id = p.id
    AND t.organization_id IS NULL;
    
    -- Cleanup: Tasks with no owner or owner without org -> Default Org
    UPDATE public.tasks
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    -- 5. Backfill Leads
    -- For now, assign all orphan leads to Default Org (simplest safe path)
    UPDATE public.leads
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

END $$;

COMMIT;

-- =======================================================
-- VERIFICATION QUERIES
-- =======================================================
-- 1. Inspect Profiles remaining null
-- SELECT count(*) as orphans_profiles FROM public.profiles WHERE organization_id IS NULL;
-- 2. Inspect Tasks remaining null
-- SELECT count(*) as orphans_tasks FROM public.tasks WHERE organization_id IS NULL;
-- 3. Inspect Leads remaining null
-- SELECT count(*) as orphans_leads FROM public.leads WHERE organization_id IS NULL;

-- =======================================================
-- ROLLBACK
-- =======================================================
-- UPDATE public.tasks SET organization_id = NULL;
-- UPDATE public.leads SET organization_id = NULL;
-- UPDATE public.profiles SET organization_id = NULL;
-- DELETE FROM public.organizations WHERE name = 'Default Organization';
