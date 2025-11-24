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

CREATE POLICY "Users can view their own match history"
    ON match_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own match history"
    ON match_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all titles"
    ON titles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can view their own titles"
    ON user_titles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own challenge progress"
    ON user_challenge_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress"
    ON user_challenge_progress FOR UPDATE
    USING (auth.uid() = user_id);
