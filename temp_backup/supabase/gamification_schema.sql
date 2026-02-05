-- =============================================
-- GAMIFICATION & NOTIFICATIONS SYSTEM
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. User Gamification Table
CREATE TABLE IF NOT EXISTS user_gamification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  xp_total INT DEFAULT 0,
  level INT DEFAULT 1,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  achievements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reminder', 'achievement', 'alert', 'mission', 'lead', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily Missions Table
CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('calls', 'deals', 'ai_score', 'followups', 'appointments')),
  title TEXT NOT NULL,
  target INT NOT NULL,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  xp_reward INT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mission_type, date)
);

-- 4. XP History Table (for tracking XP gains)
CREATE TABLE IF NOT EXISTS xp_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  xp_gained INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;

-- User Gamification Policies
CREATE POLICY "Users can view own gamification" ON user_gamification
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification" ON user_gamification
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification" ON user_gamification
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Daily Missions Policies
CREATE POLICY "Users can view own missions" ON daily_missions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own missions" ON daily_missions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert missions" ON daily_missions
  FOR INSERT WITH CHECK (true);

-- XP History Policies
CREATE POLICY "Users can view own xp history" ON xp_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert xp history" ON xp_history
  FOR INSERT WITH CHECK (true);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_missions_user_date ON daily_missions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_xp_history_user ON xp_history(user_id, created_at DESC);

-- =============================================
-- Function to Add XP and Level Up
-- =============================================

CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_org_id UUID,
  p_action TEXT,
  p_xp INT
) RETURNS JSONB AS $$
DECLARE
  v_current_xp INT;
  v_new_xp INT;
  v_current_level INT;
  v_new_level INT;
  v_level_up BOOLEAN := FALSE;
BEGIN
  -- Get or create gamification record
  INSERT INTO user_gamification (user_id, organization_id, xp_total, level)
  VALUES (p_user_id, p_org_id, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current stats
  SELECT xp_total, level INTO v_current_xp, v_current_level
  FROM user_gamification WHERE user_id = p_user_id;
  
  v_new_xp := v_current_xp + p_xp;
  
  -- Calculate new level based on XP thresholds
  v_new_level := CASE
    WHEN v_new_xp >= 1000 THEN 5
    WHEN v_new_xp >= 600 THEN 4
    WHEN v_new_xp >= 300 THEN 3
    WHEN v_new_xp >= 100 THEN 2
    ELSE 1
  END;
  
  v_level_up := v_new_level > v_current_level;
  
  -- Update gamification record
  UPDATE user_gamification
  SET xp_total = v_new_xp,
      level = v_new_level,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log XP history
  INSERT INTO xp_history (user_id, organization_id, action, xp_gained)
  VALUES (p_user_id, p_org_id, p_action, p_xp);
  
  -- Create level-up notification if applicable
  IF v_level_up THEN
    INSERT INTO notifications (user_id, organization_id, type, title, message)
    VALUES (
      p_user_id,
      p_org_id,
      'achievement',
      '🎉 עלית רמה!',
      'מזל טוב! הגעת לרמה ' || v_new_level
    );
  END IF;
  
  RETURN jsonb_build_object(
    'xp_gained', p_xp,
    'new_total', v_new_xp,
    'new_level', v_new_level,
    'level_up', v_level_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function to Create Daily Missions
-- =============================================

CREATE OR REPLACE FUNCTION create_daily_missions(
  p_user_id UUID,
  p_org_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Only create if not exists for today
  INSERT INTO daily_missions (user_id, organization_id, mission_type, title, target, xp_reward)
  VALUES
    (p_user_id, p_org_id, 'calls', '📞 בצע 5 שיחות היום', 5, 30),
    (p_user_id, p_org_id, 'ai_score', '🤖 השג ציון AI מעל 75 בשיחה', 1, 25),
    (p_user_id, p_org_id, 'followups', '✅ השלם 3 משימות follow-up', 3, 20)
  ON CONFLICT (user_id, mission_type, date) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Done!
-- =============================================
SELECT 'Gamification tables created successfully!' as status;
