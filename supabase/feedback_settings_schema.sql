-- Feedback Settings Table
CREATE TABLE IF NOT EXISTS feedback_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    price INTEGER DEFAULT 50000,
    turnaround_days INTEGER DEFAULT 3,
    max_active_requests INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings (to see price/availability)
DROP POLICY IF EXISTS "Everyone can view feedback settings" ON feedback_settings;
CREATE POLICY "Everyone can view feedback settings"
    ON feedback_settings FOR SELECT
    USING (true);

-- Instructors can update their own settings
DROP POLICY IF EXISTS "Instructors can update their own settings" ON feedback_settings;
CREATE POLICY "Instructors can update their own settings"
    ON feedback_settings FOR ALL
    USING (auth.uid() = instructor_id);

-- Feedback Requests Table (if not already exists, ensuring it matches requirements)
CREATE TABLE IF NOT EXISTS feedback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) NOT NULL,
    instructor_id UUID REFERENCES auth.users(id) NOT NULL,
    video_url TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'completed', 'rejected'
    feedback_text TEXT,
    payment_status TEXT DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Feedback Requests
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests (as student or instructor)
DROP POLICY IF EXISTS "Users can view their own feedback requests" ON feedback_requests;
CREATE POLICY "Users can view their own feedback requests"
    ON feedback_requests FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = instructor_id);

-- Students can create requests
DROP POLICY IF EXISTS "Students can create feedback requests" ON feedback_requests;
CREATE POLICY "Students can create feedback requests"
    ON feedback_requests FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Instructors can update requests (to add feedback)
DROP POLICY IF EXISTS "Instructors can update feedback requests" ON feedback_requests;
CREATE POLICY "Instructors can update feedback requests"
    ON feedback_requests FOR UPDATE
    USING (auth.uid() = instructor_id);
