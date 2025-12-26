-- ==============================================================================
-- SPARRING INTERACTIONS MIGRATION
-- Adds support for Creator Follows and Sparring Video Likes
-- ==============================================================================

-- 1. Creator Follows Table
CREATE TABLE IF NOT EXISTS creator_follows (
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, creator_id)
);

-- Enable RLS for creator_follows
ALTER TABLE creator_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all follows"
    ON creator_follows FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own follows"
    ON creator_follows FOR ALL
    USING (auth.uid() = follower_id)
    WITH CHECK (auth.uid() = follower_id);


-- 2. Sparring Video Likes Table
CREATE TABLE IF NOT EXISTS user_sparring_likes (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES sparring_videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, video_id)
);

-- Enable RLS for user_sparring_likes
ALTER TABLE user_sparring_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all sparring likes"
    ON user_sparring_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own sparring likes"
    ON user_sparring_likes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ==============================================================================
-- TRIGGERS FOR COUNTS
-- ==============================================================================

-- Trigger to update creator subscriber_count
CREATE OR REPLACE FUNCTION update_creator_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE creators
        SET subscriber_count = subscriber_count + 1
        WHERE id = NEW.creator_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE creators
        SET subscriber_count = subscriber_count - 1
        WHERE id = OLD.creator_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_follow_change ON creator_follows;
CREATE TRIGGER on_follow_change
AFTER INSERT OR DELETE ON creator_follows
FOR EACH ROW EXECUTE FUNCTION update_creator_subscriber_count();


-- Trigger to update sparring video likes count
CREATE OR REPLACE FUNCTION update_sparring_video_likes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE sparring_videos
        SET likes = likes + 1
        WHERE id = NEW.video_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE sparring_videos
        SET likes = likes - 1
        WHERE id = OLD.video_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_sparring_like_change ON user_sparring_likes;
CREATE TRIGGER on_sparring_like_change
AFTER INSERT OR DELETE ON user_sparring_likes
FOR EACH ROW EXECUTE FUNCTION update_sparring_video_likes();
