-- Quick diagnostic query
-- Run this in Supabase SQL Editor

SELECT 
    id,
    full_name,
    email,
    role,
    organization_id
FROM profiles
ORDER BY created_at DESC
LIMIT 10;
