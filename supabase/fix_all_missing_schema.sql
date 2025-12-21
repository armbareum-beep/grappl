-- COMPREHENSIVE FIX for Missing Columns and Feedback System
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Fix 'courses' table (missing 'published')
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE;

-- 2. Fix 'lesson_progress' table (missing 'last_watched_at')
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    lesson_id UUID REFERENCES lessons(id) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    last_watched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);
-- If table exists but column missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_progress' AND column_name = 'last_watched_at') THEN
        ALTER TABLE lesson_progress ADD COLUMN last_watched_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. RESET Feedback System (Fixes 'cannot drop table' errors and schema mismatch)
DROP TABLE IF EXISTS feedback_payments CASCADE;
DROP TABLE IF EXISTS feedback_responses CASCADE;
DROP TABLE IF EXISTS feedback_requests CASCADE;

CREATE TABLE feedback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) NOT NULL,
    instructor_id UUID REFERENCES auth.users(id) NOT NULL,
    video_url TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    feedback_content TEXT,
    payment_status TEXT DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feedback_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES feedback_requests(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feedback_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES feedback_requests(id) ON DELETE SET NULL,
    student_id UUID REFERENCES auth.users(id),
    instructor_id UUID REFERENCES auth.users(id),
    amount INTEGER NOT NULL,
    platform_fee INTEGER DEFAULT 0,
    instructor_revenue INTEGER NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS and Policies for Feedback
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can create feedback requests" ON feedback_requests FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can view their own feedback requests" ON feedback_requests FOR SELECT USING (auth.uid() = student_id OR auth.uid() = instructor_id);
CREATE POLICY "Instructors can update feedback requests" ON feedback_requests FOR UPDATE USING (auth.uid() = instructor_id);

CREATE POLICY "Users can view responses for their requests" ON feedback_responses FOR SELECT USING (EXISTS (SELECT 1 FROM feedback_requests WHERE feedback_requests.id = feedback_responses.request_id AND (feedback_requests.student_id = auth.uid() OR feedback_requests.instructor_id = auth.uid())));
CREATE POLICY "Instructors can create responses" ON feedback_responses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM feedback_requests WHERE feedback_requests.id = request_id AND feedback_requests.instructor_id = auth.uid()));

CREATE POLICY "Users can view own payments" ON feedback_payments FOR SELECT USING (auth.uid() = student_id OR auth.uid() = instructor_id);

-- 5. Grants
GRANT ALL ON feedback_requests TO authenticated;
GRANT ALL ON feedback_responses TO authenticated;
GRANT ALL ON feedback_payments TO authenticated;
GRANT ALL ON feedback_requests TO service_role;
GRANT ALL ON feedback_responses TO service_role;
GRANT ALL ON feedback_payments TO service_role;
