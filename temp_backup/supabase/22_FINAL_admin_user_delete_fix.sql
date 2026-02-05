-- ===========================================================
-- COMPLETE FIX FOR admin_delete_user
-- Based on actual database FK constraints discovered:
-- 1. calls.agent_id → profiles.id
-- 2. leads.owner_id → profiles.id
-- 3. messages.sender_id → profiles.id
-- 4. messages.recipient_id → profiles.id
-- 5. tasks.owner_id → profiles.id
-- 6. user_targets.user_id → profiles.id
-- ===========================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid, text, uuid);

-- Recreate with complete FK handling
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
    affected_leads int := 0;
    deleted_calls int := 0;
    deleted_messages int := 0;
    deleted_tasks int := 0;
    deleted_targets int := 0;
BEGIN
    -- Get user email for confirmation
    SELECT email INTO user_email FROM profiles WHERE id = p_user_id;
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Enable admin mode to bypass triggers
    PERFORM set_config('app.admin_mode', 'true', true);

    -- ========================================
    -- STEP 1: Delete from USER_TARGETS table
    -- (FK: user_targets.user_id → profiles.id)
    -- ========================================
    DELETE FROM user_targets WHERE user_id = p_user_id;
    GET DIAGNOSTICS deleted_targets = ROW_COUNT;

    -- ========================================
    -- STEP 2: Delete from MESSAGES table
    -- (FK: messages.sender_id → profiles.id)
    -- (FK: messages.recipient_id → profiles.id)
    -- ========================================
    DELETE FROM messages WHERE sender_id = p_user_id OR recipient_id = p_user_id;
    GET DIAGNOSTICS deleted_messages = ROW_COUNT;

    -- ========================================
    -- STEP 3: Delete from CALLS table
    -- (FK: calls.agent_id → profiles.id)
    -- Also delete calls linked to leads we're about to delete
    -- ========================================
    DELETE FROM calls WHERE agent_id = p_user_id;
    GET DIAGNOSTICS deleted_calls = ROW_COUNT;
    
    -- If deleting leads, also delete their associated calls
    IF p_lead_action = 'delete' THEN
        DELETE FROM calls 
        WHERE lead_id IN (SELECT id FROM leads WHERE owner_id = p_user_id);
    END IF;

    -- ========================================
    -- STEP 4: Handle LEADS based on action
    -- (FK: leads.owner_id → profiles.id)
    -- ========================================
    CASE p_lead_action
        WHEN 'unassign' THEN
            UPDATE leads SET owner_id = NULL WHERE owner_id = p_user_id;
        WHEN 'delete' THEN
            DELETE FROM leads WHERE owner_id = p_user_id;
        WHEN 'reassign' THEN
            IF p_reassign_to IS NULL THEN
                RAISE EXCEPTION 'reassign_to user ID required for reassign action';
            END IF;
            UPDATE leads SET owner_id = p_reassign_to WHERE owner_id = p_user_id;
        ELSE
            -- Default to unassign
            UPDATE leads SET owner_id = NULL WHERE owner_id = p_user_id;
    END CASE;
    GET DIAGNOSTICS affected_leads = ROW_COUNT;

    -- ========================================
    -- STEP 5: Delete from TASKS table
    -- (FK: tasks.owner_id → profiles.id)
    -- ========================================
    DELETE FROM tasks WHERE owner_id = p_user_id;
    GET DIAGNOSTICS deleted_tasks = ROW_COUNT;

    -- ========================================
    -- STEP 6: Finally delete the PROFILE
    -- ========================================
    DELETE FROM profiles WHERE id = p_user_id;
    
    -- Disable admin mode
    PERFORM set_config('app.admin_mode', 'false', true);
    
    -- Return detailed result
    RETURN jsonb_build_object(
        'success', true, 
        'deleted_user', user_email, 
        'leads_affected', affected_leads,
        'calls_deleted', deleted_calls,
        'messages_deleted', deleted_messages,
        'tasks_deleted', deleted_tasks,
        'targets_deleted', deleted_targets
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Make sure to disable admin mode even on error
    PERFORM set_config('app.admin_mode', 'false', true);
    RAISE;
END;
$$;

-- ========================================
-- ALSO FIX: admin_verify_isolation to return proper numbers
-- ========================================
DROP FUNCTION IF EXISTS public.admin_verify_isolation();

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
    SELECT COALESCE(COUNT(*), 0) INTO orphan_profiles 
    FROM profiles 
    WHERE organization_id IS NULL AND role NOT IN ('platform_admin', 'super_admin');
    
    SELECT COALESCE(COUNT(*), 0) INTO orphan_leads 
    FROM leads 
    WHERE organization_id IS NULL;
    
    SELECT COALESCE(COUNT(*), 0) INTO mismatched_leads 
    FROM leads l
    JOIN profiles p ON l.owner_id = p.id
    WHERE l.organization_id IS DISTINCT FROM p.organization_id;
    
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

-- ========================================
-- FIX: admin_get_organization_users if not exists
-- ========================================
DROP FUNCTION IF EXISTS public.admin_get_organization_users(uuid);

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
        COALESCE(COUNT(l.id), 0)::bigint as lead_count
    FROM profiles p
    LEFT JOIN leads l ON l.owner_id = p.id
    WHERE p.organization_id = p_org_id
    GROUP BY p.id, p.email, p.full_name, p.role, p.organization_id, p.created_at
    ORDER BY p.created_at DESC;
END;
$$;

-- Verify all functions were created
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name IN (
    'admin_delete_user', 
    'admin_verify_isolation',
    'admin_get_organization_users'
)
ORDER BY routine_name;
