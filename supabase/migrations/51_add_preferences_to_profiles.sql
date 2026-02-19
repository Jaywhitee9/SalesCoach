-- Add preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"darkMode": false, "leadNotifications": true}';

-- Update the view/RLS if necessary (usually not needed for just adding a column if RLS is row-based)
