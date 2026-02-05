-- ========================================
-- FULL Retry Logic and Follow-up Migration
-- Run this ENTIRE script in Supabase SQL Editor
-- ========================================

-- STEP 1: Add retry fields to LEADS table
DO $$ 
BEGIN
    -- attempt_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'attempt_count') THEN
        ALTER TABLE leads ADD COLUMN attempt_count INTEGER DEFAULT 0;
    END IF;
    -- last_attempt_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_attempt_at') THEN
        ALTER TABLE leads ADD COLUMN last_attempt_at TIMESTAMPTZ;
    END IF;
    -- next_retry_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'next_retry_at') THEN
        ALTER TABLE leads ADD COLUMN next_retry_at TIMESTAMPTZ;
    END IF;
    -- call_disposition
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'call_disposition') THEN
        ALTER TABLE leads ADD COLUMN call_disposition TEXT;
    END IF;
    -- campaign_id (if doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'campaign_id') THEN
        ALTER TABLE leads ADD COLUMN campaign_id UUID;
    END IF;
END $$;

-- STEP 2: Add retry settings to CAMPAIGNS table
DO $$ 
BEGIN
    -- max_attempts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'max_attempts') THEN
        ALTER TABLE campaigns ADD COLUMN max_attempts INTEGER DEFAULT 5;
    END IF;
    -- retry_interval_minutes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'retry_interval_minutes') THEN
        ALTER TABLE campaigns ADD COLUMN retry_interval_minutes INTEGER DEFAULT 30;
    END IF;
    -- active_hours_start
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'active_hours_start') THEN
        ALTER TABLE campaigns ADD COLUMN active_hours_start TIME DEFAULT '09:00';
    END IF;
    -- active_hours_end
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'active_hours_end') THEN
        ALTER TABLE campaigns ADD COLUMN active_hours_end TIME DEFAULT '21:00';
    END IF;
    -- retry_on_no_answer
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'retry_on_no_answer') THEN
        ALTER TABLE campaigns ADD COLUMN retry_on_no_answer BOOLEAN DEFAULT true;
    END IF;
END $$;

-- STEP 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_next_retry ON leads(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_at) WHERE follow_up_at IS NOT NULL;

-- STEP 4: Drop existing views if they exist (to recreate cleanly)
DROP VIEW IF EXISTS due_follow_ups;
DROP VIEW IF EXISTS leads_ready_for_retry;

-- STEP 5: Create view for due follow-ups (SIMPLE version without join)
CREATE VIEW due_follow_ups AS
SELECT 
    l.*,
    EXTRACT(EPOCH FROM (NOW() - l.follow_up_at)) / 60 as minutes_overdue
FROM leads l
WHERE l.follow_up_at <= NOW()
AND l.status NOT IN ('Won', 'Lost');

-- STEP 6: Create view for leads ready for retry (SIMPLE version without join)
CREATE VIEW leads_ready_for_retry AS
SELECT 
    l.*
FROM leads l
WHERE l.next_retry_at <= NOW()
AND COALESCE(l.attempt_count, 0) < 5
AND l.status NOT IN ('Won', 'Lost');

-- STEP 7: Grant permissions
GRANT SELECT ON due_follow_ups TO authenticated;
GRANT SELECT ON leads_ready_for_retry TO authenticated;

-- DONE!
SELECT 'Migration completed successfully!' as result;
