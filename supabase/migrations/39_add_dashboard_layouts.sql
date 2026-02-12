-- Migration: Create dashboard_layouts table for grid-based customizable dashboard
-- Stores per-user, per-org grid layout positions by breakpoint (lg, md, sm, xs)
-- All coordinates are stored in canonical LTR; the frontend mirrors for RTL display.

CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  layouts JSONB NOT NULL DEFAULT '{}'::jsonb,
  hidden_widgets TEXT[] DEFAULT '{}',
  kpi_selection TEXT[] DEFAULT ARRAY['calls','conversions','avgDuration','aiScore'],
  layout_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dashboard_layouts
  ADD CONSTRAINT unique_user_org_layout UNIQUE (user_id, organization_id);

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own layout"
  ON public.dashboard_layouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own layout"
  ON public.dashboard_layouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own layout"
  ON public.dashboard_layouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own layout"
  ON public.dashboard_layouts FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_dashboard_layout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dashboard_layout_timestamp
  BEFORE UPDATE ON public.dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_layout_timestamp();
