-- Quick fix: Create a manager user in the same organization as Omer
-- Run this in Supabase SQL Editor

-- First, find the organization ID for Omer
DO $$
DECLARE
    v_org_id UUID;
    v_manager_id UUID;
BEGIN
    -- Get Omer's org
    SELECT organization_id INTO v_org_id 
    FROM profiles 
    WHERE name ILIKE '%עומר%' OR name ILIKE '%omer%'
    LIMIT 1;

    IF v_org_id IS NULL THEN
        -- Fallback: get the first org
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    RAISE NOTICE 'Organization ID: %', v_org_id;

    -- Check if manager exists
    SELECT id INTO v_manager_id 
    FROM profiles 
    WHERE organization_id = v_org_id 
    AND role IN ('sales_manager', 'manager', 'admin')
    LIMIT 1;

    IF v_manager_id IS NOT NULL THEN
        RAISE NOTICE 'Manager already exists: %', v_manager_id;
    ELSE
        -- Update an existing user to be manager, or just note that none exists
        RAISE NOTICE 'No manager found in this org. You may need to create one via Auth.';
    END IF;
END $$;

-- List all users in the system to see who exists:
SELECT id, name, email, role, organization_id 
FROM profiles 
ORDER BY created_at DESC;

-- If you want to promote an existing user to manager, run:
-- UPDATE profiles SET role = 'sales_manager' WHERE id = '<USER_ID>';
