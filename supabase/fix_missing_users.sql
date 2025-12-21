-- FIX Missing Users and Reload Cache
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Backfill missing users from auth.users to public.users
INSERT INTO public.users (id, email, name, created_at)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 2. Force Schema Cache Reload
NOTIFY pgrst, 'reload config';

-- 3. Verify Feedback Requests Table Constraints (Just in case)
-- Ensure 'status' column exists and has default
ALTER TABLE feedback_requests ALTER COLUMN status SET DEFAULT 'pending';
