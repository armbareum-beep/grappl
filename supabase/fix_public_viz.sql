-- FIX PUBLIC ACCESS POLICY
-- Ensure public chains are truly public for everyone (even anonymous users)

-- 1. Drop existing select policy
DROP POLICY IF EXISTS "Public trees are viewable by everyone" ON user_skill_trees;

-- 2. Create correct policy allowing access if is_public is true OR user is the owner
CREATE POLICY "Public trees are viewable by everyone" 
ON user_skill_trees FOR SELECT 
USING (
    is_public = true 
    OR 
    (auth.uid() = user_id)
);

-- 3. Ensure anonymous access works (if using anon key)
GRANT SELECT ON user_skill_trees TO anon, authenticated;

-- 4. Verify Policy
SELECT * FROM pg_policies WHERE tablename = 'user_skill_trees';
