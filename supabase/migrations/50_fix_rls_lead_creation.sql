-- 50_fix_rls_lead_creation.sql
-- Fix RLS policy to allow reps to create leads for others in their org
-- The current policy requires owner_id = auth.uid() which prevents:
-- 1. Creating unassigned leads (manual distribution mode)
-- 2. Auto-assigning to other reps
-- 3. Managers creating leads for their reps

BEGIN;

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Agents can create leads for their org" ON public.leads;

-- Create a more permissive policy:
-- Reps can create leads for their organization
-- They can assign to themselves OR leave unassigned OR assign to others in same org
CREATE POLICY "Users can create leads for their org" ON public.leads
  FOR INSERT
  WITH CHECK (
    -- Must be for the user's organization
    organization_id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
    AND (
      -- Can create unassigned leads (owner_id IS NULL)
      owner_id IS NULL
      OR
      -- Can assign to themselves
      owner_id = auth.uid()
      OR
      -- Can assign to others in same org (for managers or auto-distribution)
      owner_id IN (
        SELECT id
        FROM public.profiles
        WHERE organization_id = (
          SELECT organization_id
          FROM public.profiles
          WHERE id = auth.uid()
        )
      )
    )
  );

COMMIT;

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'RLS policy updated: Reps can now create leads for their org';
  RAISE NOTICE 'Allowed: unassigned leads, self-assigned, or assign to org members';
END $$;
