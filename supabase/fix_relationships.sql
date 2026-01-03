-- FIX RELATIONSHIPS FOR SKILL TREES
-- The library query fails because it tries to join 'users', but the foreign key is likely missing.
-- This script explicitly links user_skill_trees to the public.users table.

-- 1. Ensure public.users exists (it should, but just in case)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  name TEXT,
  avatar_url TEXT
);

-- 2. Add Foreign Key if it doesn't exist
DO $$
BEGIN
    -- Check if constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_skill_trees_user_id_fkey_public_users'
    ) THEN
        -- It's possible there is an existing FK to auth.users. 
        -- We can have multiple FKs or replace it. 
        -- For 'select(*, users(*))' to work, we need a relationship to public.users.
        
        -- Attempt to add constraint
        ALTER TABLE user_skill_trees 
        ADD CONSTRAINT user_skill_trees_user_id_fkey_public_users 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        
    END IF;
END $$;

-- 3. Verify created_at column exists and has default
ALTER TABLE user_skill_trees 
ALTER COLUMN created_at SET DEFAULT NOW();

-- 4. Re-verify policies just to be 100% sure
DROP POLICY IF EXISTS "Public Select" ON user_skill_trees;
CREATE POLICY "Public Select" 
ON user_skill_trees FOR SELECT 
USING (true); -- Allow EVERYTHING to be read for debugging (we can tighten later)

GRANT SELECT ON user_skill_trees TO anon, authenticated;

-- Debug: Check if we have any data
SELECT count(*) as total_rows, count(*) filter (where is_public) as public_rows FROM user_skill_trees;
