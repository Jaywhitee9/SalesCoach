-- =====================================================
-- COMPREHENSIVE TEAM CHAT AND RLS FIX
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: Fix Messages Table for Team Chat
-- =====================================================

-- 1.1 Add team chat columns if missing
DO $$ 
BEGIN
    -- sender_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
        ALTER TABLE messages ADD COLUMN sender_id UUID REFERENCES profiles(id);
    END IF;
    -- recipient_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_id') THEN
        ALTER TABLE messages ADD COLUMN recipient_id UUID REFERENCES profiles(id);
    END IF;
    -- content
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') THEN
        ALTER TABLE messages ADD COLUMN content TEXT;
    END IF;
    -- organization_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'organization_id') THEN
        ALTER TABLE messages ADD COLUMN organization_id UUID REFERENCES organizations(id);
    END IF;
    -- is_read
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read') THEN
        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
    -- context_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'context_type') THEN
        ALTER TABLE messages ADD COLUMN context_type TEXT;
    END IF;
END $$;

-- 1.2 Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);

-- 1.3 Drop old RLS policies
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users see org messages" ON messages;
DROP POLICY IF EXISTS "Users send org messages" ON messages;
DROP POLICY IF EXISTS "Users update own messages" ON messages;

-- 1.4 Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 1.5 Create new RLS policies for team chat
CREATE POLICY "team_chat_select" ON messages
FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
);

CREATE POLICY "team_chat_insert" ON messages
FOR INSERT WITH CHECK (
    auth.uid() = sender_id
);

CREATE POLICY "team_chat_update" ON messages
FOR UPDATE USING (
    auth.uid() = recipient_id
);

-- =====================================================
-- PART 2: Fix Profiles RLS for Team View
-- =====================================================

-- 2.1 Drop conflicting policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view org members" ON profiles;
DROP POLICY IF EXISTS "team_view_profiles" ON profiles;

-- 2.2 Create policy: Users can view all profiles in their organization
CREATE POLICY "view_org_profiles" ON profiles
FOR SELECT USING (
    -- User can always see their own profile
    auth.uid() = id
    OR
    -- User can see other profiles in their organization
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- =====================================================
-- PART 3: Fix Leads RLS - Rep sees only assigned leads
-- =====================================================

-- 3.1 Helper function to check user role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3.2 Drop old leads policies
DROP POLICY IF EXISTS "leads_select_policy" ON leads;
DROP POLICY IF EXISTS "leads_insert_policy" ON leads;
DROP POLICY IF EXISTS "leads_update_policy" ON leads;
DROP POLICY IF EXISTS "leads_delete_policy" ON leads;
DROP POLICY IF EXISTS "Users can view leads" ON leads;
DROP POLICY IF EXISTS "Managers see all org leads" ON leads;
DROP POLICY IF EXISTS "Reps see assigned leads" ON leads;

-- 3.3 Create new leads RLS policies

-- SELECT: Managers see all org leads, Reps see only assigned
CREATE POLICY "leads_select" ON leads
FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
        -- Managers/Admins see all
        public.get_my_role() IN ('admin', 'sales_manager', 'manager', 'platform_admin')
        OR
        -- Reps see only their assigned leads OR unassigned leads
        owner_id = auth.uid()
        OR
        owner_id IS NULL
    )
);

-- INSERT: Anyone in org can create leads
CREATE POLICY "leads_insert" ON leads
FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- UPDATE: Managers can update all, Reps can update their own
CREATE POLICY "leads_update" ON leads
FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
        public.get_my_role() IN ('admin', 'sales_manager', 'manager', 'platform_admin')
        OR
        owner_id = auth.uid()
    )
);

-- DELETE: Only managers can delete
CREATE POLICY "leads_delete" ON leads
FOR DELETE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND public.get_my_role() IN ('admin', 'sales_manager', 'manager', 'platform_admin')
);

-- =====================================================
-- PART 4: Fix Calls RLS
-- =====================================================

DROP POLICY IF EXISTS "calls_select" ON calls;
DROP POLICY IF EXISTS "calls_insert" ON calls;

CREATE POLICY "calls_org_select" ON calls
FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
        public.get_my_role() IN ('admin', 'sales_manager', 'manager', 'platform_admin')
        OR
        agent_id = auth.uid()
    )
);

CREATE POLICY "calls_org_insert" ON calls
FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- =====================================================
-- PART 5: Verify Schema
-- =====================================================

-- Show messages table structure
SELECT 'MESSAGES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';

SELECT 'TEAM CHAT AND RLS FIX COMPLETED!' as result;
