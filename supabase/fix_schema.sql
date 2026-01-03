-- FIX DATABASE SCHEMA FOR SKILL TREES
-- This script ensures all necessary columns and tables exist.
-- Run this in Supabase SQL Editor to resolve 400 Bad Request errors.

-- 1. Ensure user_skill_trees has all metadata columns
DO $$
BEGIN
    -- Add description if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skill_trees' AND column_name = 'description') THEN
        ALTER TABLE user_skill_trees ADD COLUMN description TEXT;
    END IF;

    -- Add tags if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skill_trees' AND column_name = 'tags') THEN
        ALTER TABLE user_skill_trees ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    -- Add difficulty if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skill_trees' AND column_name = 'difficulty') THEN
        ALTER TABLE user_skill_trees ADD COLUMN difficulty TEXT CHECK (difficulty IN ('Basic', 'Advanced', 'Expert', 'Master'));
    END IF;

    -- Add thumbnail_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skill_trees' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE user_skill_trees ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- Add usage_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skill_trees' AND column_name = 'usage_count') THEN
        ALTER TABLE user_skill_trees ADD COLUMN usage_count INTEGER DEFAULT 0;
    END IF;

    -- Add is_featured if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skill_trees' AND column_name = 'is_featured') THEN
        ALTER TABLE user_skill_trees ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
    
    -- Add views if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skill_trees' AND column_name = 'views') THEN
        ALTER TABLE user_skill_trees ADD COLUMN views INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Ensure chain_usage table exists
CREATE TABLE IF NOT EXISTS chain_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id UUID NOT NULL REFERENCES user_skill_trees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chain_id, user_id)
);

-- 3. Enable RLS on user_skill_trees if not already enabled
ALTER TABLE user_skill_trees ENABLE ROW LEVEL SECURITY;

-- 4. Update Policies (Drop existing to avoid conflicts, then recreate)
DROP POLICY IF EXISTS "Public trees are viewable by everyone" ON user_skill_trees;
CREATE POLICY "Public trees are viewable by everyone" 
ON user_skill_trees FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own trees" ON user_skill_trees;
CREATE POLICY "Users can insert their own trees" 
ON user_skill_trees FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trees" ON user_skill_trees;
CREATE POLICY "Users can update their own trees" 
ON user_skill_trees FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trees" ON user_skill_trees;
CREATE POLICY "Users can delete their own trees" 
ON user_skill_trees FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Fix chain_usage policies
ALTER TABLE chain_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own chain usage" ON chain_usage;
CREATE POLICY "Users can view their own chain usage"
    ON chain_usage FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chain usage" ON chain_usage;
CREATE POLICY "Users can insert their own chain usage"
    ON chain_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 6. Recreate XP Triggers
CREATE OR REPLACE FUNCTION handle_chain_save()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment usage count
    UPDATE user_skill_trees
    SET usage_count = COALESCE(usage_count, 0) + 1
    WHERE id = NEW.chain_id;
    
    -- Award XP to the chain creator (50 XP for each save)
    UPDATE profiles
    SET xp = COALESCE(xp, 0) + 50
    WHERE id = (
        SELECT user_id 
        FROM user_skill_trees 
        WHERE id = NEW.chain_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chain_save ON chain_usage;
CREATE TRIGGER on_chain_save
    AFTER INSERT ON chain_usage
    FOR EACH ROW
    EXECUTE FUNCTION handle_chain_save();

-- Verification Query
SELECT 
    column_name, data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'user_skill_trees'
ORDER BY 
    column_name;
