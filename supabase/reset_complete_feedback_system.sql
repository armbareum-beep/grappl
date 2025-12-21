-- WARNING: THIS WILL DELETE ALL FEEDBACK DATA (Requests, Responses, Payments)
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Drop existing tables with CASCADE (removes constraints)
DROP TABLE IF EXISTS feedback_payments CASCADE;
DROP TABLE IF EXISTS feedback_responses CASCADE;
DROP TABLE IF EXISTS feedback_requests CASCADE;

-- 2. Create Feedback Requests
CREATE TABLE feedback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) NOT NULL,
    instructor_id UUID REFERENCES auth.users(id) NOT NULL,
    video_url TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid, completed, rejected
    feedback_content TEXT,
    payment_status TEXT DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Feedback Responses
CREATE TABLE feedback_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES feedback_requests(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Feedback Payments (Record of successful payments)
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

-- 5. Enable RLS
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_payments ENABLE ROW LEVEL SECURITY;

-- 6. Policies

-- Requests
CREATE POLICY "Students can create feedback requests"
    ON feedback_requests FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can view their own feedback requests"
    ON feedback_requests FOR SELECT USING (auth.uid() = student_id OR auth.uid() = instructor_id);
CREATE POLICY "Instructors can update feedback requests"
    ON feedback_requests FOR UPDATE USING (auth.uid() = instructor_id);

-- Responses
CREATE POLICY "Users can view responses for their requests"
    ON feedback_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests
            WHERE feedback_requests.id = feedback_responses.request_id
            AND (feedback_requests.student_id = auth.uid() OR feedback_requests.instructor_id = auth.uid())
        )
    );
CREATE POLICY "Instructors can create responses"
    ON feedback_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM feedback_requests
            WHERE feedback_requests.id = request_id
            AND feedback_requests.instructor_id = auth.uid()
        )
    );

-- Payments
CREATE POLICY "Users can view own payments"
    ON feedback_payments FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = instructor_id);

-- 7. Grants
GRANT ALL ON feedback_requests TO authenticated;
GRANT ALL ON feedback_responses TO authenticated;
GRANT ALL ON feedback_payments TO authenticated;
GRANT ALL ON feedback_requests TO service_role;
GRANT ALL ON feedback_responses TO service_role;
GRANT ALL ON feedback_payments TO service_role;
