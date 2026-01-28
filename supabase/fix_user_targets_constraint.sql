-- Add unique constraint to user_targets table to support UPSERT operations
-- The upsert requires a unique constraint on the columns specified in onConflict

-- First, remove any duplicates if they exist (optional, but good practice to ensure index creation succeeds)
DELETE FROM user_targets a USING user_targets b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.organization_id = b.organization_id
  AND a.target_type = b.target_type
  AND a.period = b.period;

-- Drop existing constraint if it exists (to start fresh)
ALTER TABLE user_targets DROP CONSTRAINT IF EXISTS user_targets_unique_constraint;

-- Add the unique constraint
ALTER TABLE user_targets
ADD CONSTRAINT user_targets_unique_constraint 
UNIQUE (user_id, organization_id, target_type, period);

-- Verify the constraint works by allowing the frontend upsert logic to succeed
