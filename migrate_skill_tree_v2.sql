-- 1. Add missing columns to user_skill_trees
ALTER TABLE user_skill_trees 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;

-- 2. Create RPC function for incrementing views
CREATE OR REPLACE FUNCTION increment_skill_tree_views(tree_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_skill_trees
    SET views = views + 1
    WHERE id = tree_id;
END;
$$;

-- 3. Update RLS policies (Ensure public can read public trees)
DROP POLICY IF EXISTS "Public can view public skill trees" ON user_skill_trees;
CREATE POLICY "Public can view public skill trees"
ON user_skill_trees FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

-- 4. Ensure owner can do everything
DROP POLICY IF EXISTS "Users can manage their own skill trees" ON user_skill_trees;
CREATE POLICY "Users can manage their own skill trees"
ON user_skill_trees FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
