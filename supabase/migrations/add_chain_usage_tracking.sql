-- Add usage tracking for skill trees
-- Track when users save/copy chains from the library

-- Add usage count column to user_skill_trees
ALTER TABLE user_skill_trees 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Create chain_usage table to track who saved what
CREATE TABLE IF NOT EXISTS chain_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id UUID NOT NULL REFERENCES user_skill_trees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chain_id, user_id)
);

-- Enable RLS
ALTER TABLE chain_usage ENABLE ROW LEVEL SECURITY;

-- Policies for chain_usage
CREATE POLICY "Users can view their own chain usage"
    ON chain_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chain usage"
    ON chain_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to increment usage count and award XP
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

-- Trigger for chain saves
DROP TRIGGER IF EXISTS on_chain_save ON chain_usage;
CREATE TRIGGER on_chain_save
    AFTER INSERT ON chain_usage
    FOR EACH ROW
    EXECUTE FUNCTION handle_chain_save();

-- Function to track views and award XP (30 XP per 10 views)
CREATE OR REPLACE FUNCTION increment_skill_tree_views(tree_id UUID)
RETURNS void AS $$
DECLARE
    new_views INTEGER;
    creator_id UUID;
BEGIN
    -- Increment view count
    UPDATE user_skill_trees
    SET views = COALESCE(views, 0) + 1
    WHERE id = tree_id
    RETURNING views, user_id INTO new_views, creator_id;
    
    -- Award XP every 10 views
    IF new_views % 10 = 0 THEN
        UPDATE profiles
        SET xp = COALESCE(xp, 0) + 30
        WHERE id = creator_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chain_usage_chain_id ON chain_usage(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_usage_user_id ON chain_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_trees_usage_count ON user_skill_trees(usage_count DESC);
