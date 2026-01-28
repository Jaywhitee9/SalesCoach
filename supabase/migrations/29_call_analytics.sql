-- 29_call_analytics.sql
-- שמירת המלצות אימון שניתנו במהלך השיחה

-- הוספת עמודה לשמירת coaching tips
ALTER TABLE calls ADD COLUMN IF NOT EXISTS coaching_tips JSONB DEFAULT '[]';

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_calls_coaching_tips ON calls USING gin(coaching_tips);
