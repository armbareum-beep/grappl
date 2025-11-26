-- Tournament Match History Schema
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

-- RLS Policies
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own match history"
    ON match_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own match history"
    ON match_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);
