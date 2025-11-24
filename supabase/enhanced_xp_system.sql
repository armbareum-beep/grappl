-- Enhanced XP System
-- Increased XP requirements, daily login tracking, social activities

-- Update XP requirements function (500 XP per level)
CREATE OR REPLACE FUNCTION get_xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN level * 500; -- Increased from 200
END;
$$ LANGUAGE plpgsql;

-- XP Activities tracking
CREATE TABLE IF NOT EXISTS xp_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    activity_type TEXT NOT NULL,
    xp_earned INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_activities_user ON xp_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_activities_created ON xp_activities(created_at DESC);

-- Login streak tracking
CREATE TABLE IF NOT EXISTS user_login_streak (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    current_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    longest_streak INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to award daily login XP
CREATE OR REPLACE FUNCTION award_daily_login_xp(p_user_id UUID)
RETURNS TABLE(xp_earned INTEGER, streak INTEGER, bonus_awarded BOOLEAN) AS $$
DECLARE
    v_last_login DATE;
    v_current_streak INTEGER;
    v_xp INTEGER := 5; -- Base daily login XP
    v_bonus BOOLEAN := FALSE;
BEGIN
    -- Get current streak info
    SELECT last_login_date, current_streak 
    INTO v_last_login, v_current_streak
    FROM user_login_streak 
    WHERE user_id = p_user_id;
    
    -- If no record, create one
    IF NOT FOUND THEN
        INSERT INTO user_login_streak (user_id, current_streak, last_login_date)
        VALUES (p_user_id, 1, CURRENT_DATE);
        v_current_streak := 1;
    -- If last login was yesterday, increment streak
    ELSIF v_last_login = CURRENT_DATE - 1 THEN
        v_current_streak := v_current_streak + 1;
        UPDATE user_login_streak 
        SET current_streak = v_current_streak,
            last_login_date = CURRENT_DATE,
            longest_streak = GREATEST(longest_streak, v_current_streak),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Award bonus for 7-day streak
        IF v_current_streak % 7 = 0 THEN
            v_xp := v_xp + 20;
            v_bonus := TRUE;
        END IF;
    -- If last login was today, no XP
    ELSIF v_last_login = CURRENT_DATE THEN
        RETURN QUERY SELECT 0, v_current_streak, FALSE;
        RETURN;
    -- If streak broken, reset
    ELSE
        v_current_streak := 1;
        UPDATE user_login_streak 
        SET current_streak = 1,
            last_login_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    -- Award XP
    PERFORM add_xp(p_user_id, v_xp, 'daily_login');
    
    -- Record activity
    INSERT INTO xp_activities (user_id, activity_type, xp_earned)
    VALUES (p_user_id, 'daily_login', v_xp);
    
    RETURN QUERY SELECT v_xp, v_current_streak, v_bonus;
END;
$$ LANGUAGE plpgsql;

-- Function to award social activity XP
CREATE OR REPLACE FUNCTION award_social_xp(
    p_user_id UUID,
    p_activity_type TEXT,
    p_xp_amount INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_daily_total INTEGER;
    v_max_daily INTEGER := 10; -- Max XP from likes per day
BEGIN
    -- For 'like_received', check daily limit
    IF p_activity_type = 'like_received' THEN
        SELECT COALESCE(SUM(xp_earned), 0)
        INTO v_daily_total
        FROM xp_activities
        WHERE user_id = p_user_id
        AND activity_type = 'like_received'
        AND created_at >= CURRENT_DATE;
        
        -- If already at max, return 0
        IF v_daily_total >= v_max_daily THEN
            RETURN 0;
        END IF;
        
        -- Cap at max
        p_xp_amount := LEAST(p_xp_amount, v_max_daily - v_daily_total);
    END IF;
    
    -- Award XP
    PERFORM add_xp(p_user_id, p_xp_amount, p_activity_type);
    
    -- Record activity
    INSERT INTO xp_activities (user_id, activity_type, xp_earned)
    VALUES (p_user_id, p_activity_type, p_xp_amount);
    
    RETURN p_xp_amount;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE xp_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_streak ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP activities"
    ON xp_activities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own login streak"
    ON user_login_streak FOR SELECT
    USING (auth.uid() = user_id);
