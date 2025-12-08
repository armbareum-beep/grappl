-- 드릴 좋아요 테이블
CREATE TABLE IF NOT EXISTS user_drill_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    drill_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, drill_id)
);

-- 드릴 저장(북마크) 테이블
CREATE TABLE IF NOT EXISTS user_saved_drills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    drill_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, drill_id)
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_drill_likes_user_id ON user_drill_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_drill_likes_drill_id ON user_drill_likes(drill_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_drills_user_id ON user_saved_drills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_drills_drill_id ON user_saved_drills(drill_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE user_drill_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_drills ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 좋아요만 볼 수 있음
CREATE POLICY "Users can view their own likes"
    ON user_drill_likes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own likes"
    ON user_drill_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
    ON user_drill_likes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 저장 목록만 볼 수 있음
CREATE POLICY "Users can view their own saved drills"
    ON user_saved_drills FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved drills"
    ON user_saved_drills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved drills"
    ON user_saved_drills FOR DELETE
    USING (auth.uid() = user_id);

-- 좋아요 수를 집계하는 뷰 (선택사항)
CREATE OR REPLACE VIEW drill_like_counts AS
SELECT 
    drill_id,
    COUNT(*) as like_count
FROM user_drill_likes
GROUP BY drill_id;
