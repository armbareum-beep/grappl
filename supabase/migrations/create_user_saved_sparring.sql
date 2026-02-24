-- 스파링 영상 저장(북마크) 테이블
CREATE TABLE IF NOT EXISTS user_saved_sparring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id text NOT NULL, -- Vimeo ID or foreign key if sparring_videos table uses UUID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, video_id) -- 중복 저장 방지
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_saved_sparring_user_id ON user_saved_sparring(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_sparring_video_id ON user_saved_sparring(video_id);

-- RLS 활성화
ALTER TABLE user_saved_sparring ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own saved sparring"
    ON user_saved_sparring FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved sparring"
    ON user_saved_sparring FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved sparring"
    ON user_saved_sparring FOR DELETE
    USING (auth.uid() = user_id);
