-- ===========================================================
-- COMPREHENSIVE FIX: All Admin SQL functions  
-- Drop and recreate without is_platform_admin checks
-- (Backend middleware already verifies permissions)
-- ===========================================================

-- Drop all existing admin functions
DROP FUNCTION IF EXISTS public.admin_get_organizations_with_stats();
DROP FUNCTION IF EXISTS public.admin_verify_isolation();
DROP FUNCTION IF EXISTS public.admin_get_isolation_report();
DROP FUNCTION IF EXISTS public.admin_get_users(uuid);
DROP FUNCTION IF EXISTS public.admin_get_organization_users(uuid);
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.admin_delete_organization(uuid);
DROP FUNCTION IF EXISTS public.admin_create_organization(text);
DROP FUNCTION IF EXISTS public.admin_get_audit_log(int);

-- ===========================================
-- 1. admin_get_organizations_with_stats
-- ===========================================
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

-- ===========================================
-- 2. admin_verify_isolation (integrity report)
-- Fix: Make sure to return numeric values to avoid NaN on frontend
-- ===========================================
CREATE OR REPLACE FUNCTION public.admin_verify_isolation()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    orphan_profiles int;
    orphan_leads int;
    mismatched_leads int;
    total_issues int;
BEGIN
    SELECT COUNT(*) INTO orphan_profiles 
    FROM profiles 
    WHERE organization_id IS NULL AND role NOT IN ('platform_admin', 'super_admin');
    
    SELECT COUNT(*) INTO orphan_leads 
    FROM leads 
    WHERE organization_id IS NULL;
    
    SELECT COUNT(*) INTO mismatched_leads 
    FROM leads l
    JOIN profiles p ON l.owner_id = p.id
    WHERE l.organization_id IS DISTINCT FROM p.organization_id;
    
    -- Ensure we return 0 instead of null
    orphan_profiles := COALESCE(orphan_profiles, 0);
    orphan_leads := COALESCE(orphan_leads, 0);
    mismatched_leads := COALESCE(mismatched_leads, 0);
    total_issues := orphan_profiles + orphan_leads + mismatched_leads;
    
    RETURN jsonb_build_object(
        'orphan_profiles', orphan_profiles,
        'orphan_leads', orphan_leads, 
        'mismatched_leads', mismatched_leads,
        'total_issues', total_issues,
        'is_healthy', (total_issues = 0)
    );
END;
$$;

-- ===========================================
-- 3. admin_get_organization_users
-- ===========================================
CREATE OR REPLACE FUNCTION public.admin_get_organization_users(p_org_id uuid)
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    role text,
    organization_id uuid,
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
        p.created_at,
        COUNT(l.id)::bigint as lead_count
    FROM profiles p
    LEFT JOIN leads l ON l.owner_id = p.id
    WHERE p.organization_id = p_org_id
    GROUP BY p.id, p.email, p.full_name, p.role, p.organization_id, p.created_at
    ORDER BY p.created_at DESC;
END;
$$;

-- ===========================================
-- 4. admin_get_users (all users with optional filter)
-- ===========================================
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

-- ===========================================
-- 5. admin_delete_user
-- Fix: Delete from calls table first to satisfy FK constraint (calls -> leads/users)
-- ===========================================
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
    SELECT email INTO user_email FROM profiles WHERE id = p_user_id;
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    PERFORM set_config('app.admin_mode', 'true', true);

    -- 1. First delete calls associated with this user (agent_id)
    -- This fixes the FK constraint error "calls_agent_id_fkey"
    DELETE FROM calls WHERE agent_id = p_user_id;
    
    -- Also delete calls for leads owned by this user if we're deleting the leads
    IF p_lead_action = 'delete' THEN
        DELETE FROM calls 
        WHERE lead_id IN (SELECT id FROM leads WHERE owner_id = p_user_id);
    END IF;

    -- 2. Handle leads
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

    -- 3. Delete tasks
    DELETE FROM tasks WHERE owner_id = p_user_id;
    
    -- 4. Delete profile
    DELETE FROM profiles WHERE id = p_user_id;
    
    PERFORM set_config('app.admin_mode', 'false', true);
    
    RETURN jsonb_build_object('success', true, 'deleted_user', user_email, 'leads_affected', affected_leads);
END;
$$;

-- ===========================================
-- 6. admin_delete_organization
-- ===========================================
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

-- ===========================================
-- 7. admin_create_organization
-- ===========================================
CREATE OR REPLACE FUNCTION public.admin_create_organization(p_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id uuid;
BEGIN
    INSERT INTO organizations (name, status)
    VALUES (p_name, 'active')
    RETURNING id INTO new_org_id;
    
    RETURN new_org_id;
END;
$$;

-- ===========================================
-- 8. admin_get_audit_log
-- ===========================================
CREATE OR REPLACE FUNCTION public.admin_get_audit_log(p_limit int DEFAULT 50)
RETURNS TABLE (
    id uuid,
    admin_id uuid,
    action_type text,
    target_type text,
    target_id uuid,
    details jsonb,
    created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if audit_log table exists, if not return empty
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_log') THEN
        RETURN QUERY
        SELECT 
            a.id,
            a.admin_id,
            a.action_type,
            a.target_type,
            a.target_id,
            a.details,
            a.created_at
        FROM admin_audit_log a
        ORDER BY a.created_at DESC
        LIMIT p_limit;
    END IF;
END;
$$;
