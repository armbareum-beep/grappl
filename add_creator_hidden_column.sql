-- ==============================================================================
-- ADD HIDDEN COLUMN TO CREATORS TABLE
-- Allows admins to hide creators from public view (e.g., incomplete profiles)
-- ==============================================================================

-- Step 1: Add hidden column to creators table
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- Step 2: Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_creators_hidden ON creators(hidden);

-- Step 3: Update RPC function to include hidden field (if using get_admin_creators_with_email)
-- Note: You may need to update your RPC function to include the hidden field in the SELECT
-- Example:
-- CREATE OR REPLACE FUNCTION get_admin_creators_with_email()
-- RETURNS TABLE (
--     id uuid,
--     name text,
--     bio text,
--     profile_image text,
--     subscriber_count integer,
--     email text,
--     hidden boolean
-- ) AS $$
-- BEGIN
--     RETURN QUERY
--     SELECT
--         c.id,
--         c.name,
--         c.bio,
--         c.profile_image,
--         c.subscriber_count,
--         u.email,
--         c.hidden
--     FROM creators c
--     LEFT JOIN auth.users u ON c.id = u.id
--     WHERE c.approved = true
--     ORDER BY c.created_at DESC;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification query
-- SELECT id, name, hidden FROM creators LIMIT 10;
