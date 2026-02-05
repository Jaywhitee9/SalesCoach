-- ===========================================================
-- FIX: Admin SQL functions use auth.uid() which is NULL when
-- called via Service Role Key from the backend
-- ===========================================================

-- First, drop existing functions to allow changing signatures
DROP FUNCTION IF EXISTS public.admin_get_organizations_with_stats();
DROP FUNCTION IF EXISTS public.admin_verify_isolation();
DROP FUNCTION IF EXISTS public.admin_get_users(uuid);
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.admin_delete_organization(uuid);

-- Recreate admin_get_organizations_with_stats without the is_platform_admin check
-- (Backend already verified admin role in middleware)
CREATE OR REPLACE FUNCTION public.admin_get_organizations_with_stats()
RETURNS TABLE (
    id uuid,
    name text,
    status text,
    created_at timestamptz,
    user_count bigint,
    lead_count bigint,
    active_user_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- No is_platform_admin check here - backend middleware already verified
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        COALESCE(o.status, 'active')::text as status,
        o.created_at,
        COUNT(DISTINCT p.id)::bigint as user_count,
        COUNT(DISTINCT l.id)::bigint as lead_count,
        COUNT(DISTINCT CASE WHEN p.role != 'inactive' THEN p.id END)::bigint as active_user_count
    FROM organizations o
    LEFT JOIN profiles p ON p.organization_id = o.id
    LEFT JOIN leads l ON l.organization_id = o.id
    GROUP BY o.id, o.name, o.status, o.created_at
    ORDER BY o.created_at DESC;
END;
$$;

-- Recreate admin_verify_isolation without is_platform_admin check
CREATE OR REPLACE FUNCTION public.admin_verify_isolation()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    orphan_profiles int;
    orphan_leads int;
    mismatched_leads int;
BEGIN
    -- No is_platform_admin check - backend middleware handles this
    
    -- Count profiles without organization
    SELECT COUNT(*) INTO orphan_profiles 
    FROM profiles 
    WHERE organization_id IS NULL AND role NOT IN ('platform_admin', 'super_admin');
    
    -- Count leads without organization
    SELECT COUNT(*) INTO orphan_leads 
    FROM leads 
    WHERE organization_id IS NULL;
    
    -- Count leads where owner's org doesn't match lead's org
    SELECT COUNT(*) INTO mismatched_leads 
    FROM leads l
    JOIN profiles p ON l.owner_id = p.id
    WHERE l.organization_id != p.organization_id;
    
    RETURN jsonb_build_object(
        'orphan_profiles', orphan_profiles,
        'orphan_leads', orphan_leads, 
        'mismatched_leads', mismatched_leads,
        'is_healthy', (orphan_profiles = 0 AND orphan_leads = 0 AND mismatched_leads = 0)
    );
END;
$$;

-- Also fix admin_get_users for the same reason
CREATE OR REPLACE FUNCTION public.admin_get_users(p_org_id uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    role text,
    organization_id uuid,
    organization_name text,
    created_at timestamptz,
    lead_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.organization_id,
        o.name as organization_name,
        p.created_at,
        COUNT(l.id)::bigint as lead_count
    FROM profiles p
    LEFT JOIN organizations o ON p.organization_id = o.id
    LEFT JOIN leads l ON l.owner_id = p.id
    WHERE (p_org_id IS NULL OR p.organization_id = p_org_id)
    GROUP BY p.id, p.email, p.full_name, p.role, p.organization_id, o.name, p.created_at
    ORDER BY p.created_at DESC;
END;
$$;

-- Fix admin_delete_user
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
    affected_leads int;
BEGIN
    -- No is_platform_admin check - backend middleware handles this

    SELECT email INTO user_email FROM profiles WHERE id = p_user_id;
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Enable admin mode to bypass triggers
    PERFORM set_config('app.admin_mode', 'true', true);

    -- Handle leads
    CASE p_lead_action
        WHEN 'unassign' THEN
            UPDATE leads SET owner_id = NULL WHERE owner_id = p_user_id;
        WHEN 'delete' THEN
            DELETE FROM leads WHERE owner_id = p_user_id;
        WHEN 'reassign' THEN
            IF p_reassign_to IS NULL THEN
                RAISE EXCEPTION 'reassign_to user ID required';
            END IF;
            UPDATE leads SET owner_id = p_reassign_to WHERE owner_id = p_user_id;
        ELSE
            UPDATE leads SET owner_id = NULL WHERE owner_id = p_user_id;
    END CASE;
    GET DIAGNOSTICS affected_leads = ROW_COUNT;

    -- Delete tasks
    DELETE FROM tasks WHERE owner_id = p_user_id;
    
    -- Delete profile
    DELETE FROM profiles WHERE id = p_user_id;
    
    -- Disable admin mode
    PERFORM set_config('app.admin_mode', 'false', true);
    
    RETURN jsonb_build_object('success', true, 'deleted_user', user_email, 'leads_affected', affected_leads);
END;
$$;

-- Fix admin_delete_organization
CREATE OR REPLACE FUNCTION public.admin_delete_organization(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    org_name text;
    deleted_users int;
    deleted_leads int;
    deleted_tasks int;
BEGIN
    SELECT name INTO org_name FROM organizations WHERE id = p_org_id;
    IF org_name IS NULL THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;

    -- Enable admin mode
    PERFORM set_config('app.admin_mode', 'true', true);

    DELETE FROM tasks WHERE organization_id = p_org_id;
    GET DIAGNOSTICS deleted_tasks = ROW_COUNT;
    
    DELETE FROM leads WHERE organization_id = p_org_id;
    GET DIAGNOSTICS deleted_leads = ROW_COUNT;
    
    UPDATE profiles SET organization_id = NULL WHERE organization_id = p_org_id;
    GET DIAGNOSTICS deleted_users = ROW_COUNT;
    
    DELETE FROM organizations WHERE id = p_org_id;
    
    PERFORM set_config('app.admin_mode', 'false', true);
    
    RETURN jsonb_build_object(
        'success', true,
        'deleted', jsonb_build_object(
            'organization', org_name,
            'users_unassigned', deleted_users,
            'leads_deleted', deleted_leads,
            'tasks_deleted', deleted_tasks
        )
    );
END;
$$;
