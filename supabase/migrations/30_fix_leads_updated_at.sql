-- 30_fix_leads_updated_at.sql
-- הוספת עמודת updated_at לטבלת leads

-- Add updated_at column if it doesn't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Set updated_at for existing rows that don't have it
UPDATE leads SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;

-- Create trigger to auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at_trigger ON leads;
CREATE TRIGGER leads_updated_at_trigger
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_updated_at();
