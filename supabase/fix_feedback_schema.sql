-- Fix Feedback Requests Schema and Permissions
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Ensure feedback_requests table exists
CREATE TABLE IF NOT EXISTS feedback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) NOT NULL,
    instructor_id UUID REFERENCES auth.users(id) NOT NULL,
    video_url TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    feedback_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. Handle potential column mismatch (feedback_text vs feedback_content)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback_requests' AND column_name = 'feedback_text') THEN
        ALTER TABLE feedback_requests RENAME COLUMN feedback_text TO feedback_content;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

-- 4. Re-create policies to ensure INSERT is allowed
DROP POLICY IF EXISTS "Students can create feedback requests" ON feedback_requests;
CREATE POLICY "Students can create feedback requests"
    ON feedback_requests FOR INSERT
    WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can view their own feedback requests" ON feedback_requests;
CREATE POLICY "Users can view their own feedback requests"
    ON feedback_requests FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = instructor_id);

DROP POLICY IF EXISTS "Instructors can update feedback requests" ON feedback_requests;
CREATE POLICY "Instructors can update feedback requests"
    ON feedback_requests FOR UPDATE
    USING (auth.uid() = instructor_id);

-- 5. Fix feedback_settings policy
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view feedback settings" ON feedback_settings;
CREATE POLICY "Everyone can view feedback settings" ON feedback_settings FOR SELECT USING (true);
