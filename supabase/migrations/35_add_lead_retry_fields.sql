-- Migration: Add Lead Retry Mechanism Support
-- Adds necessary columns to 'leads' table and ensures 'campaigns' table exists

-- 1. Create Campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL, 
  name text NOT NULL,
  source_filter text,
  description text,
  max_attempts integer DEFAULT 5,
  retry_interval_minutes integer DEFAULT 30,
  retry_on_no_answer boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
ADD COLUMN IF NOT EXISTS call_disposition text,
ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id);

-- 3. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_next_retry_at ON public.leads(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);

-- 4. Comments
COMMENT ON COLUMN public.leads.attempt_count IS 'Number of calls made to this lead';
COMMENT ON COLUMN public.leads.next_retry_at IS 'When to retry calling this lead';
