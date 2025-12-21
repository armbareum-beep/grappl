-- WARNING: THIS WILL DELETE ALL FEEDBACK REQUEST DATA
-- Use this if you are okay with resetting the test data to fix the schema

DROP TABLE IF EXISTS feedback_requests;

-- Now recreate it correctly
CREATE TABLE feedback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) NOT NULL,
    instructor_id UUID REFERENCES auth.users(id) NOT NULL,
    video_url TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- Using TEXT to avoid Enum issues
    feedback_content TEXT,
    payment_status TEXT DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can create feedback requests"
    ON feedback_requests FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can view their own feedback requests"
    ON feedback_requests FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = instructor_id);

CREATE POLICY "Instructors can update feedback requests"
    ON feedback_requests FOR UPDATE
    USING (auth.uid() = instructor_id);

-- Grant permissions
GRANT ALL ON feedback_requests TO authenticated;
GRANT ALL ON feedback_requests TO service_role;
