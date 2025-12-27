-- Create user_course_likes table
CREATE TABLE IF NOT EXISTS user_course_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE user_course_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own course likes" ON user_course_likes;
CREATE POLICY "Users can view their own course likes"
    ON user_course_likes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own course likes" ON user_course_likes;
CREATE POLICY "Users can insert their own course likes"
    ON user_course_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own course likes" ON user_course_likes;
CREATE POLICY "Users can delete their own course likes"
    ON user_course_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Function to increment course views
CREATE OR REPLACE FUNCTION increment_course_views(course_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE courses
    SET views = COALESCE(views, 0) + 1
    WHERE id = course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
