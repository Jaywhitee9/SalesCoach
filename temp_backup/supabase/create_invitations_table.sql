-- Create Invitations Table for Organization Onboarding
-- Run this in Supabase SQL Editor

-- 1. Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    role text DEFAULT 'rep' CHECK (role IN ('rep', 'manager', 'platform_admin')),
    token text UNIQUE NOT NULL,
    invited_by uuid REFERENCES public.profiles(id),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 2. Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organization_id);

-- 3. Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Platform admins can see all invitations
CREATE POLICY "Platform admins see all invitations" ON public.invitations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'platform_admin'
    )
);

-- Managers can see invitations for their organization
CREATE POLICY "Managers see org invitations" ON public.invitations
FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('manager', 'platform_admin')
    )
);

-- Managers can create invitations for their organization
CREATE POLICY "Managers create invitations" ON public.invitations
FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('manager', 'platform_admin')
    )
);

-- Platform admins can create invitations for any organization
CREATE POLICY "Platform admins create any invitation" ON public.invitations
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'platform_admin'
    )
);

-- Allow public token validation (for invitation acceptance)
CREATE POLICY "Public can validate tokens" ON public.invitations
FOR SELECT USING (
    token IS NOT NULL AND accepted_at IS NULL AND expires_at > now()
);

-- 5. Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 6. Verify table creation
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invitations'
ORDER BY ordinal_position;

-- Refresh PostgREST
NOTIFY pgrst, 'reload schema';
