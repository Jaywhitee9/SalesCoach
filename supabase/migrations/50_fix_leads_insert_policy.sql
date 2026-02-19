-- Create a specific INSERT policy for authenticated users (Reps and Admins) to create leads.
-- Reps should be able to create leads if they assign it to themselves OR leave it unassigned (if logic allows),
-- but primarily they need INSERT access to the table.
-- The policy checks if the user belongs to the organization they are inserting leads for.

BEGIN;

-- Drop existing restricted insert policy if it exists (to avoid conflict or duplicate)
DROP POLICY IF EXISTS "Enable insert for authenticated users based on organization" ON "public"."leads";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."leads";

-- Re-create a robust INSERT policy
CREATE POLICY "Allow authenticated insert" ON "public"."leads"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles
    WHERE id = auth.uid() AND organization_id = leads.organization_id
  )
);

COMMIT;
