-- Unify all profiles to one organization for team chat to work
-- Run this in Supabase SQL Editor

-- First, let's see how many orgs we have
SELECT id, name FROM organizations;

-- Move all profiles to the first organization (with most users)
-- Organization: 2633560c-d5f0-4eee-bd34-6b1c5b16faa3

UPDATE public.profiles
SET organization_id = '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
WHERE organization_id != '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
   OR organization_id IS NULL;

-- Also update leads to same org
UPDATE public.leads
SET org_id = '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
WHERE org_id != '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
   OR org_id IS NULL;

-- Update messages to same org
UPDATE public.messages
SET organization_id = '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
WHERE organization_id != '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
   OR organization_id IS NULL;

-- Verify all profiles are now in the same org
SELECT id, full_name, email, role, organization_id 
FROM profiles 
ORDER BY full_name;
