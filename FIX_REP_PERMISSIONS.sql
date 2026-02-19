-- CRITICAL FIX: Allow Reps to INSERT leads
-- Run this in your Supabase SQL Editor

BEGIN;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Enable insert for authenticated users based on organization" ON "public"."leads";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."leads";
DROP POLICY IF EXISTS "Users can insert leads for their organization" ON "public"."leads";

-- Create the correct INSERT policy
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

-- Verify the policy was created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'leads' AND cmd = 'INSERT';
