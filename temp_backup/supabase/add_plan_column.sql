
-- 1. Add plan column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';

-- 2. Update admin_get_organizations_with_stats to return plan
DROP FUNCTION IF EXISTS public.admin_get_organizations_with_stats();

CREATE OR REPLACE FUNCTION public.admin_get_organizations_with_stats()
RETURNS TABLE (
    id uuid,
    name text,
    created_at timestamptz,
    user_count bigint,
    lead_count bigint,
    plan text -- Added plan
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.created_at,
        COALESCE(COUNT(DISTINCT p.id), 0)::bigint as user_count,
        COALESCE(COUNT(DISTINCT l.id), 0)::bigint as lead_count,
        COALESCE(o.plan, 'free') as plan
    FROM organizations o
    LEFT JOIN profiles p ON p.organization_id = o.id
    LEFT JOIN leads l ON l.organization_id = o.id
    GROUP BY o.id, o.name, o.created_at, o.plan
    ORDER BY o.created_at DESC;
END;
$$;

-- 3. Update admin_create_organization to accept plan
CREATE OR REPLACE FUNCTION public.admin_create_organization(
    p_name text,
    p_plan text DEFAULT 'free'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id uuid;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    INSERT INTO organizations (name, plan)
    VALUES (p_name, p_plan)
    RETURNING id INTO new_org_id;
    
    RETURN new_org_id;
END;
$$;

-- 4. Function to update organization plan
CREATE OR REPLACE FUNCTION public.admin_update_organization_plan(
    p_org_id uuid,
    p_plan text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied: Platform admin required';
    END IF;

    UPDATE organizations
    SET plan = p_plan
    WHERE id = p_org_id;
    
    RETURN FOUND;
END;
$$;
