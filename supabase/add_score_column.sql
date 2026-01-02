
-- Add score column to leads table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'score') THEN
        ALTER TABLE public.leads ADD COLUMN score INTEGER DEFAULT 0;
    END IF;
END $$;
