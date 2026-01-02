-- Fix: Allow platform_admin to bypass organization enforcement
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.enforce_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    curr_org_id uuid;
    user_role text;
BEGIN
    -- Check if current user is platform_admin - they can bypass org checks
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    IF user_role IN ('platform_admin', 'super_admin') THEN
        RETURN NEW;  -- Allow admin operations without org restrictions
    END IF;

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

-- Also update admin_delete_user to remove the session_replication_role attempt
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_user_id uuid,
    p_lead_action text,
    p_reassign_to uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email text;
    user_org uuid;
    affected_leads int;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    SELECT email, organization_id INTO user_email, user_org 
    FROM public.profiles WHERE id = p_user_id;
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    CASE p_lead_action
        WHEN 'reassign' THEN
            IF p_reassign_to IS NULL THEN
                RAISE EXCEPTION 'reassign_to user ID required';
            END IF;
            UPDATE public.leads SET owner_id = p_reassign_to WHERE owner_id = p_user_id;
            GET DIAGNOSTICS affected_leads = ROW_COUNT;
        WHEN 'unassign' THEN
            UPDATE public.leads SET owner_id = NULL WHERE owner_id = p_user_id;
            GET DIAGNOSTICS affected_leads = ROW_COUNT;
        WHEN 'delete' THEN
            DELETE FROM public.leads WHERE owner_id = p_user_id;
            GET DIAGNOSTICS affected_leads = ROW_COUNT;
        ELSE
            RAISE EXCEPTION 'Invalid lead_action';
    END CASE;

    DELETE FROM public.tasks WHERE user_id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;
    
    PERFORM public.log_admin_action('delete_user', 'user', p_user_id, 
        jsonb_build_object('email', user_email, 'lead_action', p_lead_action, 'leads_affected', affected_leads));
    
    RETURN jsonb_build_object('success', true, 'deleted_user', user_email, 'leads_affected', affected_leads);
END;
$$;
