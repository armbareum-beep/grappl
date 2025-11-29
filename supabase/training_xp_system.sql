-- Training XP System: Daily Limit and Streak Bonus
-- This adds daily limit (once per day) and streak bonus for training activities

-- ============================================
-- 1. Training Streak Tracking Table
-- ============================================

CREATE TABLE IF NOT EXISTS user_training_streak (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    current_streak INTEGER DEFAULT 0,
    last_training_date DATE,
    longest_streak INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_training_streak_user ON user_training_streak(user_id);

-- ============================================
-- 2. Award Training XP Function
-- ============================================

CREATE OR REPLACE FUNCTION award_training_xp(
    p_user_id UUID,
    p_activity_type TEXT, -- 'training_log', 'sparring_review', 'routine_complete'
    p_base_xp INTEGER
)
RETURNS TABLE(
    xp_earned INTEGER, 
    streak INTEGER, 
    bonus_xp INTEGER,
    already_completed_today BOOLEAN
) AS $$
DECLARE
    v_last_training DATE;
    v_current_streak INTEGER;
    v_base_xp INTEGER := p_base_xp;
    v_bonus_xp INTEGER := 0;
    v_total_xp INTEGER;
BEGIN
    -- Check if already completed a training activity today
    IF EXISTS (
        SELECT 1 FROM xp_activities
        WHERE user_id = p_user_id
        AND activity_type IN ('training_log', 'sparring_review', 'routine_complete')
        AND created_at >= CURRENT_DATE
    ) THEN
        -- Already completed today, return 0 XP
        SELECT last_training_date, current_streak
        INTO v_last_training, v_current_streak
        FROM user_training_streak
        WHERE user_id = p_user_id;
        
        RETURN QUERY SELECT 0, COALESCE(v_current_streak, 0), 0, TRUE;
        RETURN;
    END IF;
    
    -- Get current streak info
    SELECT last_training_date, current_streak 
    INTO v_last_training, v_current_streak
    FROM user_training_streak 
    WHERE user_id = p_user_id;
    
    -- If no record, create one
    IF NOT FOUND THEN
        INSERT INTO user_training_streak (user_id, current_streak, last_training_date)
        VALUES (p_user_id, 1, CURRENT_DATE);
        v_current_streak := 1;
    -- If last training was yesterday, increment streak
    ELSIF v_last_training = CURRENT_DATE - 1 THEN
        v_current_streak := v_current_streak + 1;
        UPDATE user_training_streak 
        SET current_streak = v_current_streak,
            last_training_date = CURRENT_DATE,
            longest_streak = GREATEST(longest_streak, v_current_streak),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    -- If last training was today, should not happen (checked above)
    ELSIF v_last_training = CURRENT_DATE THEN
        RETURN QUERY SELECT 0, v_current_streak, 0, TRUE;
        RETURN;
    -- If streak broken, reset
    ELSE
        v_current_streak := 1;
        UPDATE user_training_streak 
        SET current_streak = 1,
            last_training_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    -- Calculate streak bonus
    IF v_current_streak >= 30 THEN
        v_bonus_xp := 100;
    ELSIF v_current_streak >= 14 THEN
        v_bonus_xp := 50;
    ELSIF v_current_streak >= 7 THEN
        v_bonus_xp := 30;
    ELSIF v_current_streak >= 3 THEN
        v_bonus_xp := 10;
    END IF;
    
    v_total_xp := v_base_xp + v_bonus_xp;
    
    -- Record base activity
    INSERT INTO xp_activities (user_id, activity_type, xp_earned)
    VALUES (p_user_id, p_activity_type, v_base_xp);
    
    -- Record bonus separately if exists
    IF v_bonus_xp > 0 THEN
        INSERT INTO xp_activities (user_id, activity_type, xp_earned)
        VALUES (p_user_id, 'streak_bonus', v_bonus_xp);
    END IF;
    
    RETURN QUERY SELECT v_total_xp, v_current_streak, v_bonus_xp, FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Get User Training Streak Function
-- ============================================

CREATE OR REPLACE FUNCTION get_user_training_streak(p_user_id UUID)
RETURNS TABLE(
    current_streak INTEGER,
    longest_streak INTEGER,
    last_training_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(uts.current_streak, 0) as current_streak,
        COALESCE(uts.longest_streak, 0) as longest_streak,
        uts.last_training_date
    FROM user_training_streak uts
    WHERE uts.user_id = p_user_id;
    
    -- If no record found, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, NULL::DATE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. RLS Policies
-- ============================================

ALTER TABLE user_training_streak ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own training streak" ON user_training_streak;
CREATE POLICY "Users can view their own training streak"
    ON user_training_streak FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own training streak" ON user_training_streak;
CREATE POLICY "Users can update their own training streak"
    ON user_training_streak FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- NOTES
-- ============================================
-- 
-- Daily Limit Logic:
-- - Only ONE training activity (log/sparring/routine) per day earns XP
-- - Checked via xp_activities table for today's date
-- 
-- Streak Bonus Structure:
-- - 3-6 days: +10 XP
-- - 7-13 days: +30 XP
-- - 14-29 days: +50 XP
-- - 30+ days: +100 XP
-- 
-- Streak Calculation:
-- - Yesterday's training → increment streak
-- - Today already done → 0 XP
-- - Streak broken → reset to 1
--
