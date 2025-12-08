-- Force enable public access for all content
-- Run this in Supabase SQL Editor
-- IMPORTANT: Make sure you're running this in the correct schema (public)

-- 1. Drills
ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Drills" ON public.drills;
CREATE POLICY "Public View Drills" ON public.drills FOR SELECT TO public USING (true);

-- 2. Routines
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Routines" ON public.routines;
CREATE POLICY "Public View Routines" ON public.routines FOR SELECT TO public USING (true);

-- 3. Routine Drills (Join table) - CRITICAL FOR FREE DRILLS
ALTER TABLE public.routine_drills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Routine Drills" ON public.routine_drills;
CREATE POLICY "Public View Routine Drills" ON public.routine_drills FOR SELECT TO public USING (true);

-- 4. Courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Courses" ON public.courses;
CREATE POLICY "Public View Courses" ON public.courses FOR SELECT TO public USING (true);

-- 5. Lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Lessons" ON public.lessons;
CREATE POLICY "Public View Lessons" ON public.lessons FOR SELECT TO public USING (true);

-- 6. Creators (Essential for joins)
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Creators" ON public.creators;
CREATE POLICY "Public View Creators" ON public.creators FOR SELECT TO public USING (true);

-- 7. Users (Basic info for feed)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Basic User Info" ON public.users;
CREATE POLICY "Public View Basic User Info" ON public.users FOR SELECT TO public USING (true);

-- 8. Training Logs (Public feed posts only)
ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Public Training Logs" ON public.training_logs;
CREATE POLICY "Public View Public Training Logs" 
ON public.training_logs FOR SELECT TO public 
USING (is_public = true);

-- 9. Course Drill Bundles (CRITICAL FOR BONUS DRILLS)
ALTER TABLE public.course_drill_bundles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Course Drill Bundles" ON public.course_drill_bundles;
CREATE POLICY "Public View Course Drill Bundles" ON public.course_drill_bundles FOR SELECT TO public USING (true);
