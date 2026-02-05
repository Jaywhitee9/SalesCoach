
-- Force replace the trigger function to ensure it respects admin_mode
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
    -- Check if admin mode is enabled
    BEGIN
        is_admin_mode := current_setting('app.admin_mode', true)::boolean;
    EXCEPTION WHEN OTHERS THEN
        is_admin_mode := false;
    END;
    
    -- BYPASS if admin mode is true
    IF is_admin_mode = true THEN
        RETURN NEW;
    END IF;

    -- Otherwise, enforce strict checks
    curr_org_id := public.current_org_id();

    IF curr_org_id IS NULL THEN
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
