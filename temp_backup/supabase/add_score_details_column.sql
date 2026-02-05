
-- Add score_details column to leads table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'leads'
        AND column_name = 'score_details'
    ) THEN
        ALTER TABLE leads
        ADD COLUMN score_details JSONB DEFAULT NULL;
    END IF;
END $$;
