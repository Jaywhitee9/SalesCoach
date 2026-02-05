
-- Migration: Create organization_settings table
-- Handles missing table from previous migrations

CREATE TABLE IF NOT EXISTS public.organization_settings (
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    twilio_phone_number text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (organization_id)
);

-- RLS Policies
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Platform Admins can do anything
CREATE POLICY "Platform Admins can do everything on org settings"
    ON public.organization_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('platform_admin', 'super_admin')
        )
    );

-- Policy: Users can view their own org settings
CREATE POLICY "Users can view their own org settings"
    ON public.organization_settings
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles
            WHERE profiles.id = auth.uid()
        )
    );

-- Policy: Organization Managers can update their own org settings
CREATE POLICY "Managers can update their own org settings"
    ON public.organization_settings
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'manager'
        )
    );
