-- =====================================================
-- MVP LAUNCH FEATURES - Database Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PHONE NUMBERS TABLE (Number Health + Pool)
-- =====================================================

CREATE TABLE IF NOT EXISTS phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    display_name VARCHAR(100),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    
    -- Health Metrics
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    failed_streak INTEGER DEFAULT 0,
    avg_call_duration_seconds NUMERIC(10,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_quarantined BOOLEAN DEFAULT false,
    quarantine_reason VARCHAR(255),
    quarantined_at TIMESTAMPTZ,
    
    -- Timestamps
    last_used_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(phone_number, organization_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_phone_numbers_org ON phone_numbers(organization_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned ON phone_numbers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_health ON phone_numbers(health_score);

-- =====================================================
-- 2. CALL DISPOSITIONS (for tracking outcomes)
-- =====================================================

-- Add disposition tracking to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS disposition VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS disposition_notes TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS phone_number_id UUID REFERENCES phone_numbers(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS answered BOOLEAN DEFAULT false;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS ring_duration_seconds INTEGER;

-- Standard dispositions
COMMENT ON COLUMN calls.disposition IS 'Standard values: answered, no_answer, busy, rejected, voicemail, failed, wrong_number';

-- =====================================================
-- 3. DO-NOT-CALL SYSTEM
-- =====================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS do_not_call BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS do_not_call_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS do_not_call_reason VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS do_not_call_by UUID REFERENCES profiles(id);

-- Index for filtering DNC leads
CREATE INDEX IF NOT EXISTS idx_leads_dnc ON leads(do_not_call) WHERE do_not_call = true;

-- =====================================================
-- 4. GUARDRAILS - Campaign Settings
-- =====================================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '09:00';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '21:00';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_calls_per_hour_per_number INTEGER DEFAULT 30;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_failed_streak INTEGER DEFAULT 10;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cooldown_minutes INTEGER DEFAULT 2;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_quarantine_threshold INTEGER DEFAULT 50;

-- =====================================================
-- 5. HEALTH SCORE CALCULATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_phone_health_score(
    p_total_calls INTEGER,
    p_successful_calls INTEGER,
    p_failed_streak INTEGER
) RETURNS INTEGER AS $$
DECLARE
    base_score INTEGER := 100;
    connect_rate NUMERIC;
    streak_penalty INTEGER;
BEGIN
    -- No calls yet = perfect score
    IF p_total_calls = 0 THEN
        RETURN 100;
    END IF;
    
    -- Calculate connect rate (0-100)
    connect_rate := (p_successful_calls::NUMERIC / p_total_calls::NUMERIC) * 100;
    
    -- Base score from connect rate (weighted 70%)
    base_score := (connect_rate * 0.7)::INTEGER;
    
    -- Streak penalty (up to 30 points)
    streak_penalty := LEAST(p_failed_streak * 3, 30);
    
    -- Final score
    RETURN GREATEST(0, LEAST(100, base_score + 30 - streak_penalty));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. AUTO-UPDATE PHONE HEALTH AFTER CALL
-- =====================================================

CREATE OR REPLACE FUNCTION update_phone_health_after_call()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if phone_number_id is set
    IF NEW.phone_number_id IS NOT NULL THEN
        UPDATE phone_numbers
        SET 
            total_calls = total_calls + 1,
            successful_calls = CASE WHEN NEW.answered THEN successful_calls + 1 ELSE successful_calls END,
            failed_calls = CASE WHEN NOT NEW.answered THEN failed_calls + 1 ELSE failed_calls END,
            failed_streak = CASE 
                WHEN NEW.answered THEN 0 
                ELSE failed_streak + 1 
            END,
            last_used_at = NOW(),
            last_success_at = CASE WHEN NEW.answered THEN NOW() ELSE last_success_at END,
            health_score = calculate_phone_health_score(
                total_calls + 1,
                CASE WHEN NEW.answered THEN successful_calls + 1 ELSE successful_calls END,
                CASE WHEN NEW.answered THEN 0 ELSE failed_streak + 1 END
            ),
            -- Auto-quarantine if health drops too low
            is_quarantined = CASE 
                WHEN calculate_phone_health_score(
                    total_calls + 1,
                    CASE WHEN NEW.answered THEN successful_calls + 1 ELSE successful_calls END,
                    CASE WHEN NEW.answered THEN 0 ELSE failed_streak + 1 END
                ) < 30 THEN true
                ELSE is_quarantined
            END,
            quarantine_reason = CASE 
                WHEN calculate_phone_health_score(
                    total_calls + 1,
                    CASE WHEN NEW.answered THEN successful_calls + 1 ELSE successful_calls END,
                    CASE WHEN NEW.answered THEN 0 ELSE failed_streak + 1 END
                ) < 30 THEN 'Auto-quarantined: Health score dropped below 30'
                ELSE quarantine_reason
            END,
            quarantined_at = CASE 
                WHEN calculate_phone_health_score(
                    total_calls + 1,
                    CASE WHEN NEW.answered THEN successful_calls + 1 ELSE successful_calls END,
                    CASE WHEN NEW.answered THEN 0 ELSE failed_streak + 1 END
                ) < 30 AND NOT is_quarantined THEN NOW()
                ELSE quarantined_at
            END,
            updated_at = NOW()
        WHERE id = NEW.phone_number_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_phone_health ON calls;
CREATE TRIGGER trigger_update_phone_health
    AFTER INSERT ON calls
    FOR EACH ROW
    EXECUTE FUNCTION update_phone_health_after_call();

-- =====================================================
-- 7. RLS POLICIES FOR PHONE NUMBERS
-- =====================================================

ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

-- Users can see phone numbers in their organization
CREATE POLICY "phone_numbers_org_view" ON phone_numbers
FOR SELECT USING (
    organization_id = public.get_my_organization_id()
);

-- Managers can manage phone numbers
CREATE POLICY "phone_numbers_org_manage" ON phone_numbers
FOR ALL USING (
    organization_id = public.get_my_organization_id()
);

-- =====================================================
-- 8. HELPER VIEWS
-- =====================================================

-- View: Phone numbers with health status
CREATE OR REPLACE VIEW phone_numbers_with_status AS
SELECT 
    pn.*,
    p.full_name as assigned_to_name,
    c.name as campaign_name,
    CASE 
        WHEN pn.health_score >= 70 THEN 'healthy'
        WHEN pn.health_score >= 40 THEN 'warning'
        ELSE 'critical'
    END as health_status,
    CASE 
        WHEN pn.total_calls > 0 THEN 
            ROUND((pn.successful_calls::NUMERIC / pn.total_calls::NUMERIC) * 100, 1)
        ELSE 0
    END as connect_rate
FROM phone_numbers pn
LEFT JOIN profiles p ON pn.assigned_to = p.id
LEFT JOIN campaigns c ON pn.campaign_id = c.id;

-- View: Numbers that need attention
CREATE OR REPLACE VIEW phone_numbers_at_risk AS
SELECT * FROM phone_numbers_with_status
WHERE health_score < 50 OR failed_streak >= 5
ORDER BY health_score ASC;

-- =====================================================
-- 9. PERFORMANCE METRICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW daily_performance_metrics AS
SELECT 
    DATE(c.created_at) as date,
    c.organization_id,
    c.agent_id,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE c.answered = true) as answered_calls,
    COUNT(*) FILTER (WHERE c.disposition = 'no_answer') as no_answer_calls,
    ROUND(AVG(c.duration) FILTER (WHERE c.answered = true), 0) as avg_call_duration,
    ROUND(
        (COUNT(*) FILTER (WHERE c.answered = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
        1
    ) as connect_rate,
    COUNT(DISTINCT c.lead_id) as unique_leads_called
FROM calls c
WHERE c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(c.created_at), c.organization_id, c.agent_id;

-- =====================================================
-- DONE!
-- =====================================================

SELECT 'MVP Launch Features - Database migration completed!' as result;

-- Show created objects
SELECT 'Tables created:' as info, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('phone_numbers');

SELECT 'New columns added to leads:' as info, column_name
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name LIKE 'do_not_call%';
