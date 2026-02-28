-- Add status and user_id columns to testimonials table for customer review system
-- status: 'pending' (awaiting approval), 'approved' (visible on landing), 'rejected'
-- user_id: links to the user who wrote the review (nullable for admin-created reviews)

ALTER TABLE testimonials
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update existing testimonials to approved status (admin-created ones)
UPDATE testimonials SET status = 'approved' WHERE status IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status);
CREATE INDEX IF NOT EXISTS idx_testimonials_user_id ON testimonials(user_id);

-- RLS Policies
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved testimonials
DROP POLICY IF EXISTS "Public can view approved testimonials" ON testimonials;
CREATE POLICY "Public can view approved testimonials" ON testimonials
    FOR SELECT USING (status = 'approved');

-- Authenticated users can insert their own testimonials (pending status)
DROP POLICY IF EXISTS "Users can create their own testimonials" ON testimonials;
CREATE POLICY "Users can create their own testimonials" ON testimonials
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Users can view their own testimonials (any status)
DROP POLICY IF EXISTS "Users can view own testimonials" ON testimonials;
CREATE POLICY "Users can view own testimonials" ON testimonials
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Admins can do everything (using service role or admin check)
-- Note: Admin operations should use service role key or check admin status in application
