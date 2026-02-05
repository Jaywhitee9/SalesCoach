-- Fix Call ID schema issue
-- Problem: Twilio CallSid ("CA...") is not a valid UUID
-- Solution: Add call_sid TEXT column, keep id as UUID

-- 1. Add call_sid column if not exists
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS call_sid TEXT;

-- 2. Create index on call_sid for lookups
CREATE INDEX IF NOT EXISTS idx_calls_call_sid ON public.calls(call_sid);

-- 3. Make call_sid unique (for upsert support)
ALTER TABLE public.calls 
ADD CONSTRAINT unique_call_sid UNIQUE (call_sid);

-- 4. Verify
SELECT 'call_sid column added successfully' AS status;
