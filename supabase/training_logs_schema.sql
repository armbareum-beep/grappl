-- Training Logs Table
CREATE TABLE IF NOT EXISTS training_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER DEFAULT 0,
    sparring_rounds INTEGER DEFAULT 0,
    techniques TEXT[] DEFAULT '{}',
    notes TEXT,
    location TEXT,
    youtube_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own logs"
    ON training_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public logs"
    ON training_logs FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can create their own logs"
    ON training_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs"
    ON training_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logs"
    ON training_logs FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_logs_user_date ON training_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_training_logs_public ON training_logs(is_public);

-- Sparring Reviews Table
CREATE TABLE IF NOT EXISTS sparring_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL,
    opponent_name TEXT NOT NULL,
    opponent_belt TEXT NOT NULL,
    rounds INTEGER DEFAULT 1,
    result TEXT CHECK (result IN ('win', 'loss', 'draw')),
    notes TEXT,
    techniques TEXT[] DEFAULT '{}',
    what_worked TEXT,
    what_to_improve TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Sparring Reviews
ALTER TABLE sparring_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for Sparring Reviews
CREATE POLICY "Users can view their own sparring reviews"
    ON sparring_reviews FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sparring reviews"
    ON sparring_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sparring reviews"
    ON sparring_reviews FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sparring reviews"
    ON sparring_reviews FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sparring_reviews_user ON sparring_reviews(user_id);

