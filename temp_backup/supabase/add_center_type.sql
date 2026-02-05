-- Sales Coach: Add center_type field to organizations
-- This enables the system to support both Sales and Support centers

-- 1. Add center_type enum type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'center_type') THEN
    CREATE TYPE center_type AS ENUM ('sales', 'support');
  END IF;
END $$;

-- 2. Add center_type column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS center_type center_type DEFAULT 'sales';

-- 3. Add comment for documentation
COMMENT ON COLUMN organizations.center_type IS 'Type of call center: sales (default) or support. Affects dashboard and KPIs shown.';

-- 4. Update existing organizations to be sales (if not already set)
UPDATE organizations 
SET center_type = 'sales' 
WHERE center_type IS NULL;

-- 5. Make column NOT NULL after backfill
ALTER TABLE organizations 
ALTER COLUMN center_type SET NOT NULL;

-- Verification query (run to check)
-- SELECT id, name, center_type FROM organizations;
