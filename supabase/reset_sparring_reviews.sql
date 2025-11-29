-- ⚠️ CAUTION: This will delete all existing sparring reviews!
-- Use this to fix schema/policy conflicts definitively.

DROP TABLE IF EXISTS sparring_reviews CASCADE;

CREATE TABLE sparring_reviews (
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

-- Enable RLS
ALTER TABLE sparring_reviews ENABLE ROW LEVEL SECURITY;

-- Create Policies
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

-- Create Index
CREATE INDEX idx_sparring_reviews_user ON sparring_reviews(user_id);
