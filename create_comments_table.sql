-- Create training_log_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS training_log_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    log_id UUID NOT NULL REFERENCES training_logs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_training_log_comments_log_id ON training_log_comments(log_id);
CREATE INDEX IF NOT EXISTS idx_training_log_comments_user_id ON training_log_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_log_comments_created_at ON training_log_comments(created_at);

-- Enable RLS
ALTER TABLE training_log_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view comments" ON training_log_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON training_log_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON training_log_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON training_log_comments;

-- Create RLS policies
CREATE POLICY "Anyone can view comments"
    ON training_log_comments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create comments"
    ON training_log_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
    ON training_log_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
    ON training_log_comments FOR DELETE
    USING (auth.uid() = user_id);
