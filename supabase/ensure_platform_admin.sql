-- Ensure Super Admin Role for main admin user
-- Run this in Supabase SQL Editor

-- 1. First, find the user by email
SELECT id, email, role, organization_id 
FROM public.profiles 
WHERE email ILIKE '%omerzano%' OR email ILIKE '%info@%';

-- 2. Update user to platform_admin role
UPDATE public.profiles 
SET role = 'platform_admin'
WHERE email = 'info@omerzano.co.il'
   OR email ILIKE '%omerzano%';

-- 3. Verify the update
SELECT id, email, role, full_name
FROM public.profiles 
WHERE role IN ('platform_admin', 'super_admin');

-- 4. Show result
SELECT 'User role updated to platform_admin' AS message;
