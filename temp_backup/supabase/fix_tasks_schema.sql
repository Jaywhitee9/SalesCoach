-- Fix tasks table schema to match expected columns
-- Run this in Supabase SQL Editor

-- Add missing columns to tasks table (if they don't exist)
DO $$
BEGIN
    -- Add status column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN
        ALTER TABLE public.tasks ADD COLUMN status text DEFAULT 'open' CHECK (status IN ('open', 'completed', 'overdue'));
    END IF;

    -- Add type column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'type') THEN
        ALTER TABLE public.tasks ADD COLUMN type text DEFAULT 'admin' CHECK (type IN ('call', 'email', 'proposal', 'whatsapp', 'admin', 'meeting', 'file'));
    END IF;

    -- Add priority column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority') THEN
        ALTER TABLE public.tasks ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));
    END IF;

    -- Add due_date column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_date') THEN
        ALTER TABLE public.tasks ADD COLUMN due_date date;
    END IF;

    -- Add due_time column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_time') THEN
        ALTER TABLE public.tasks ADD COLUMN due_time time;
    END IF;

    -- Add ai_reason column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'ai_reason') THEN
        ALTER TABLE public.tasks ADD COLUMN ai_reason text;
    END IF;

    -- Add notes column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'notes') THEN
        ALTER TABLE public.tasks ADD COLUMN notes text;
    END IF;

    -- Add title column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'title') THEN
        ALTER TABLE public.tasks ADD COLUMN title text;
    END IF;

    -- Add organization_id column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'organization_id') THEN
        ALTER TABLE public.tasks ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
    END IF;
END $$;

-- Refresh the PostgREST cache after schema changes
NOTIFY pgrst, 'reload schema';

-- Show current tasks table columns for verification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;
