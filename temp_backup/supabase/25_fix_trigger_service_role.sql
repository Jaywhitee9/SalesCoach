
-- DEFINITIVE FIX for "Security Violation"
-- This trigger update explicitly allows the 'service_role' (backend) to bypass organization checks.

CREATE OR REPLACE FUNCTION public.enforce_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    curr_org_id uuid;
    is_admin_mode boolean;
BEGIN
    -- 1. CHECK SERVICE_ROLE bypass (The Backend uses this)
    -- Service role key bypasses RLS entirely, so this function won't even be called
    -- But we add this check for safety
    BEGIN
        IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
            RETURN NEW;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to other checks
    END;

    -- 2. CHECK ADMIN MODE (Legacy bypass)
    BEGIN
        is_admin_mode := current_setting('app.admin_mode', true)::boolean;
    EXCEPTION WHEN OTHERS THEN
        is_admin_mode := false;
    END;
    
    IF is_admin_mode = true THEN
        RETURN NEW;
    END IF;

    -- 3. NORMAL CHECKS
    curr_org_id := public.current_org_id();

    IF curr_org_id IS NULL THEN
        -- Verify if user is platform_admin
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('platform_admin', 'super_admin')) THEN
             RETURN NEW; -- Allow admins to operate without current_org context
        END IF;
        
        RAISE EXCEPTION 'Security Violation: User is not assigned to an Organization.';
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.organization_id := curr_org_id;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
             RAISE EXCEPTION 'Security Violation: Cannot transfer records between organizations.';
        END IF;
        NEW.organization_id := OLD.organization_id;
    END IF;

    RETURN NEW;
END;
$$;
