-- Allow public read access to drills and routines
-- Run this in your Supabase SQL Editor

-- 1. Update Drills Policy
DROP POLICY IF EXISTS "Everyone can view drills" ON drills;
CREATE POLICY "Everyone can view drills"
    ON drills FOR SELECT
    TO public
    USING (true);

-- 2. Update Routines Policy
DROP POLICY IF EXISTS "Everyone can view routines" ON routines;
CREATE POLICY "Everyone can view routines"
    ON routines FOR SELECT
    TO public
    USING (true);
