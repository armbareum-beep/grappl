-- 1. Ensure RLS is enabled
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies for update/delete if they exist
DROP POLICY IF EXISTS "Admins and owners can update routines" ON routines;
DROP POLICY IF EXISTS "Admins and owners can delete routines" ON routines;
DROP POLICY IF EXISTS "Creators can update own routines" ON routines;
DROP POLICY IF EXISTS "Creators can delete own routines" ON routines;

-- 3. Create new comprehensive policies
-- Admin check using the users table (linked via id)
CREATE POLICY "Admins and owners can update routines" ON routines
FOR UPDATE
TO authenticated
USING (
    creator_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins and owners can delete routines" ON routines
FOR DELETE
TO authenticated
USING (
    creator_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- Ensure public select is still there (already in fix_all_public_access.sql, but good to be sure)
DROP POLICY IF EXISTS "Everyone can view routines" ON routines;
CREATE POLICY "Everyone can view routines" ON routines
FOR SELECT
TO public
USING (true);

-- Ensure routine_drills also has admin policies
ALTER TABLE routine_drills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and owners can manage routine_drills" ON routine_drills;
CREATE POLICY "Admins and owners can manage routine_drills" ON routine_drills
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM routines r
        WHERE r.id = routine_id AND (
            r.creator_id = auth.uid() OR 
            EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin = true)
        )
    )
);
