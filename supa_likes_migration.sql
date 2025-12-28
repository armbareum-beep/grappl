
-- Create training_log_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS training_log_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_id UUID REFERENCES training_logs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, log_id)
);

-- Enable RLS
ALTER TABLE training_log_likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public likes are viewable by everyone" 
ON training_log_likes FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own likes" 
ON training_log_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON training_log_likes FOR DELETE 
USING (auth.uid() = user_id);

-- Add like_count to training_logs if not exists to avoid count queries (optional optimization, but let's stick to count query for now or simple counter)
-- Instead of a column, we can use a view or just count on read. 
-- However, for performance, a count column is better. But let's keep it simple.

-- Add index
CREATE INDEX IF NOT EXISTS idx_training_log_likes_log_id ON training_log_likes(log_id);
CREATE INDEX IF NOT EXISTS idx_training_log_likes_user_id ON training_log_likes(user_id);
