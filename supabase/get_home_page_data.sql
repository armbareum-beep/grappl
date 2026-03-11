-- Home Page Data Consolidation RPC
-- Reduces 6+ parallel queries to 1 atomic call
-- Eliminates connection pool overhead during cold starts

CREATE OR REPLACE FUNCTION get_home_page_data_v2(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_featured_drill_id UUID;
    v_featured_lesson_id UUID;
    v_featured_sparring_id UUID;
BEGIN
    -- 1. Get featured content IDs for the given date
    SELECT featured_id INTO v_featured_drill_id FROM daily_featured_content WHERE date = p_date AND featured_type = 'drill';
    SELECT featured_id INTO v_featured_lesson_id FROM daily_featured_content WHERE date = p_date AND featured_type = 'lesson';
    SELECT featured_id INTO v_featured_sparring_id FROM daily_featured_content WHERE date = p_date AND featured_type = 'sparring';

    -- 2. Build the result object
    WITH 
    -- Latest 30 courses
    raw_courses AS (
        SELECT c.*, 
               (SELECT count(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count,
               cr.name as creator_name,
               cr.profile_image as creator_profile_image
        FROM courses c
        LEFT JOIN creators cr ON cr.id = c.creator_id
        WHERE c.published = true
        ORDER BY c.created_at DESC
        LIMIT 30
    ),
    -- Latest 30 routines
    raw_routines AS (
        SELECT r.*,
               cr.name as creator_name,
               cr.profile_image as creator_profile_image
        FROM routines r
        LEFT JOIN creators cr ON cr.id = r.creator_id
        ORDER BY r.created_at DESC
        LIMIT 30
    ),
    -- Latest 30 sparring videos
    raw_sparring AS (
        SELECT s.*,
               cr.name as creator_name,
               cr.profile_image as creator_profile_image
        FROM sparring_videos s
        LEFT JOIN creators cr ON cr.id = s.creator_id
        WHERE s.is_published = true AND s.deleted_at IS NULL
        ORDER BY s.created_at DESC
        LIMIT 30
    ),
    -- Pool of drills for daily selection (from paid routines)
    drill_pool AS (
        SELECT d.*, 
               cr.name as creator_name,
               cr.profile_image as creator_profile_image
        FROM routine_drills rd
        JOIN drills d ON d.id = rd.drill_id
        JOIN routines r ON r.id = rd.routine_id
        LEFT JOIN creators cr ON cr.id = d.creator_id
        WHERE r.price > 0 AND d.vimeo_url IS NOT NULL AND d.vimeo_url != '' AND d.vimeo_url NOT LIKE 'ERROR%'
    ),
    -- Pool of lessons for daily selection (from paid courses)
    lesson_pool AS (
        SELECT l.*, 
               c.title as course_title,
               c.thumbnail_url as course_thumbnail_url,
               c.creator_id as course_creator_id,
               cr.name as creator_name,
               cr.profile_image as creator_profile_image
        FROM lessons l
        JOIN courses c ON c.id = l.course_id
        LEFT JOIN creators cr ON cr.id = c.creator_id
        WHERE c.price > 0 AND l.vimeo_url IS NOT NULL AND l.vimeo_url != ''
    )

    SELECT jsonb_build_object(
        'dailyDrill', (
            SELECT to_jsonb(t) FROM (
                SELECT * FROM drill_pool 
                WHERE id = v_featured_drill_id 
                UNION ALL
                SELECT * FROM drill_pool 
                WHERE v_featured_drill_id IS NULL
                ORDER BY md5(p_date::text || id::text)
                LIMIT 1
            ) t
        ),
        'dailyLesson', (
            SELECT to_jsonb(t) FROM (
                SELECT * FROM lesson_pool 
                WHERE id = v_featured_lesson_id
                UNION ALL
                SELECT * FROM lesson_pool 
                WHERE v_featured_lesson_id IS NULL
                ORDER BY md5(p_date::text || id::text)
                LIMIT 1
            ) t
        ),
        'dailySparring', (
            SELECT to_jsonb(t) FROM (
                SELECT * FROM raw_sparring 
                WHERE id = v_featured_sparring_id
                UNION ALL
                SELECT * FROM raw_sparring 
                WHERE v_featured_sparring_id IS NULL AND price > 0
                ORDER BY md5(p_date::text || id::text)
                LIMIT 1
            ) t
        ),
        'trendingCourses', (SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM raw_courses ORDER BY (views * 0.3 + likes * 0.5 + rating * 20) DESC LIMIT 10) t),
        'newCourses', (SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM raw_courses LIMIT 10) t),
        'featuredRoutines', (SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM raw_routines ORDER BY (views * 0.3 + likes * 0.5) DESC LIMIT 12) t),
        'trendingSparring', (SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM raw_sparring ORDER BY (views * 0.3 + likes * 0.5) DESC LIMIT 10) t),
        'newRoutines', (SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM raw_routines LIMIT 12) t),
        'newSparring', (SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM raw_sparring LIMIT 12) t)
    ) INTO v_result;

    RETURN v_result;
END;
$$;
