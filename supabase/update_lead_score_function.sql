-- Create a function for updating lead score that bypasses org trigger
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.update_lead_score(
    p_lead_id uuid,
    p_score integer,
    p_score_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Enable admin mode to bypass org trigger
    PERFORM set_config('app.admin_mode', 'true', true);
    
    UPDATE public.leads 
    SET score = p_score, 
        score_details = p_score_details
    WHERE id = p_lead_id;
    
    -- Disable admin mode
    PERFORM set_config('app.admin_mode', 'false', true);
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.update_lead_score(uuid, integer, jsonb) TO service_role;
