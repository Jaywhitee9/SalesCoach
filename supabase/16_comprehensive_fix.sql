-- ===========================================================
-- COMPREHENSIVE DATABASE FIX - Multi-Tenant Architecture
-- Run this ONCE in Supabase SQL Editor
-- ===========================================================

-- ===========================================================
-- 1. FIX TABLE SCHEMA
-- ===========================================================

-- 1.1 Allow leads to be unassigned (for admin operations)
ALTER TABLE public.leads ALTER COLUMN owner_id DROP NOT NULL;

-- 1.2 Add organization_id to tasks table (if not exists)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 1.3 Add organization_id to calls table (if not exists)
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- ===========================================================
-- 2. BACKFILL ORGANIZATION IDS
-- ===========================================================

-- 2.1 Set organization_id for tasks based on owner's org
UPDATE public.tasks t
SET organization_id = p.organization_id
FROM public.profiles p
WHERE t.owner_id = p.id
AND t.organization_id IS NULL;

-- 2.2 Set organization_id for calls based on agent's org
UPDATE public.calls c
SET organization_id = p.organization_id
FROM public.profiles p
WHERE c.agent_id = p.id
AND c.organization_id IS NULL;

-- ===========================================================
-- 3. CREATE TRIGGERS FOR AUTO-ASSIGNING ORG ID
-- ===========================================================

-- 3.1 Tasks: Auto-set organization_id from owner
CREATE OR REPLACE FUNCTION public.set_task_org()
RETURNS TRIGGER AS $$
BEGIN
    SELECT organization_id INTO NEW.organization_id
    FROM public.profiles
    WHERE id = NEW.owner_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_created ON public.tasks;
CREATE TRIGGER on_task_created
    BEFORE INSERT ON public.tasks
    FOR EACH ROW EXECUTE PROCEDURE public.set_task_org();

-- 3.2 Calls: Auto-set organization_id from agent
CREATE OR REPLACE FUNCTION public.set_call_org()
RETURNS TRIGGER AS $$
BEGIN
    SELECT organization_id INTO NEW.organization_id
    FROM public.profiles
    WHERE id = NEW.agent_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_call_created ON public.calls;
CREATE TRIGGER on_call_created
    BEFORE INSERT ON public.calls
    FOR EACH ROW EXECUTE PROCEDURE public.set_call_org();

-- ===========================================================
-- 4. FIX RLS POLICIES - Consistent Multi-Tenant
-- ===========================================================

-- 4.1 PROFILES RLS
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers see org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin see all profiles" ON public.profiles;

-- Reps see only their own profile
CREATE POLICY "Users can see own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Managers see all profiles in their organization
CREATE POLICY "Managers see org profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS manager
            WHERE manager.id = auth.uid() 
            AND manager.role = 'manager'
            AND manager.organization_id = public.profiles.organization_id
        )
    );

-- Platform admins see all profiles
CREATE POLICY "Admin see all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS admin
            WHERE admin.id = auth.uid() 
            AND admin.role IN ('platform_admin', 'super_admin')
        )
    );

-- 4.2 LEADS RLS
DROP POLICY IF EXISTS "Reps see own leads" ON public.leads;
DROP POLICY IF EXISTS "Managers see all leads" ON public.leads;
DROP POLICY IF EXISTS "Managers see org leads" ON public.leads;
DROP POLICY IF EXISTS "Admin see all leads" ON public.leads;

-- Reps see only leads they own
CREATE POLICY "Reps see own leads" ON public.leads
    FOR SELECT USING (auth.uid() = owner_id);

-- Managers see all leads in their organization
CREATE POLICY "Managers see org leads" ON public.leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS manager
            WHERE manager.id = auth.uid() 
            AND manager.role = 'manager'
            AND manager.organization_id = public.leads.organization_id
        )
    );

-- Platform admins see all leads
CREATE POLICY "Admin see all leads" ON public.leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS admin
            WHERE admin.id = auth.uid() 
            AND admin.role IN ('platform_admin', 'super_admin')
        )
    );

