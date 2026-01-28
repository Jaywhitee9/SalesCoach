-- Migration: Add Lead Distribution Settings
-- Run this in Supabase SQL Editor

-- Add columns to organization_settings table
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS auto_distribute boolean DEFAULT false;

ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS distribution_method text DEFAULT 'round_robin';

ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS last_assigned_index integer DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN public.organization_settings.auto_distribute IS 'Enable automatic lead distribution to sales reps';
COMMENT ON COLUMN public.organization_settings.distribution_method IS 'round_robin = cycle through reps equally';
COMMENT ON COLUMN public.organization_settings.last_assigned_index IS 'Index of last assigned rep in round robin rotation';
