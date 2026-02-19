-- Enable Realtime for the leads table
-- This allows clients to subscribe to changes (INSERT, UPDATE, DELETE) on this table.

BEGIN;

-- Check if the publication exists (it usually does by default in Supabase)
-- If not, create it. If it does, add the table.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE leads;
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  END IF;
END
$$;

COMMIT;
