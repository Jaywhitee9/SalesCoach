-- Update admin_get_organizations_with_stats to return center_type
DROP FUNCTION IF EXISTS public.admin_get_organizations_with_stats();

CREATE OR REPLACE FUNCTION public.admin_get_organizations_with_stats()
RETURNS TABLE (
    id uuid,
    name text,
    created_at timestamptz,
    user_count bigint,
    lead_count bigint,
    plan text,
    center_type text
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
        COALESCE(o.plan, 'free') as plan,
        COALESCE(o.center_type, 'sales') as center_type
    FROM organizations o
    LEFT JOIN profiles p ON p.organization_id = o.id
    LEFT JOIN leads l ON l.organization_id = o.id
    GROUP BY o.id, o.name, o.created_at, o.plan, o.center_type
    ORDER BY o.created_at DESC;
END;
$$;
