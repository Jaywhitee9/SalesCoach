-- Update Center Types for Support Organizations
-- Run this in Supabase SQL Editor

-- 1. Update "שירות" and "מוקד שירות" to be 'support' centers
UPDATE organizations
SET center_type = 'support'
WHERE name IN ('שירות', 'מוקד שירות', 'Asaf Orga');

-- 2. Verify results
SELECT id, name, center_type FROM organizations WHERE name IN ('שירות', 'מוקד שירות', 'Asaf Orga');
