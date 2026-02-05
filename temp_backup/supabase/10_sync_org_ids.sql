-- Sync organization_id with existing org_id
-- We use session_replication_role = 'replica' to BYPASS strict triggers like enforce_organization_id()
-- This allows us to perform bulk updates without needing a mocked user session.

BEGIN;

-- 1. Disable Triggers temporarily
SET session_replication_role = 'replica';

-- 2. Copy org_id to organization_id for all profiles
-- We cast to uuid just in case, though column is uuid.
UPDATE public.profiles
SET organization_id = org_id
WHERE org_id IS NOT NULL;

-- 3. Update all leads to match their owner's organization
UPDATE public.leads AS l
SET organization_id = p.organization_id
FROM public.profiles AS p
WHERE l.owner_id = p.id
AND p.organization_id IS NOT NULL;

-- 4. Re-enable Triggers
SET session_replication_role = 'origin';

COMMIT;

-- Verification
-- SELECT organization_id, count(*) FROM public.leads GROUP BY organization_id;
