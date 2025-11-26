-- Tournament Enhancements Schema
-- Match History, Titles, Weekly Challenges

-- Match History Table
CREATE TABLE IF NOT EXISTS match_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    opponent_name TEXT NOT NULL,
    opponent_level INTEGER NOT NULL,
    user_level INTEGER NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    win_type TEXT CHECK (win_type IN ('submission', 'points')),
    submission_type TEXT,
    points_user INTEGER DEFAULT 0,
    points_opponent INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_history_user ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON match_history(created_at DESC);

-- Titles Table
CREATE TABLE IF NOT EXISTS titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    criteria_type TEXT NOT NULL,
    criteria_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title_id UUID REFERENCES titles(id) NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, title_id)
);

-- Insert default titles
INSERT INTO titles (name, description, icon, criteria_type, criteria_value) VALUES
('초보 탈출', '첫 승리 달성', '⭐', 'total_wins', 1),
('연승왕', '10연승 달성', '🔥', 'win_streak', 10),
('서브미션 마스터', '서브미션으로 50승', '🥋', 'submission_wins', 50),
('불굴의 투사', '100경기 참여', '💪', 'total_matches', 100),
('베테랑', '200경기 참여', '🎖️', 'total_matches', 200),
('챔피언', '토너먼트 우승', '👑', 'tournament_wins', 1)
ON CONFLICT DO NOTHING;

-- Weekly Challenges Table
CREATE TABLE IF NOT EXISTS weekly_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start DATE NOT NULL,
    challenge_type TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    challenge_id UUID REFERENCES weekly_challenges(id) NOT NULL,
    current_value INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_id)
);

-- Function to check and award titles
CREATE OR REPLACE FUNCTION check_and_award_titles(p_user_id UUID)
RETURNS SETOF titles AS $$
DECLARE
    v_title RECORD;
    v_total_wins INTEGER;
    v_total_matches INTEGER;
    v_submission_wins INTEGER;
    v_current_streak INTEGER;
BEGIN
    -- Get user stats
    SELECT 
        COUNT(*) FILTER (WHERE result = 'win'),
        COUNT(*),
        COUNT(*) FILTER (WHERE result = 'win' AND win_type = 'submission')
    INTO v_total_wins, v_total_matches, v_submission_wins
    FROM match_history
    WHERE user_id = p_user_id;
    
    -- Calculate current win streak
    WITH recent_matches AS (
        SELECT result, 
               ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
        FROM match_history
        WHERE user_id = p_user_id
    )
    SELECT COUNT(*)
    INTO v_current_streak
    FROM recent_matches
    WHERE result = 'win'
    AND rn <= (SELECT MIN(rn) FROM recent_matches WHERE result = 'loss');
    
    -- Check each title criteria
    FOR v_title IN 
        SELECT * FROM titles 
        WHERE id NOT IN (
            SELECT title_id FROM user_titles WHERE user_id = p_user_id
        )
    LOOP
        IF (v_title.criteria_type = 'total_wins' AND v_total_wins >= v_title.criteria_value) OR
           (v_title.criteria_type = 'total_matches' AND v_total_matches >= v_title.criteria_value) OR
           (v_title.criteria_type = 'submission_wins' AND v_submission_wins >= v_title.criteria_value) OR
           (v_title.criteria_type = 'win_streak' AND v_current_streak >= v_title.criteria_value)
        THEN
            -- Award title
            INSERT INTO user_titles (user_id, title_id)
            VALUES (p_user_id, v_title.id)
            ON CONFLICT DO NOTHING;
            
            RETURN NEXT v_title;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own match history" ON match_history;
CREATE POLICY "Users can view their own match history"
    ON match_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own match history" ON match_history;
CREATE POLICY "Users can insert their own match history"
    ON match_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all titles" ON titles;
CREATE POLICY "Users can view all titles"
    ON titles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can view their own titles" ON user_titles;
CREATE POLICY "Users can view their own titles"
    ON user_titles FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own challenge progress" ON user_challenge_progress;
CREATE POLICY "Users can view their own challenge progress"
    ON user_challenge_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress"
    ON user_challenge_progress FOR UPDATE
    USING (auth.uid() = user_id);

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

DROP POLICY IF EXISTS "Users can view their own XP activities" ON xp_activities;
CREATE POLICY "Users can view their own XP activities"
    ON xp_activities FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own login streak" ON user_login_streak;
CREATE POLICY "Users can view their own login streak"
    ON user_login_streak FOR SELECT
    USING (auth.uid() = user_id);

-- Drill & Routine System Schema
-- Instagram-style grid for drill routines with purchase system

-- Drills table (individual drill videos)
CREATE TABLE IF NOT EXISTS drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    vimeo_url TEXT,
    thumbnail_url TEXT,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    duration_minutes INTEGER,
    category TEXT, -- 'Guard', 'Pass', 'Back', 'Sweep', 'Submission', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routines table (collection of drills for sale)
CREATE TABLE IF NOT EXISTS routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    price INTEGER NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    category TEXT,
    total_duration_minutes INTEGER,
    drill_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for routine-drill relationship
