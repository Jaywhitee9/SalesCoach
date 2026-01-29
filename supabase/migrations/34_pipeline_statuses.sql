-- Add pipeline_statuses column to organization_settings
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS pipeline_statuses jsonb DEFAULT '[
  {"id": "New", "label": "ליד חדש", "color": "#3B82F6"},
  {"id": "Contacted", "label": "נוצר קשר", "color": "#F59E0B"},
  {"id": "Qualified", "label": "ליד איכותי", "color": "#8B5CF6"},
  {"id": "Proposal", "label": "הצעת מחיר", "color": "#10B981"},
  {"id": "Negotiation", "label": "משא ומתן", "color": "#EC4899"},
  {"id": "Won", "label": "סגירה - זכייה", "color": "#059669"},
  {"id": "Lost", "label": "סגירה - הפסד", "color": "#EF4444"}
]'::jsonb;

-- Add description
COMMENT ON COLUMN public.organization_settings.pipeline_statuses IS 'Customizable pipeline statuses for leads';

-- Also create a function to clean up old statuses (optional helper)
CREATE OR REPLACE FUNCTION normalize_lead_statuses(org_id uuid)
RETURNS void AS $$
BEGIN
  -- Update 'Qualified' -> 'ליד איכותי' mapping example if needed,
  -- but usually we just want to ensure the UI uses the mapped label.
  -- For now, we will leave the raw data as is but the UI will mapped it.
  NULL;
END;
$$ LANGUAGE plpgsql;
