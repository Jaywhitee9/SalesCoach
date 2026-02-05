-- Add multi-tenancy to messages table for team chat
-- Run this in Supabase SQL Editor

-- 1. Add organization_id column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 2. Backfill existing messages with sender's organization
UPDATE public.messages m
SET organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = m.sender_id
)
WHERE m.organization_id IS NULL;

-- 3. Make organization_id NOT NULL after backfill (optional, can be enforced later)
-- ALTER TABLE public.messages ALTER COLUMN organization_id SET NOT NULL;

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_organization 
ON public.messages(organization_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient 
ON public.messages(sender_id, recipient_id);

-- 5. Drop existing RLS policies
DROP POLICY IF EXISTS "Users can see their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- 6. Create new RLS policies with organization check

-- Policy: Users can see messages within their organization
CREATE POLICY "Users see org messages" ON public.messages
FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (auth.uid() = sender_id OR auth.uid() = recipient_id)
);

-- Policy: Users can insert messages only to users in the same organization
CREATE POLICY "Users send org messages" ON public.messages
FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND recipient_id IN (
        SELECT id FROM public.profiles 
        WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- Policy: Allow update (mark as read) for recipient
CREATE POLICY "Users update own messages" ON public.messages
FOR UPDATE USING (
    auth.uid() = recipient_id
    AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- 7. Verify the schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 8. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
