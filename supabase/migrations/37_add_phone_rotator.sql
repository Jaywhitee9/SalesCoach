-- Migration: Add phone_rotator_config to profiles
-- Description: Stores multi-number configuration and spam stats for agents

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_rotator_config JSONB DEFAULT '{
  "numbers": [],
  "active_index": 0,
  "auto_rotate": true
}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.profiles.phone_rotator_config IS 'Stores multiple caller IDs and spam detection stats per agent';
