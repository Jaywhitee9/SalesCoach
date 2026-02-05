-- 1. Create user_targets table
DROP TABLE IF EXISTS public.user_targets;

CREATE TABLE public.user_targets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) NOT NULL,
    target_type text NOT NULL, -- 'calls', 'meetings', 'leads', 'deals'
    target_value integer DEFAULT 0,
    period text NOT NULL DEFAULT 'month', -- 'day', 'week', 'month'
    start_date date, -- Optional start date for the target period
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Add RLS for user_targets
ALTER TABLE public.user_targets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own targets
CREATE POLICY "Users view own targets" ON public.user_targets
    FOR SELECT USING (user_id = auth.uid());

-- Policy: Managers can view/edit targets for their organization
CREATE POLICY "Managers manage org targets" ON public.user_targets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('manager', 'platform_admin', 'super_admin')
            AND organization_id = user_targets.organization_id
        )
    );

-- 3. Add columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'admin', -- 'call', 'email', 'meeting', 'proposal', 'whatsapp'
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium'; -- 'high', 'medium', 'low'
