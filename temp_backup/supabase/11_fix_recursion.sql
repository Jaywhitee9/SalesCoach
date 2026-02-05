-- Fix Infinite Recursion in Profiles RLS
-- The error "infinite recursion detected in policy" happens because the policy queries the table itself to check the user's role.
-- We must avoid circular dependency.

-- Helper function to get current user's role and org WITHOUT triggering RLS on profiles table
-- We use SECURITY DEFINER to bypass RLS for this specific lookup.
CREATE OR REPLACE FUNCTION public.get_my_claim_profile()
RETURNS TABLE (role text, organization_id uuid) 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT p.role, p.organization_id FROM public.profiles p WHERE p.id = auth.uid();
END;
$$;

-- Drop problematic policies
DROP POLICY IF EXISTS "Managers see org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can see all profiles" ON public.profiles;

-- Re-create Policy using the Security Definer function (Breaks Recursion)
CREATE POLICY "Managers see org profiles" ON public.profiles
  FOR SELECT USING (
    (select role from public.get_my_claim_profile()) = 'manager'
    AND
    organization_id = (select organization_id from public.get_my_claim_profile())
  );

-- Ensure basic self-access still exists (usually created in 03_enforce.sql, but ensuring here)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Super Admin Policy (Optional, if needed)
CREATE POLICY "Super Admins see all" ON public.profiles
  FOR SELECT USING (
    (select role from public.get_my_claim_profile()) = 'platform_admin'
    OR 
    (select role from public.get_my_claim_profile()) = 'super_admin'
  );
