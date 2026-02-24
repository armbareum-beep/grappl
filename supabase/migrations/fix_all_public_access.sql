-- Enable public read access for all content tables
-- Run this in Supabase SQL Editor to fix slow loading for logged-out users

-- 1. Drills & Routines
DROP POLICY IF EXISTS "Everyone can view drills" ON drills;
CREATE POLICY "Everyone can view drills" ON drills FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Everyone can view routines" ON routines;
CREATE POLICY "Everyone can view routines" ON routines FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Everyone can view routine_drills" ON routine_drills;
CREATE POLICY "Everyone can view routine_drills" ON routine_drills FOR SELECT TO public USING (true);

-- 2. Courses & Lessons
DROP POLICY IF EXISTS "Everyone can view courses" ON courses;
CREATE POLICY "Everyone can view courses" ON courses FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Everyone can view lessons" ON lessons;
CREATE POLICY "Everyone can view lessons" ON lessons FOR SELECT TO public USING (true);

-- 3. Creators (Required for joins)
DROP POLICY IF EXISTS "Everyone can view creators" ON creators;
CREATE POLICY "Everyone can view creators" ON creators FOR SELECT TO public USING (true);

-- 4. Training Logs (Feed)
-- Only allow viewing public logs
DROP POLICY IF EXISTS "Everyone can view public training logs" ON training_logs;
CREATE POLICY "Everyone can view public training logs" 
ON training_logs FOR SELECT TO public 
USING (is_public = true);

-- 5. Techniques (Roadmap data)
DROP POLICY IF EXISTS "Everyone can view techniques" ON techniques;
CREATE POLICY "Everyone can view techniques" ON techniques FOR SELECT TO public USING (true);

-- 6. Users (Basic info for feed)
-- Note: Be careful with users table. Usually we only want to expose name/avatar.
-- But RLS applies to rows. We can restrict columns in the client query, but RLS must allow the row.
DROP POLICY IF EXISTS "Everyone can view basic user info" ON users;
CREATE POLICY "Everyone can view basic user info" 
ON users FOR SELECT TO public 
USING (true); 
-- Note: In a real prod app, you might want to restrict this further or use a public profile table.

-- 7. Sparring Videos (Published videos for landing page)
DROP POLICY IF EXISTS "Everyone can view published sparring videos" ON sparring_videos;
CREATE POLICY "Everyone can view published sparring videos" 
ON sparring_videos FOR SELECT TO public 
USING (published = true);

-- 8. Profiles (For creator info in sparring videos)
DROP POLICY IF EXISTS "Everyone can view profiles" ON profiles;
CREATE POLICY "Everyone can view profiles" ON profiles FOR SELECT TO public USING (true);
