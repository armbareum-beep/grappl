-- 1. 테이블이 없으면 생성 (있으면 넘어감)
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

-- 2. RLS 활성화
ALTER TABLE sparring_reviews ENABLE ROW LEVEL SECURITY;

-- 3. 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can view their own sparring reviews" ON sparring_reviews;
DROP POLICY IF EXISTS "Users can create their own sparring reviews" ON sparring_reviews;
DROP POLICY IF EXISTS "Users can update their own sparring reviews" ON sparring_reviews;
DROP POLICY IF EXISTS "Users can delete their own sparring reviews" ON sparring_reviews;

-- 4. 정책 다시 생성
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

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sparring_reviews_user ON sparring_reviews(user_id);