CREATE TABLE IF NOT EXISTS routine_drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    UNIQUE(routine_id, drill_id)
);

-- User routine purchases
CREATE TABLE IF NOT EXISTS user_routine_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    routine_id UUID REFERENCES routines(id) NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'direct', -- 'direct' or 'course_bundle'
    course_id UUID REFERENCES courses(id), -- if from course bundle
    UNIQUE(user_id, routine_id)
);

-- Course-routine bundles (courses can include free routines)
CREATE TABLE IF NOT EXISTS course_routine_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, routine_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drills_creator ON drills(creator_id);
CREATE INDEX IF NOT EXISTS idx_drills_category ON drills(category);
CREATE INDEX IF NOT EXISTS idx_routines_creator ON routines(creator_id);
CREATE INDEX IF NOT EXISTS idx_routines_category ON routines(category);
CREATE INDEX IF NOT EXISTS idx_routine_drills_routine ON routine_drills(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_drills_drill ON routine_drills(drill_id);
CREATE INDEX IF NOT EXISTS idx_user_routine_purchases_user ON user_routine_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_routine_purchases_routine ON user_routine_purchases(routine_id);
CREATE INDEX IF NOT EXISTS idx_course_routine_bundles_course ON course_routine_bundles(course_id);

-- Function to update routine drill count and duration
CREATE OR REPLACE FUNCTION update_routine_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE routines
    SET drill_count = (
        SELECT COUNT(*)
        FROM routine_drills
        WHERE routine_id = NEW.routine_id
    ),
    total_duration_minutes = (
        SELECT COALESCE(SUM(d.duration_minutes), 0)
        FROM routine_drills rd
        JOIN drills d ON d.id = rd.drill_id
        WHERE rd.routine_id = NEW.routine_id
    )
    WHERE id = NEW.routine_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_routine_stats
AFTER INSERT OR DELETE ON routine_drills
FOR EACH ROW
EXECUTE FUNCTION update_routine_stats();

-- Function to auto-grant routines when course is purchased
CREATE OR REPLACE FUNCTION grant_course_routines()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert routine purchases for all routines bundled with the course
    INSERT INTO user_routine_purchases (user_id, routine_id, source, course_id)
    SELECT NEW.user_id, crb.routine_id, 'course_bundle', NEW.course_id
    FROM course_routine_bundles crb
    WHERE crb.course_id = NEW.course_id
    ON CONFLICT (user_id, routine_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grant_course_routines
AFTER INSERT ON user_courses
FOR EACH ROW
EXECUTE FUNCTION grant_course_routines();

-- RLS Policies
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routine_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_routine_bundles ENABLE ROW LEVEL SECURITY;

-- Drills: Creators can manage their own, everyone can view
CREATE POLICY "Creators can manage their own drills"
    ON drills FOR ALL
    USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view drills"
    ON drills FOR SELECT
    TO authenticated
    USING (true);

-- Routines: Creators can manage their own, everyone can view
CREATE POLICY "Creators can manage their own routines"
    ON routines FOR ALL
    USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view routines"
    ON routines FOR SELECT
    TO authenticated
    USING (true);

-- Routine drills: Creators can manage
CREATE POLICY "Creators can manage routine drills"
    ON routine_drills FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND routines.creator_id = auth.uid()
        )
    );

CREATE POLICY "Everyone can view routine drills"
    ON routine_drills FOR SELECT
    TO authenticated
    USING (true);

-- User routine purchases: Users can view their own
CREATE POLICY "Users can view their own routine purchases"
    ON user_routine_purchases FOR SELECT
    USING (auth.uid() = user_id);
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

-- Drill & Routine System Schema
-- Instagram-style grid for drill routines with purchase system

-- Drills table (individual drill videos)
CREATE TABLE IF NOT EXISTS drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    vimeo_url TEXT,
    thumbnail_url TEXT,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    duration_minutes INTEGER,
    category TEXT, -- 'Guard', 'Pass', 'Back', 'Sweep', 'Submission', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routines table (collection of drills for sale)
CREATE TABLE IF NOT EXISTS routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    price INTEGER NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    category TEXT,
    total_duration_minutes INTEGER,
    drill_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for routine-drill relationship
CREATE TABLE IF NOT EXISTS routine_drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    UNIQUE(routine_id, drill_id)
);

-- User routine purchases
CREATE TABLE IF NOT EXISTS user_routine_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    routine_id UUID REFERENCES routines(id) NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'direct', -- 'direct' or 'course_bundle'
    course_id UUID REFERENCES courses(id), -- if from course bundle
    UNIQUE(user_id, routine_id)
);

