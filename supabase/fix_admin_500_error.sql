-- FIX: Add center_type column and update RPC to fix 500 Error
-- Run this entire script in Supabase SQL Editor

-- 1. Ensure the center_type type exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'center_type') THEN
    CREATE TYPE center_type AS ENUM ('sales', 'support');
  END IF;
END $$;

-- 2. Add the column to organizations if it doesn't exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS center_type center_type DEFAULT 'sales';

-- 3. Update existing records
UPDATE organizations 
SET center_type = 'sales' 
WHERE center_type IS NULL;

-- 4. Drop and Recreate the RPC function with the correct return type
DROP FUNCTION IF EXISTS public.admin_get_organizations_with_stats();

CREATE OR REPLACE FUNCTION public.admin_get_organizations_with_stats()
RETURNS TABLE (
    id uuid,
    name text,
    created_at timestamptz,
    user_count bigint,
    lead_count bigint,
    plan text,
    center_type text -- Added this field
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
        COALESCE(CAST(o.center_type AS text), 'sales') as center_type
    FROM organizations o
    LEFT JOIN profiles p ON p.organization_id = o.id
    LEFT JOIN leads l ON l.organization_id = o.id
    GROUP BY o.id, o.name, o.created_at, o.plan, o.center_type
    ORDER BY o.created_at DESC;
END;
$$;
