-- Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow users to view tasks belonging to their organization
CREATE POLICY "Users can view tasks in their organization"
ON public.tasks
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Allow users to insert tasks for their organization
-- Validation: Ensure the organization_id matches the user's organization
CREATE POLICY "Users can insert tasks for their organization"
ON public.tasks
FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Allow users to update tasks in their organization
CREATE POLICY "Users can update tasks in their organization"
ON public.tasks
FOR UPDATE
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
)
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Allow users to delete tasks in their organization
CREATE POLICY "Users can delete tasks in their organization"
ON public.tasks
FOR DELETE
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Ensure tasks have an organization_id on insert (if not provided, trigger handles it, but RLS requires it to be present or the check to pass)
-- Note: The existing trigger 'set_tasks_org_id' should handle setting the organization_id.
-- However, for RLS 'WITH CHECK' on INSERT to pass, the new row must satisfy the condition.
-- If the trigger fires AFTER the RLS check, we might have an issue if organization_id is null in the payload.
-- Postgres RLS on INSERT checks the *result* row after BEFORE triggers.
-- So if we have a BEFORE INSERT trigger setting organization_id, we are good.
