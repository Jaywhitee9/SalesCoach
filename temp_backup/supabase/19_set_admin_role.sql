-- ===========================================================
-- FIX: Set admin user's role to platform_admin
-- ===========================================================

-- First, check what roles exist
SELECT id, email, role FROM public.profiles ORDER BY role;

-- Update the admin user to have platform_admin role
-- Option 1: Update by email
UPDATE public.profiles 
SET role = 'platform_admin' 
WHERE email LIKE '%admin%' OR email LIKE '%omer%';

-- Option 2: Update by specific user ID (the one you're logging in with)
-- UPDATE public.profiles SET role = 'platform_admin' WHERE id = 'YOUR-USER-ID-HERE';

-- Verify the update
SELECT id, email, role FROM public.profiles WHERE role = 'platform_admin';
