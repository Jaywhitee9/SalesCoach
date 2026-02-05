-- Check profiles table for organization_id values
SELECT id, full_name, email, role, organization_id 
FROM profiles
ORDER BY full_name
LIMIT 20;
