-- Restore the missing public SELECT policy for routines
-- The previous migration removed "Everyone can view routines" but didn't recreate it

-- Add back the public SELECT policy for routines
CREATE POLICY IF NOT EXISTS "Everyone can view routines"
    ON routines FOR SELECT
    TO authenticated
    USING (true);
