-- ============================================================================
-- USER SKILL TREES - Custom Technique Roadmap
-- ============================================================================
-- This table stores user-customized skill tree layouts
-- Users can add techniques, position them freely, and create connections
-- ============================================================================

-- User Skill Trees Table
CREATE TABLE IF NOT EXISTS user_skill_trees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    tree_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_skill_trees_user ON user_skill_trees(user_id);

-- Updated At Trigger
CREATE OR REPLACE FUNCTION update_user_skill_trees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_skill_trees_updated_at ON user_skill_trees;
CREATE TRIGGER trigger_update_user_skill_trees_updated_at
    BEFORE UPDATE ON user_skill_trees
    FOR EACH ROW
    EXECUTE FUNCTION update_user_skill_trees_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE user_skill_trees ENABLE ROW LEVEL SECURITY;

-- Users can view their own skill tree
DROP POLICY IF EXISTS "Users can view their own skill tree" ON user_skill_trees;
CREATE POLICY "Users can view their own skill tree"
    ON user_skill_trees FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own skill tree
DROP POLICY IF EXISTS "Users can insert their own skill tree" ON user_skill_trees;
CREATE POLICY "Users can insert their own skill tree"
    ON user_skill_trees FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own skill tree
DROP POLICY IF EXISTS "Users can update their own skill tree" ON user_skill_trees;
CREATE POLICY "Users can update their own skill tree"
    ON user_skill_trees FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own skill tree
DROP POLICY IF EXISTS "Users can delete their own skill tree" ON user_skill_trees;
CREATE POLICY "Users can delete their own skill tree"
    ON user_skill_trees FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to initialize empty skill tree for new users
CREATE OR REPLACE FUNCTION initialize_user_skill_tree(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_tree_id UUID;
BEGIN
    INSERT INTO user_skill_trees (user_id, tree_data)
    VALUES (p_user_id, '{"nodes": [], "edges": []}'::jsonb)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO v_tree_id;
    
    RETURN v_tree_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Run this in Supabase SQL Editor to create the user_skill_trees table
-- ============================================================================
