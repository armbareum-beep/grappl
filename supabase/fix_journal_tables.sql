
-- 1. Create training_log_likes table
CREATE TABLE IF NOT EXISTS training_log_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_id UUID NOT NULL REFERENCES training_logs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, log_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_training_log_likes_log_id ON training_log_likes(log_id);
CREATE INDEX IF NOT EXISTS idx_training_log_likes_user_id ON training_log_likes(user_id);

-- RLS Policies for training_log_likes
ALTER TABLE training_log_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes" ON training_log_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON training_log_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON training_log_likes
    FOR DELETE USING (auth.uid() = user_id);


-- 2. Create post_comments table (if not exists)
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES training_logs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);

-- RLS Policies for post_comments
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" ON post_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON post_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON post_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON post_comments
    FOR DELETE USING (auth.uid() = user_id);
