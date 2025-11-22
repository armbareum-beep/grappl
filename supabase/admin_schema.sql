-- Admin Dashboard Schema
-- Add is_admin column to users table for admin permissions

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- RLS Policy: Admins can update creator approval status
DROP POLICY IF EXISTS "Admins can update creator approval" ON creators;

CREATE POLICY "Admins can update creator approval"
ON creators FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- Note: To make yourself an admin, run:
-- UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
