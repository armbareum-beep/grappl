-- ============================================
-- View Cooldown System: 30-minute cooldown per user per content
-- ============================================

-- 1. Create view_logs table to track views per user
CREATE TABLE IF NOT EXISTS view_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content_type TEXT NOT NULL, -- 'video', 'course', 'routine', 'sparring', 'lesson', 'drill', 'skill_tree'
    content_id UUID NOT NULL,
    viewed_at TIMESTAMPTZ DEFAULT now(),

    -- Index for fast lookups
    CONSTRAINT view_logs_unique UNIQUE(user_id, content_type, content_id, viewed_at)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_view_logs_lookup
ON view_logs(user_id, content_type, content_id, viewed_at DESC);

-- Clean up old view logs (older than 1 hour) - optional, run periodically
CREATE INDEX IF NOT EXISTS idx_view_logs_cleanup ON view_logs(viewed_at);

-- 2. Enable RLS
ALTER TABLE view_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own view logs
CREATE POLICY "Users can insert their view logs" ON view_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can read their own view logs
CREATE POLICY "Users can read their view logs" ON view_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access" ON view_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Helper function to check if view should be counted
-- ============================================
CREATE OR REPLACE FUNCTION should_count_view(
    p_user_id UUID,
    p_content_type TEXT,
    p_content_id UUID,
    p_cooldown_minutes INT DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_view TIMESTAMPTZ;
BEGIN
    -- If no user_id provided, don't count (must be logged in)
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get the most recent view timestamp
    SELECT viewed_at INTO last_view
    FROM view_logs
    WHERE user_id = p_user_id
      AND content_type = p_content_type
      AND content_id = p_content_id
    ORDER BY viewed_at DESC
    LIMIT 1;

    -- If no previous view, count it
    IF last_view IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if cooldown has passed
    RETURN (now() - last_view) > (p_cooldown_minutes * INTERVAL '1 minute');
END;
$$;

-- ============================================
-- Update increment functions with cooldown
-- ============================================

-- Drop old functions first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS increment_video_views(UUID);
DROP FUNCTION IF EXISTS increment_video_views(UUID, UUID);
DROP FUNCTION IF EXISTS increment_course_views(UUID);
DROP FUNCTION IF EXISTS increment_course_views(UUID, UUID);
DROP FUNCTION IF EXISTS increment_routine_views(UUID);
DROP FUNCTION IF EXISTS increment_routine_views(UUID, UUID);
DROP FUNCTION IF EXISTS increment_sparring_views(UUID);
DROP FUNCTION IF EXISTS increment_sparring_views(UUID, UUID);
DROP FUNCTION IF EXISTS increment_sparring_view(UUID);
DROP FUNCTION IF EXISTS increment_sparring_view(UUID, UUID);
DROP FUNCTION IF EXISTS increment_lesson_views(UUID);
DROP FUNCTION IF EXISTS increment_lesson_views(UUID, UUID);
DROP FUNCTION IF EXISTS increment_drill_views(UUID);
DROP FUNCTION IF EXISTS increment_drill_views(UUID, UUID);
DROP FUNCTION IF EXISTS increment_skill_tree_views(UUID);
DROP FUNCTION IF EXISTS increment_skill_tree_views(UUID, UUID);

-- Video views
CREATE OR REPLACE FUNCTION increment_video_views(
    video_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check cooldown
    IF NOT should_count_view(p_user_id, 'video', video_id) THEN
        RETURN;
    END IF;

    -- Increment views
    UPDATE lessons
    SET views = COALESCE(views, 0) + 1
    WHERE id = video_id;

    -- Log the view
    IF p_user_id IS NOT NULL THEN
        INSERT INTO view_logs (user_id, content_type, content_id)
        VALUES (p_user_id, 'video', video_id);
    END IF;
END;
$$;

-- Course views
CREATE OR REPLACE FUNCTION increment_course_views(
    course_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT should_count_view(p_user_id, 'course', course_id) THEN
        RETURN;
    END IF;

    UPDATE courses
    SET views = COALESCE(views, 0) + 1
    WHERE id = course_id;

    IF p_user_id IS NOT NULL THEN
        INSERT INTO view_logs (user_id, content_type, content_id)
        VALUES (p_user_id, 'course', course_id);
    END IF;
END;
$$;

-- Routine views
CREATE OR REPLACE FUNCTION increment_routine_views(
    p_routine_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT should_count_view(p_user_id, 'routine', p_routine_id) THEN
        RETURN;
    END IF;

    UPDATE routines
    SET views = COALESCE(views, 0) + 1
    WHERE id = p_routine_id;

    IF p_user_id IS NOT NULL THEN
        INSERT INTO view_logs (user_id, content_type, content_id)
        VALUES (p_user_id, 'routine', p_routine_id);
    END IF;
END;
$$;

-- Sparring views (using p_video_id for backward compatibility)
CREATE OR REPLACE FUNCTION increment_sparring_views(
    p_video_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT should_count_view(p_user_id, 'sparring', p_video_id) THEN
        RETURN;
    END IF;

    UPDATE sparring_videos
    SET views = COALESCE(views, 0) + 1
    WHERE id = p_video_id;

    IF p_user_id IS NOT NULL THEN
        INSERT INTO view_logs (user_id, content_type, content_id)
        VALUES (p_user_id, 'sparring', p_video_id);
    END IF;
END;
$$;

-- Sparring view (alternate function name)
CREATE OR REPLACE FUNCTION increment_sparring_view(
    p_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT should_count_view(p_user_id, 'sparring', p_id) THEN
        RETURN;
    END IF;

    UPDATE sparring_videos
    SET views = COALESCE(views, 0) + 1
    WHERE id = p_id;

    IF p_user_id IS NOT NULL THEN
        INSERT INTO view_logs (user_id, content_type, content_id)
        VALUES (p_user_id, 'sparring', p_id);
    END IF;
END;
$$;

-- Lesson views
CREATE OR REPLACE FUNCTION increment_lesson_views(
    lesson_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT should_count_view(p_user_id, 'lesson', lesson_id) THEN
        RETURN;
    END IF;

    UPDATE lessons
    SET views = COALESCE(views, 0) + 1
    WHERE id = lesson_id;

    IF p_user_id IS NOT NULL THEN
        INSERT INTO view_logs (user_id, content_type, content_id)
        VALUES (p_user_id, 'lesson', lesson_id);
    END IF;
END;
$$;

-- Drill views
CREATE OR REPLACE FUNCTION increment_drill_views(
    p_drill_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT should_count_view(p_user_id, 'drill', p_drill_id) THEN
        RETURN;
    END IF;

    UPDATE drills
    SET views = COALESCE(views, 0) + 1
    WHERE id = p_drill_id;

    IF p_user_id IS NOT NULL THEN
        INSERT INTO view_logs (user_id, content_type, content_id)
        VALUES (p_user_id, 'drill', p_drill_id);
    END IF;
END;
$$;

-- Skill tree views
CREATE OR REPLACE FUNCTION increment_skill_tree_views(
    tree_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT should_count_view(p_user_id, 'skill_tree', tree_id) THEN
        RETURN;
    END IF;

    UPDATE skill_trees
    SET views = COALESCE(views, 0) + 1
    WHERE id = tree_id;

    IF p_user_id IS NOT NULL THEN
        INSERT INTO view_logs (user_id, content_type, content_id)
        VALUES (p_user_id, 'skill_tree', tree_id);
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION should_count_view(UUID, TEXT, UUID, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_video_views(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_course_views(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_routine_views(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_sparring_views(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_sparring_view(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_lesson_views(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_drill_views(UUID, UUID) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION increment_skill_tree_views(UUID, UUID) TO anon, authenticated, service_role;

-- ============================================
-- Optional: Cleanup old view logs (run via cron)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_view_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM view_logs
    WHERE viewed_at < now() - INTERVAL '1 hour';
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_view_logs() TO service_role;
