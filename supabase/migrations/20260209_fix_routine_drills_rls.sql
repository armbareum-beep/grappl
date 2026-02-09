-- Fix routine_drills RLS policy for INSERT operations
-- The previous policy used USING clause for all operations, but INSERT needs WITH CHECK

-- Drop the old policy
DROP POLICY IF EXISTS "Creators can manage routine drills" ON routine_drills;

-- Create separate policies for different operations
-- SELECT policy
CREATE POLICY "Creators can view routine drills"
    ON routine_drills FOR SELECT
    TO authenticated
    USING (true);

-- INSERT policy with WITH CHECK clause
CREATE POLICY "Creators can insert routine drills"
    ON routine_drills FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND routines.creator_id = auth.uid()
        )
    );

-- UPDATE policy
CREATE POLICY "Creators can update routine drills"
    ON routine_drills FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND routines.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND routines.creator_id = auth.uid()
        )
    );

-- DELETE policy
CREATE POLICY "Creators can delete routine drills"
    ON routine_drills FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND routines.creator_id = auth.uid()
        )
    );
