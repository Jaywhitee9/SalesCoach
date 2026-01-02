-- Super Admin Database Functions
-- Purpose: Secure RPC functions for platform administration

BEGIN;

-- =====================================================
-- 1. AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid NOT NULL REFERENCES auth.users(id),
    action text NOT NULL,
    target_type text NOT NULL, -- 'organization', 'user', 'lead'
    target_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);

-- =====================================================
-- 2. HELPER: Check if current user is platform admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    RETURN user_role IN ('platform_admin', 'super_admin');
END;
$$;

-- =====================================================
-- 3. HELPER: Log admin action
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_action text,
    p_target_type text,
    p_target_id uuid DEFAULT NULL,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- =====================================================
-- 4. RPC: Get Organizations with Stats (No N+1)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_get_organizations_with_stats()
RETURNS TABLE (
    id uuid,
    name text,
    created_at timestamptz,
    user_count bigint,
    lead_count bigint,
    last_activity_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security check
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.created_at,
        COALESCE(p.user_count, 0) AS user_count,
        COALESCE(l.lead_count, 0) AS lead_count,
        GREATEST(p.last_user_activity, l.last_lead_activity) AS last_activity_at
    FROM public.organizations o
    LEFT JOIN (
        SELECT 
            organization_id,
            COUNT(*) AS user_count,
            MAX(created_at) AS last_user_activity
        FROM public.profiles
        WHERE organization_id IS NOT NULL
        GROUP BY organization_id
    ) p ON o.id = p.organization_id
    LEFT JOIN (
        SELECT 
            organization_id,
            COUNT(*) AS lead_count,
            MAX(updated_at) AS last_lead_activity
        FROM public.leads
        WHERE organization_id IS NOT NULL
        GROUP BY organization_id
    ) l ON o.id = l.organization_id
    ORDER BY o.created_at DESC;
END;
$$;

-- =====================================================
-- 5. RPC: Get Isolation Integrity Report
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_get_isolation_report()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Security check
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    SELECT jsonb_build_object(
        'total_leads', (SELECT COUNT(*) FROM public.leads),
        'total_users', (SELECT COUNT(*) FROM public.profiles),
        'total_organizations', (SELECT COUNT(*) FROM public.organizations),
        'orphan_org_ids', (
            SELECT jsonb_agg(DISTINCT l.organization_id)
            FROM public.leads l
            WHERE l.organization_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = l.organization_id)
        ),
        'null_org_id_leads', (SELECT COUNT(*) FROM public.leads WHERE organization_id IS NULL),
        'null_org_id_users', (SELECT COUNT(*) FROM public.profiles WHERE organization_id IS NULL),
        'cross_org_assignments', (
            SELECT jsonb_agg(jsonb_build_object(
                'lead_id', l.id,
                'lead_org', l.organization_id,
                'owner_org', p.organization_id
            ))
            FROM public.leads l
            JOIN public.profiles p ON l.owner_id = p.id
            WHERE l.organization_id IS DISTINCT FROM p.organization_id
            AND l.organization_id IS NOT NULL
            AND p.organization_id IS NOT NULL
            LIMIT 100
        ),
        'leads_per_org', (
            SELECT jsonb_agg(jsonb_build_object(
                'org_id', organization_id,
                'org_name', (SELECT name FROM public.organizations WHERE id = organization_id),
                'count', cnt
            ))
            FROM (
                SELECT organization_id, COUNT(*) AS cnt
                FROM public.leads
                WHERE organization_id IS NOT NULL
                GROUP BY organization_id
            ) sub
        ),
        'users_per_org', (
            SELECT jsonb_agg(jsonb_build_object(
                'org_id', organization_id,
                'org_name', (SELECT name FROM public.organizations WHERE id = organization_id),
                'count', cnt
            ))
            FROM (
                SELECT organization_id, COUNT(*) AS cnt
                FROM public.profiles
                WHERE organization_id IS NOT NULL
                GROUP BY organization_id
            ) sub
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- =====================================================
-- 6. RPC: Create Organization
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_create_organization(p_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id uuid;
BEGIN
    -- Security check
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    INSERT INTO public.organizations (name) VALUES (p_name) RETURNING id INTO new_org_id;
    
    -- Audit log
    PERFORM public.log_admin_action('create_organization', 'organization', new_org_id, 
        jsonb_build_object('name', p_name));
    
    RETURN new_org_id;
END;
$$;

-- =====================================================
-- 7. RPC: Delete Organization (Cascade)
-- =====================================================
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
    -- Security check
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    -- Get org name for audit
    SELECT name INTO org_name FROM public.organizations WHERE id = p_org_id;
    IF org_name IS NULL THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;

    -- Delete related data in order (respecting FK constraints)
    DELETE FROM public.tasks WHERE organization_id = p_org_id;
    GET DIAGNOSTICS deleted_tasks = ROW_COUNT;
    
    DELETE FROM public.leads WHERE organization_id = p_org_id;
    GET DIAGNOSTICS deleted_leads = ROW_COUNT;
    
    -- Set users org to null before deleting org (or delete users)
    UPDATE public.profiles SET organization_id = NULL WHERE organization_id = p_org_id;
    GET DIAGNOSTICS deleted_users = ROW_COUNT;
    
    -- Delete the organization
    DELETE FROM public.organizations WHERE id = p_org_id;
    
    -- Audit log
    PERFORM public.log_admin_action('delete_organization', 'organization', p_org_id, 
        jsonb_build_object(
            'name', org_name,
            'users_affected', deleted_users,
            'leads_deleted', deleted_leads,
            'tasks_deleted', deleted_tasks
        ));
    
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

-- =====================================================
-- 8. RPC: Get Organization Users
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_get_organization_users(p_org_id uuid)
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    role text,
    avatar_url text,
    created_at timestamptz,
    lead_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security check
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.avatar_url,
        p.created_at,
        COALESCE(l.lead_count, 0) AS lead_count
    FROM public.profiles p
    LEFT JOIN (
        SELECT owner_id, COUNT(*) AS lead_count
        FROM public.leads
        GROUP BY owner_id
    ) l ON p.id = l.owner_id
    WHERE p.organization_id = p_org_id
    ORDER BY p.created_at DESC;
END;
$$;

-- =====================================================
-- 9. RPC: Delete User with Lead Action
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_user_id uuid,
    p_lead_action text, -- 'reassign', 'unassign', 'delete'
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
    -- Security check
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    -- Get user info
    SELECT email, organization_id INTO user_email, user_org 
    FROM public.profiles WHERE id = p_user_id;
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- BYPASS security triggers (admin operation)
    SET LOCAL session_replication_role = 'replica';

    -- Handle leads based on action
    CASE p_lead_action
        WHEN 'reassign' THEN
            IF p_reassign_to IS NULL THEN
                RAISE EXCEPTION 'reassign_to user ID required for reassign action';
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
            RAISE EXCEPTION 'Invalid lead_action. Use: reassign, unassign, or delete';
    END CASE;

    -- Delete tasks
    DELETE FROM public.tasks WHERE user_id = p_user_id;
    
    -- Delete user profile (auth.users deletion must be done via Supabase Admin API)
    DELETE FROM public.profiles WHERE id = p_user_id;
    
    -- Restore normal trigger behavior
    SET LOCAL session_replication_role = 'origin';
    
    -- Audit log
    PERFORM public.log_admin_action('delete_user', 'user', p_user_id, 
        jsonb_build_object(
            'email', user_email,
            'lead_action', p_lead_action,
            'leads_affected', affected_leads,
            'reassigned_to', p_reassign_to
        ));
    
    RETURN jsonb_build_object(
        'success', true,
        'deleted_user', user_email,
        'lead_action', p_lead_action,
        'leads_affected', affected_leads
    );
END;
$$;

-- =====================================================
-- 10. RPC: Get Audit Log
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_get_audit_log(p_limit int DEFAULT 50)
RETURNS TABLE (
    id uuid,
    admin_email text,
    action text,
    target_type text,
    target_id uuid,
    details jsonb,
    created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security check
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        p.email AS admin_email,
        a.action,
        a.target_type,
        a.target_id,
        a.details,
        a.created_at
    FROM public.admin_audit_log a
    JOIN public.profiles p ON a.admin_id = p.id
    ORDER BY a.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMIT;
