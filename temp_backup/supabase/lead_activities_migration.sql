-- LEAD ACTIVITIES & CALL WRAP-UP SCHEMA
-- Run this in Supabase SQL Editor

-- 1. Create lead_activities table
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    org_id uuid REFERENCES public.organizations(id) NOT NULL,
    type text NOT NULL CHECK (type IN (
        'call_start', 'call_end', 'note', 'follow_up', 
        'deal_closed', 'not_relevant', 'summary_ready', 'status_change'
    )),
    data jsonb DEFAULT '{}'::jsonb,
    call_session_id text, -- Links to CallSid for call-related activities
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_org_id ON public.lead_activities(org_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON public.lead_activities(type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_call_session ON public.lead_activities(call_session_id);

-- 3. Add columns to leads table for follow-up support
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_at timestamp with time zone;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_notes text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_call_summary jsonb;

-- 4. RLS Policies for lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access Own Org Activities" ON public.lead_activities
    FOR ALL USING (org_id = get_auth_org_id() OR is_platform_admin());

-- 5. Trigger to update lead's last_activity_at
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.leads 
    SET last_activity_at = NEW.created_at
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_lead_activity ON public.lead_activities;
CREATE TRIGGER trigger_update_lead_activity
    AFTER INSERT ON public.lead_activities
    FOR EACH ROW EXECUTE FUNCTION update_lead_last_activity();

-- 6. Add call_summary_json to calls table
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS summary_json jsonb;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS summary_status text DEFAULT 'pending' 
    CHECK (summary_status IN ('pending', 'generating', 'ready', 'failed'));

-- Verify
SELECT 'lead_activities schema created successfully' AS status;
