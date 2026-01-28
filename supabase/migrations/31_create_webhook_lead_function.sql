-- Migration: Create RPC function for webhook lead insertion
-- This bypasses PostgREST schema cache issues

CREATE OR REPLACE FUNCTION public.create_webhook_lead(
    p_org_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_email TEXT DEFAULT '',
    p_company TEXT DEFAULT '',
    p_source TEXT DEFAULT 'Webhook',
    p_status TEXT DEFAULT 'New',
    p_priority TEXT DEFAULT 'Hot',
    p_value NUMERIC DEFAULT 0,
    p_tags TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    source TEXT,
    organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO leads (
        org_id,
        organization_id,
        name,
        phone,
        email,
        company,
        source,
        status,
        priority,
        value,
        tags
    ) VALUES (
        p_org_id,
        p_org_id,
        p_name,
        p_phone,
        p_email,
        p_company,
        p_source,
        p_status,
        p_priority,
        p_value,
        p_tags
    ) RETURNING leads.id INTO new_id;
    
    RETURN QUERY SELECT 
        new_id,
        p_name,
        p_phone,
        p_source,
        p_org_id;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.create_webhook_lead TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_webhook_lead TO service_role;
