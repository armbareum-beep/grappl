-- 1. Add title column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_skill_trees' AND column_name = 'title') THEN
        ALTER TABLE user_skill_trees ADD COLUMN title text DEFAULT '나의 스킬 트리';
    END IF;
END $$;

-- 2. Drop UNIQUE constraint on user_id to allow multiple trees per user
-- We try to catch common constraint names for unique(user_id)
DO $$ 
BEGIN 
    -- Try to drop constraint if it exists (standard naming)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_skill_trees_user_id_key') THEN 
        ALTER TABLE user_skill_trees DROP CONSTRAINT user_skill_trees_user_id_key; 
    END IF;
    
    -- Also check for unique index
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_skill_trees_user_id_idx') THEN
        DROP INDEX user_skill_trees_user_id_idx;
    END IF;
END $$;
