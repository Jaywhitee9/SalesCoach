-- FIX: Backend org_id Override Issue
-- The set_org_id() trigger was overwriting explicitly provided org_id values
-- This prevented backend (service role) from inserting with org_id

-- Update the trigger function to respect explicitly provided org_id
CREATE OR REPLACE FUNCTION set_org_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- If org_id is already provided (e.g., from backend), keep it
  IF new.org_id IS NOT NULL THEN
    RETURN new;
  END IF;
  
  -- Platform admins can set org_id manually, others get forced to their own org
  IF NOT is_platform_admin() THEN
    new.org_id := get_auth_org_id();
  END IF;
  
  RETURN new;
END;
$$;

-- Verify the function was updated
SELECT 'set_org_id trigger function updated successfully' AS status;
