-- Add admin support for creator management
-- This allows admins to create/edit content on behalf of other creators

-- Add is_admin column to creators table if it doesn't exist
ALTER TABLE creators ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM creators
        WHERE id = auth.uid()
        AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update routines RLS policies to allow admins
DROP POLICY IF EXISTS "Creators can manage their own routines" ON routines;

CREATE POLICY "Creators and admins can manage routines"
    ON routines FOR ALL
    TO authenticated
    USING (
        auth.uid() = creator_id
        OR is_admin()
    )
    WITH CHECK (
        auth.uid() = creator_id
        OR is_admin()
    );

-- Update routine_drills policies to allow admins
DROP POLICY IF EXISTS "Creators can insert routine drills" ON routine_drills;
DROP POLICY IF EXISTS "Creators can update routine drills" ON routine_drills;
DROP POLICY IF EXISTS "Creators can delete routine drills" ON routine_drills;

CREATE POLICY "Creators and admins can insert routine drills"
    ON routine_drills FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND (routines.creator_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Creators and admins can update routine drills"
    ON routine_drills FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND (routines.creator_id = auth.uid() OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND (routines.creator_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Creators and admins can delete routine drills"
    ON routine_drills FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND (routines.creator_id = auth.uid() OR is_admin())
        )
    );

-- Also update drills policies to allow admins
DROP POLICY IF EXISTS "Creators can manage their own drills" ON drills;

CREATE POLICY "Creators and admins can manage drills"
    ON drills FOR ALL
    TO authenticated
    USING (
        auth.uid() = creator_id
        OR is_admin()
    )
    WITH CHECK (
        auth.uid() = creator_id
        OR is_admin()
    );

-- Update courses policies if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Creators can manage their own courses') THEN
        DROP POLICY "Creators can manage their own courses" ON courses;
        CREATE POLICY "Creators and admins can manage courses"
            ON courses FOR ALL
            TO authenticated
            USING (
                auth.uid() = creator_id
                OR is_admin()
            )
            WITH CHECK (
                auth.uid() = creator_id
                OR is_admin()
            );
    END IF;
END $$;

-- Update lessons policies if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lessons') THEN
        DROP POLICY IF EXISTS "Creators can manage their own lessons" ON lessons;
        CREATE POLICY "Creators and admins can manage lessons"
            ON lessons FOR ALL
            TO authenticated
            USING (
                auth.uid() = creator_id
                OR is_admin()
            )
            WITH CHECK (
                auth.uid() = creator_id
                OR is_admin()
            );
    END IF;
END $$;