-- Leads insert/update/delete policies for reps
CREATE POLICY "Reps manage own leads" ON public.leads
    FOR ALL USING (auth.uid() = owner_id);

-- 4.3 TASKS RLS
DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers see org tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin see all tasks" ON public.tasks;

-- Reps see only their own tasks
CREATE POLICY "Users manage own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = owner_id);

-- Managers see all tasks in their organization
CREATE POLICY "Managers see org tasks" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS manager
            WHERE manager.id = auth.uid() 
            AND manager.role = 'manager'
            AND manager.organization_id = public.tasks.organization_id
        )
    );

-- Platform admins see all tasks
CREATE POLICY "Admin see all tasks" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS admin
            WHERE admin.id = auth.uid() 
            AND admin.role IN ('platform_admin', 'super_admin')
        )
    );

-- 4.4 CALLS RLS
DROP POLICY IF EXISTS "Users see own calls" ON public.calls;
DROP POLICY IF EXISTS "Managers see all calls" ON public.calls;
DROP POLICY IF EXISTS "Managers see org calls" ON public.calls;
DROP POLICY IF EXISTS "Admin see all calls" ON public.calls;

-- Reps see only their own calls
CREATE POLICY "Users see own calls" ON public.calls
    FOR SELECT USING (auth.uid() = agent_id);

-- Managers see all calls in their organization
CREATE POLICY "Managers see org calls" ON public.calls
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS manager
            WHERE manager.id = auth.uid() 
            AND manager.role = 'manager'
            AND manager.organization_id = public.calls.organization_id
        )
    );

-- Platform admins see all calls
CREATE POLICY "Admin see all calls" ON public.calls
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS admin
            WHERE admin.id = auth.uid() 
            AND admin.role IN ('platform_admin', 'super_admin')
        )
    );

-- ===========================================================
-- 5. FIX ADMIN FUNCTIONS
-- ===========================================================

-- 5.1 Fix enforce_organization_id trigger to allow admin mode
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
    
    IF is_admin_mode = true THEN
        RETURN NEW;
    END IF;

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

-- 5.2 Fix admin_delete_user to use correct column name (owner_id not user_id)
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
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    SELECT email INTO user_email FROM public.profiles WHERE id = p_user_id;
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Enable admin mode to bypass triggers
    PERFORM set_config('app.admin_mode', 'true', true);

    -- Handle leads
    CASE p_lead_action
        WHEN 'unassign' THEN
            UPDATE public.leads SET owner_id = NULL WHERE owner_id = p_user_id;
        WHEN 'delete' THEN
            DELETE FROM public.leads WHERE owner_id = p_user_id;
        WHEN 'reassign' THEN
            IF p_reassign_to IS NULL THEN
                RAISE EXCEPTION 'reassign_to user ID required';
            END IF;
            UPDATE public.leads SET owner_id = p_reassign_to WHERE owner_id = p_user_id;
    END CASE;
    GET DIAGNOSTICS affected_leads = ROW_COUNT;

    -- Delete tasks (using owner_id, NOT user_id!)
    DELETE FROM public.tasks WHERE owner_id = p_user_id;
    
    -- Delete user profile
    DELETE FROM public.profiles WHERE id = p_user_id;
    
    -- Disable admin mode
    PERFORM set_config('app.admin_mode', 'false', true);
    
    -- Audit log
    PERFORM public.log_admin_action('delete_user', 'user', p_user_id, 
        jsonb_build_object('email', user_email, 'lead_action', p_lead_action, 'leads_affected', affected_leads));
    
    RETURN jsonb_build_object('success', true, 'deleted_user', user_email, 'leads_affected', affected_leads);
END;
$$;

-- ===========================================================
-- 6. VERIFY SETUP
-- ===========================================================

-- Check table structure
SELECT 
    'profiles' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('id', 'role', 'organization_id')

UNION ALL

SELECT 
    'leads' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'leads'
AND column_name IN ('id', 'owner_id', 'organization_id')

UNION ALL

SELECT 
    'tasks' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'tasks'
AND column_name IN ('id', 'owner_id', 'organization_id');
