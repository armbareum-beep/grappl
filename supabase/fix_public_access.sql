-- FIX PUBLIC ACCESS POLICY (FINAL)
-- Ensure unrestricted read access for public chains

-- 1. Enable RLS (Safety Check)
ALTER TABLE user_skill_trees ENABLE ROW LEVEL SECURITY;

-- 2. Drop restrictive policies
DROP POLICY IF EXISTS "Public trees are viewable by everyone" ON user_skill_trees;
DROP POLICY IF EXISTS "Public Select" ON user_skill_trees;

-- 3. Create the most permissive SELECT policy possible for public items
CREATE POLICY "Public Select" 
ON user_skill_trees FOR SELECT 
USING (
    is_public = true 
    OR 
    (auth.uid() = user_id)
);

-- 4. Grant access to anonymous role (just in case)
GRANT SELECT ON user_skill_trees TO anon;
GRANT SELECT ON user_skill_trees TO authenticated;

-- Confirmation
SELECT COUNT(*) as public_chains FROM user_skill_trees WHERE is_public = true;
