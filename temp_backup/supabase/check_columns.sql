
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('tasks', 'targets', 'user_targets')
ORDER BY 
    table_name, column_name;
