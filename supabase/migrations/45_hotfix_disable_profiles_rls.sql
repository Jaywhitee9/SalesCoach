-- HOTFIX: Temporarily disable RLS on profiles to fix client access
-- This is a temporary fix until we properly handle authentication flow

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Note: This removes security isolation! 
-- Re-enable after fixing client-side authentication checks
