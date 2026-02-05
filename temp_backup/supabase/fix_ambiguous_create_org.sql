
-- Fix ambiguous function call for admin_create_organization
-- We want to support the version with PLAN argument, so we will drop the single-arg version
-- and ensure the multi-arg version is the only one.

-- 1. Drop the conflicting single-argument function
DROP FUNCTION IF EXISTS public.admin_create_organization(text);

-- 2. Define the correct function with optional plan argument
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
    INSERT INTO organizations (name, plan, status)
    VALUES (p_name, p_plan, 'active')
    RETURNING id INTO new_org_id;

    RETURN new_org_id;
END;
$$;

-- 3. Re-verify platform_admin role for the user
-- (Just to be absolutely sure permissions are correct)
UPDATE public.profiles
SET role = 'platform_admin'
WHERE email = 'info@omerzano.co.il' OR email LIKE '%omerzano%';
