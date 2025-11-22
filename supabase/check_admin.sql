-- Check if your user has is_admin set to true
-- Run this in Supabase SQL Editor

-- First, see all users and their admin status
SELECT id, email, is_admin, created_at
FROM users
ORDER BY created_at DESC;

-- If you need to set yourself as admin, run this:
-- UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';

-- Verify the update:
-- SELECT id, email, is_admin FROM users WHERE email = 'your-email@example.com';
