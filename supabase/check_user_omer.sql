SELECT p.id, p.full_name, p.email, o.name as org_name, o.center_type 
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'omer@o.c';