-- Course-routine bundles (courses can include free routines)
CREATE TABLE IF NOT EXISTS course_routine_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, routine_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drills_creator ON drills(creator_id);
CREATE INDEX IF NOT EXISTS idx_drills_category ON drills(category);
CREATE INDEX IF NOT EXISTS idx_routines_creator ON routines(creator_id);
CREATE INDEX IF NOT EXISTS idx_routines_category ON routines(category);
CREATE INDEX IF NOT EXISTS idx_routine_drills_routine ON routine_drills(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_drills_drill ON routine_drills(drill_id);
CREATE INDEX IF NOT EXISTS idx_user_routine_purchases_user ON user_routine_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_routine_purchases_routine ON user_routine_purchases(routine_id);
CREATE INDEX IF NOT EXISTS idx_course_routine_bundles_course ON course_routine_bundles(course_id);

-- Function to update routine drill count and duration
CREATE OR REPLACE FUNCTION update_routine_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE routines
    SET drill_count = (
        SELECT COUNT(*)
        FROM routine_drills
        WHERE routine_id = NEW.routine_id
    ),
    total_duration_minutes = (
        SELECT COALESCE(SUM(d.duration_minutes), 0)
        FROM routine_drills rd
        JOIN drills d ON d.id = rd.drill_id
        WHERE rd.routine_id = NEW.routine_id
    )
    WHERE id = NEW.routine_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_routine_stats
AFTER INSERT OR DELETE ON routine_drills
FOR EACH ROW
EXECUTE FUNCTION update_routine_stats();

-- Function to auto-grant routines when course is purchased
CREATE OR REPLACE FUNCTION grant_course_routines()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert routine purchases for all routines bundled with the course
    INSERT INTO user_routine_purchases (user_id, routine_id, source, course_id)
    SELECT NEW.user_id, crb.routine_id, 'course_bundle', NEW.course_id
    FROM course_routine_bundles crb
    WHERE crb.course_id = NEW.course_id
    ON CONFLICT (user_id, routine_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grant_course_routines
AFTER INSERT ON user_courses
FOR EACH ROW
EXECUTE FUNCTION grant_course_routines();

-- RLS Policies
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routine_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_routine_bundles ENABLE ROW LEVEL SECURITY;

-- Drills: Creators can manage their own, everyone can view
CREATE POLICY "Creators can manage their own drills"
    ON drills FOR ALL
    USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view drills"
    ON drills FOR SELECT
    TO authenticated
    USING (true);

-- Routines: Creators can manage their own, everyone can view
CREATE POLICY "Creators can manage their own routines"
    ON routines FOR ALL
    USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view routines"
    ON routines FOR SELECT
    TO authenticated
    USING (true);

-- Routine drills: Creators can manage
CREATE POLICY "Creators can manage routine drills"
    ON routine_drills FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND routines.creator_id = auth.uid()
        )
    );

CREATE POLICY "Everyone can view routine drills"
    ON routine_drills FOR SELECT
    TO authenticated
    USING (true);

-- User routine purchases: Users can view their own
DROP POLICY IF EXISTS "Users can view their own routine purchases" ON user_routine_purchases;
CREATE POLICY "Users can view their own routine purchases"
    ON user_routine_purchases FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can purchase routines" ON user_routine_purchases;
CREATE POLICY "Users can purchase routines"
    ON user_routine_purchases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Course-routine bundles: Creators can manage
CREATE POLICY "Creators can manage course routine bundles"
    ON course_routine_bundles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = course_routine_bundles.course_id
            AND courses.creator_id = auth.uid()
        )
    );

CREATE POLICY "Everyone can view course routine bundles"
    ON course_routine_bundles FOR SELECT
    TO authenticated
    USING (true);

-- Course-drill bundles (courses can include free drills)
CREATE TABLE IF NOT EXISTS course_drill_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, drill_id)
);

-- User drill purchases (needed to track ownership of drills granted via bundles)
CREATE TABLE IF NOT EXISTS user_drill_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    drill_id UUID REFERENCES drills(id) NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'direct', -- 'direct' or 'course_bundle'
    course_id UUID REFERENCES courses(id), -- if from course bundle
    UNIQUE(user_id, drill_id)
);

-- Function to auto-grant drills when course is purchased
CREATE OR REPLACE FUNCTION grant_course_drills()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert drill purchases for all drills bundled with the course
    INSERT INTO user_drill_purchases (user_id, drill_id, source, course_id)
    SELECT NEW.user_id, cdb.drill_id, 'course_bundle', NEW.course_id
    FROM course_drill_bundles cdb
    WHERE cdb.course_id = NEW.course_id
    ON CONFLICT (user_id, drill_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grant_course_drills
AFTER INSERT ON user_courses
FOR EACH ROW
EXECUTE FUNCTION grant_course_drills();

-- RLS Policies for new tables
ALTER TABLE course_drill_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_drill_purchases ENABLE ROW LEVEL SECURITY;

-- Course drill bundles: Creators can manage
CREATE POLICY "Creators can manage course drill bundles"
    ON course_drill_bundles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = course_drill_bundles.course_id
            AND courses.creator_id = auth.uid()
        )
    );

CREATE POLICY "Everyone can view course drill bundles"
    ON course_drill_bundles FOR SELECT
    TO authenticated
    USING (true);

-- User drill purchases: Users can view their own
CREATE POLICY "Users can view their own drill purchases"
    ON user_drill_purchases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase drills"
    ON user_drill_purchases FOR INSERT
    WITH CHECK (auth.uid() = user_id);
