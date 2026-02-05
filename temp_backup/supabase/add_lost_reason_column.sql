-- Add lost_reason column for tracking why leads were marked as not relevant
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lost_reason text;

-- Add comment for documentation
COMMENT ON COLUMN public.leads.lost_reason IS 'Reason provided when lead is marked as "not relevant" (lost)';
