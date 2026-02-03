-- 1. Create helper function to get today's free lesson ID deterministically
CREATE OR REPLACE FUNCTION public.get_daily_free_lesson_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_today_date date;
  v_featured_lesson_id uuid;
  v_seed integer;
  v_count integer;
  v_random_index integer;
  v_fallback_lesson_id uuid;
BEGIN
  v_today_date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date;

  -- 1. Check daily_featured_content (Manual Override)
  SELECT l.id INTO v_featured_lesson_id
  FROM daily_featured_content dfc
  JOIN lessons l ON l.course_id = dfc.featured_id
  WHERE dfc.date = v_today_date 
    AND dfc.featured_type = 'course'
  ORDER BY l.lesson_number ASC
  LIMIT 1;

  IF v_featured_lesson_id IS NOT NULL THEN
    RETURN v_featured_lesson_id;
  END IF;

  -- 2. Fallback: Deterministic Random Selection
  -- Calculate seed based on date: YYYYMMDD
  v_seed := (EXTRACT(YEAR FROM v_today_date)::integer * 10000) + 
            (EXTRACT(MONTH FROM v_today_date)::integer * 100) + 
            (EXTRACT(DAY FROM v_today_date)::integer);
            
  -- Get total count of eligible lessons (published course, valid vimeo_url)
  -- Note: We use a simplified check here for performance
  SELECT count(*) INTO v_count
  FROM lessons l
  JOIN courses c ON l.course_id = c.id
  WHERE c.published = true
    AND c.price > -1 
    AND l.vimeo_url != '' 
    AND l.vimeo_url NOT LIKE 'ERROR%';

  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Calculate random index: floor((sin(seed + 456) * 10000 % 1) * count)
  -- Postgres sin() returns radians, so standard sin(x) is fine.
  -- Modulo 1 is tricky with negative numbers in some langs, but sin output is -1 to 1.
  -- We use abs() to ensure positive index.
  v_random_index := floor(abs(sin(v_seed + 456) * 10000 - floor(sin(v_seed + 456) * 10000)) * v_count)::integer;

  -- Retrieve the lesson at that index
  SELECT l.id INTO v_fallback_lesson_id
  FROM lessons l
  JOIN courses c ON l.course_id = c.id
  WHERE c.published = true
    AND c.price > -1 
    AND l.vimeo_url != '' 
    AND l.vimeo_url NOT LIKE 'ERROR%'
  ORDER BY l.created_at DESC, l.id ASC -- Deterministic ordering
  OFFSET v_random_index
  LIMIT 1;

  RETURN v_fallback_lesson_id;
END;
$function$;

-- 2. Update get_lesson_content_v2 to check for daily free lesson
CREATE OR REPLACE FUNCTION public.get_lesson_content_v2(p_lesson_id uuid)
 RETURNS TABLE(id uuid, course_id uuid, title text, description text, vimeo_url text, thumbnail_url text, lesson_number integer, duration_minutes integer, is_preview_available boolean, is_subscription_excluded boolean, created_at timestamp with time zone, is_preview boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_lesson RECORD;
  v_user_id UUID;
  v_has_access BOOLEAN;
  v_is_preview BOOLEAN;
  v_daily_free_id UUID;
  is_admin BOOLEAN;
  is_creator BOOLEAN;
  is_purchaser BOOLEAN;
  is_subscriber BOOLEAN;
  is_daily_free BOOLEAN;
BEGIN
  -- Get user ID
  v_user_id := auth.uid();
  
  -- Get lesson info
  SELECT l.*, c.creator_id, c.price INTO v_lesson
  FROM lessons l
  JOIN courses c ON l.course_id = c.id
  WHERE l.id = p_lesson_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Check Admin
  SELECT (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = v_user_id AND profiles.role = 'admin'
  )) INTO is_admin;

  -- 2. Check Creator
  is_creator := (v_user_id = v_lesson.creator_id);

  -- 3. Check Purchaser
  SELECT (EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE course_enrollments.user_id = v_user_id AND course_enrollments.course_id = v_lesson.course_id
  )) INTO is_purchaser;

  -- 4. Check Subscriber
  SELECT (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = v_user_id AND profiles.is_subscriber = true
  )) INTO is_subscriber;

  -- 5. Check Daily Free Lesson
  v_daily_free_id := get_daily_free_lesson_id();
  is_daily_free := (v_lesson.id = v_daily_free_id);

  -- Access logic: Admin, Creator, Purchaser, Subscriber (if not excluded), OR Daily Free
  v_has_access := 
    is_admin OR 
    is_creator OR 
    is_purchaser OR 
    (v_lesson.price = 0) OR
    (is_subscriber AND NOT v_lesson.is_subscription_excluded) OR
    is_daily_free;

  -- Determine if it's the first lesson (Free Preview)
  v_is_preview := (v_lesson.lesson_number = 1);

  -- Return data
  RETURN QUERY SELECT 
    v_lesson.id,
    v_lesson.course_id,
    v_lesson.title,
    v_lesson.description,
    -- Return URL if user has full access OR if it's a first lesson preview
    CASE WHEN (v_has_access OR v_is_preview) THEN v_lesson.vimeo_url ELSE NULL END,
    v_lesson.thumbnail_url,
    v_lesson.lesson_number,
    v_lesson.duration_minutes,
    v_lesson.is_preview_available,
    v_lesson.is_subscription_excluded,
    v_lesson.created_at,
    v_is_preview;
END;
$function$;
