-- Fix RLS Policies for Drills Table

-- 1. Enable RLS on drills table
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Creators can manage (insert, update, delete, select) their own drills
DROP POLICY IF EXISTS "Creators can manage their own drills" ON drills;
CREATE POLICY "Creators can manage their own drills"
    ON drills FOR ALL
    USING (auth.uid() = creator_id);

-- 3. Policy: Everyone (authenticated users) can view all drills
DROP POLICY IF EXISTS "Everyone can view drills" ON drills;
CREATE POLICY "Everyone can view drills"
    ON drills FOR SELECT
    TO authenticated
    USING (true);

-- 4. Verify policies for Routines as well (just in case)
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can manage their own routines" ON routines;
CREATE POLICY "Creators can manage their own routines"
    ON routines FOR ALL
    USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Everyone can view routines" ON routines;
CREATE POLICY "Everyone can view routines"
    ON routines FOR SELECT
    TO authenticated
    USING (true);
