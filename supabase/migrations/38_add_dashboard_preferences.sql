-- Migration: Add dashboard_preferences to profiles
-- Description: Stores user-specific dashboard layout and widget visibility

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{
  "layout": [],
  "hidden_widgets": [],
  "kpi_selection": ["calls", "conversions", "avgDuration", "aiScore"],
  "time_range_default": "week"
}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.profiles.dashboard_preferences IS 'User-specific dashboard customization: widget order, visibility, KPI selection';
