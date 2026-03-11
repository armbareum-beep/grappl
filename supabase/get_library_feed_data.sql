-- Library Feed Data Consolidation RPC
-- Reduces 6 parallel queries to 1 atomic call for the Library "All Content" tab
-- Eliminates connection pool overhead and 10-15s cold start delay

CREATE OR REPLACE FUNCTION get_library_feed_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_featured_drill_id UUID;
    v_featured_lesson_id UUID;
    v_featured_sparring_id UUID;
    v_featured_routine_ids UUID[];
BEGIN
    -- 1. Get featured content IDs for today
    SELECT featured_id INTO v_featured_drill_id FROM daily_featured_content WHERE date = CURRENT_DATE AND featured_type = 'drill';
    SELECT featured_id INTO v_featured_lesson_id FROM daily_featured_content WHERE date = CURRENT_DATE AND featured_type = 'lesson';
    SELECT featured_id INTO v_featured_sparring_id FROM daily_featured_content WHERE date = CURRENT_DATE AND featured_type = 'sparring';

    -- Build routine IDs for the featured drill
    IF v_featured_drill_id IS NOT NULL THEN
        SELECT array_agg(routine_id) INTO v_featured_routine_ids
        FROM routine_drills
        WHERE drill_id = v_featured_drill_id;
    END IF;

    -- 2. Build the result object
    WITH 
    -- Latest 100 courses
    raw_courses AS (
        SELECT c.*, 
               cr.name as creator_name,
               cr.profile_image as creator_profile_image
        FROM courses c
        LEFT JOIN creators cr ON cr.id = c.creator_id
        WHERE c.published = true
        ORDER BY c.created_at DESC
        LIMIT 100
    ),
    -- Latest 100 routines
    raw_routines AS (
        SELECT r.*,
               (SELECT count(*) FROM routine_drills rd WHERE rd.routine_id = r.id) as drill_count,
               cr.name as creator_name,
               cr.profile_image as creator_profile_image
        FROM routines r
        LEFT JOIN creators cr ON cr.id = r.creator_id
        ORDER BY r.created_at DESC
        LIMIT 100
    ),
    -- Latest 100 sparring videos
    raw_sparring AS (
        SELECT s.*,
               cr.name as creator_name,
               cr.profile_image as creator_profile_image
        FROM sparring_videos s
        LEFT JOIN creators cr ON cr.id = s.creator_id
        WHERE s.is_published = true AND s.deleted_at IS NULL
        ORDER BY s.created_at DESC
        LIMIT 100
    )

    SELECT jsonb_build_object(
        'courses', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM raw_courses t),
        'routines', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM raw_routines t),
        'sparringVideos', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM raw_sparring t),
        'dailyFree', jsonb_build_object(
            'courseId', (SELECT course_id FROM lessons WHERE id = v_featured_lesson_id LIMIT 1),
            'sparringId', v_featured_sparring_id,
            'routineIds', COALESCE(to_jsonb(v_featured_routine_ids), '[]'::jsonb)
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
