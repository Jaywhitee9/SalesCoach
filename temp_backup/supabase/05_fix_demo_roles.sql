-- 05_fix_demo_roles.sql
-- Purpose: FORCE correct roles for all demo users to fix dashboard routing.
-- This script corrects the data in the database which might have been corrupted during earlier migrations.

BEGIN;

-- 1. Fix Rep (sara / rep) -> SALES REP DASHBOARD (role: 'rep')
UPDATE public.profiles
SET role = 'rep', 
    full_name = 'Sara Cohen',
    organization_id = (SELECT id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE email IN ('sara@salesflow.ai', 'rep@salesflow.ai');

-- 2. Fix Manager (david / manager) -> MANAGER DASHBOARD (role: 'manager')
UPDATE public.profiles
SET role = 'manager', 
    full_name = 'David Levi',
    organization_id = (SELECT id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE email IN ('manager@salesflow.ai', 'david@salesflow.ai');

-- 3. Fix Super Admin (o@o.com, admin) -> SUPER ADMIN CONSOLE (role: 'platform_admin')
UPDATE public.profiles
SET role = 'platform_admin', 
    full_name = 'System Admin',
    -- Admin doesn't belong to a specific org usually, or keeps default
    organization_id = (SELECT id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE email IN ('admin@salesflow.ai', 'o@o.com');

-- 4. Safety Net: Downgrade anyone else who accidentally got platform_admin (except o@o and admin)
UPDATE public.profiles
SET role = 'rep'
WHERE role = 'platform_admin' 
  AND email NOT IN ('admin@salesflow.ai', 'o@o.com');

COMMIT;
