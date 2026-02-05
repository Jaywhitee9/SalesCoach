-- Add organization_id to calls and tasks if missing
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Backfill organization_id for calls (from agent_id)
UPDATE public.calls c
SET organization_id = p.organization_id
FROM public.profiles p
WHERE c.agent_id = p.id
AND c.organization_id IS NULL;

-- Backfill organization_id for tasks (from owner_id)
UPDATE public.tasks t
SET organization_id = p.organization_id
FROM public.profiles p
WHERE t.owner_id = p.id
AND t.organization_id IS NULL;

-- Enable RLS updates/policies if needed (Assuming comprehensive fix covered this, but just in case)
-- Ensure calls RLS policy allows access by organization_id
DROP POLICY IF EXISTS "Managers view org calls" ON public.calls;
CREATE POLICY "Managers view org calls" ON public.calls
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('manager', 'platform_admin', 'super_admin')
            AND organization_id = calls.organization_id
        )
    );
