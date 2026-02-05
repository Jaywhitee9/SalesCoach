-- Migration: Add Hybrid Phone Number Configuration
-- Adds 'twilio_phone_number' to organization_settings (Business Line)
-- Adds 'twilio_phone_number' to profiles (Agent Private Line)

-- 1. Add column to organization_settings
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS twilio_phone_number text;

COMMENT ON COLUMN public.organization_settings.twilio_phone_number IS 'Main business phone number (E.164 format)';

-- 2. Add column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS twilio_phone_number text;

COMMENT ON COLUMN public.profiles.twilio_phone_number IS 'Private agent phone number override (E.164 format)';
