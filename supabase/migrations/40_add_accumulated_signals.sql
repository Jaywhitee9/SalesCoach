-- Add accumulated_signals column to calls table
-- This stores the accumulated pains, objections, gaps, and vision identified during the call
-- Format: { pains: [], objections: [], gaps: [], vision: [] }

ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS accumulated_signals JSONB DEFAULT '{}'::jsonb;

-- Add index for faster queries on signals
CREATE INDEX IF NOT EXISTS idx_calls_accumulated_signals ON calls USING GIN (accumulated_signals);

-- Add comment
COMMENT ON COLUMN calls.accumulated_signals IS 'Accumulated customer signals (pains, objections, gaps, vision) identified during the call by AI coach';
