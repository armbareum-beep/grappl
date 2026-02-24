-- ==============================================================================
-- MIGRATE CREATOR FOLLOWS TO USER_INTERACTIONS
-- Unifies follow functionality with other interactions (save, like, view)
-- ==============================================================================

-- Step 1: Update CHECK constraints to allow 'creator' content_type and 'follow' interaction_type

-- Drop existing CHECK constraints
ALTER TABLE user_interactions DROP CONSTRAINT IF EXISTS user_interactions_content_type_check;
ALTER TABLE user_interactions DROP CONSTRAINT IF EXISTS user_interactions_interaction_type_check;

-- Add new CHECK constraints with 'creator' and 'follow' included
ALTER TABLE user_interactions
ADD CONSTRAINT user_interactions_content_type_check
CHECK (content_type IN ('drill', 'lesson', 'course', 'routine', 'sparring', 'creator'));

ALTER TABLE user_interactions
ADD CONSTRAINT user_interactions_interaction_type_check
CHECK (interaction_type IN ('save', 'like', 'view', 'follow'));

-- Step 2: Migrate existing creator_follows data to user_interactions
-- This preserves all existing follow relationships
INSERT INTO user_interactions (user_id, content_type, content_id, interaction_type, created_at, last_interacted_at)
SELECT
    follower_id as user_id,
    'creator' as content_type,
    creator_id as content_id,
    'follow' as interaction_type,
    created_at,
    created_at as last_interacted_at
FROM creator_follows
ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;

-- Step 3: Update trigger for subscriber_count to work with user_interactions
-- Drop old triggers first (both from creator_follows and user_interactions)
DROP TRIGGER IF EXISTS on_follow_change ON creator_follows;
DROP TRIGGER IF EXISTS on_creator_follow_change ON user_interactions;

-- Now we can drop the function
DROP FUNCTION IF EXISTS update_creator_subscriber_count();

-- Create new trigger function for user_interactions
CREATE OR REPLACE FUNCTION update_creator_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if this is a 'creator' content_type and 'follow' interaction_type
    IF (TG_OP = 'INSERT' AND NEW.content_type = 'creator' AND NEW.interaction_type = 'follow') THEN
        UPDATE creators
        SET subscriber_count = subscriber_count + 1
        WHERE id = NEW.content_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.content_type = 'creator' AND OLD.interaction_type = 'follow') THEN
        UPDATE creators
        SET subscriber_count = subscriber_count - 1
        WHERE id = OLD.content_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_interactions for follow actions
CREATE TRIGGER on_creator_follow_change
AFTER INSERT OR DELETE ON user_interactions
FOR EACH ROW
EXECUTE FUNCTION update_creator_subscriber_count();

-- Step 4: Drop the old creator_follows table (optional - uncomment if you want to remove it)
-- Make sure migration is successful before uncommenting!
-- DROP TABLE IF EXISTS creator_follows CASCADE;

-- Verification query (optional - run this to verify migration)
-- SELECT
--     'creator_follows' as source, COUNT(*) as count
-- FROM creator_follows
-- UNION ALL
-- SELECT
--     'user_interactions (follow)' as source, COUNT(*) as count
-- FROM user_interactions
-- WHERE content_type = 'creator' AND interaction_type = 'follow';
