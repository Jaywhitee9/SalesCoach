-- Helper function to get leads table column info

CREATE OR REPLACE FUNCTION public.get_leads_columns()
RETURNS TABLE (
    column_name TEXT,
    ordinal_position INTEGER,
    is_nullable TEXT,
    data_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        column_name::TEXT,
        ordinal_position::INTEGER,
        is_nullable::TEXT,
        data_type::TEXT
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads'
    ORDER BY ordinal_position;
$$;

GRANT EXECUTE ON FUNCTION public.get_leads_columns TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leads_columns TO service_role;
