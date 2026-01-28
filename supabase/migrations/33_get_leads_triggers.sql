-- Helper function to get triggers on leads table

CREATE OR REPLACE FUNCTION public.get_leads_triggers()
RETURNS TABLE (
    trigger_name TEXT,
    event_manipulation TEXT,
    action_timing TEXT,
    action_statement TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        trigger_name::TEXT,
        event_manipulation::TEXT,
        action_timing::TEXT,
        action_statement::TEXT
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' AND event_object_table = 'leads';
$$;

GRANT EXECUTE ON FUNCTION public.get_leads_triggers TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leads_triggers TO service_role;
