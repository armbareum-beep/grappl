-- ============================================================================
-- Migrate existing data to user_interactions table
-- ============================================================================
-- This script safely migrates all existing save/like/view data from legacy
-- tables to the new unified user_interactions table.
-- 
-- IMPORTANT: Run this AFTER creating the user_interactions table
-- All migrations check for table existence before attempting to migrate
-- ============================================================================

-- ============================================================================
-- 1. Migrate user_saved_courses (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_saved_courses'
    ) THEN
        INSERT INTO public.user_interactions (user_id, content_type, content_id, interaction_type, created_at)
        SELECT 
            user_id, 
            'course' as content_type, 
            course_id as content_id, 
            'save' as interaction_type, 
            created_at
        FROM public.user_saved_courses
        ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;
        
        RAISE NOTICE 'Migrated user_saved_courses';
    ELSE
        RAISE NOTICE 'Table user_saved_courses does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 2. Migrate user_saved_routines (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_saved_routines'
    ) THEN
        INSERT INTO public.user_interactions (user_id, content_type, content_id, interaction_type, created_at)
        SELECT 
            user_id, 
            'routine' as content_type, 
            routine_id as content_id, 
            'save' as interaction_type, 
            created_at
        FROM public.user_saved_routines
        ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;
        
        RAISE NOTICE 'Migrated user_saved_routines';
    ELSE
        RAISE NOTICE 'Table user_saved_routines does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 3. Migrate user_saved_lessons (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_saved_lessons'
    ) THEN
        INSERT INTO public.user_interactions (user_id, content_type, content_id, interaction_type, created_at)
        SELECT 
            user_id, 
            'lesson' as content_type, 
            lesson_id as content_id, 
            'save' as interaction_type, 
            created_at
        FROM public.user_saved_lessons
        ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;
        
        RAISE NOTICE 'Migrated user_saved_lessons';
    ELSE
        RAISE NOTICE 'Table user_saved_lessons does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 4. Migrate user_course_likes (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_course_likes'
    ) THEN
        INSERT INTO public.user_interactions (user_id, content_type, content_id, interaction_type, created_at)
        SELECT 
            user_id, 
            'course' as content_type, 
            course_id as content_id, 
            'like' as interaction_type, 
            created_at
        FROM public.user_course_likes
        ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;
        
        RAISE NOTICE 'Migrated user_course_likes';
    ELSE
        RAISE NOTICE 'Table user_course_likes does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 5. Migrate user_routine_views (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_routine_views'
    ) THEN
        INSERT INTO public.user_interactions (
            user_id, content_type, content_id, interaction_type, 
            view_count, last_interacted_at, created_at
        )
        SELECT 
            user_id, 
            'routine' as content_type, 
            routine_id as content_id, 
            'view' as interaction_type,
            view_count,
            last_watched_at as last_interacted_at,
            created_at
        FROM public.user_routine_views
        ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;
        
        RAISE NOTICE 'Migrated user_routine_views';
    ELSE
        RAISE NOTICE 'Table user_routine_views does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 6. Migrate user_sparring_views (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sparring_views'
    ) THEN
        INSERT INTO public.user_interactions (
            user_id, content_type, content_id, interaction_type, 
            view_count, last_interacted_at, created_at
        )
        SELECT 
            user_id, 
            'sparring' as content_type, 
            video_id as content_id,  -- Changed from sparring_id
            'view' as interaction_type,
            view_count,
            last_watched_at as last_interacted_at,
            created_at
        FROM public.user_sparring_views
        ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;
        
        RAISE NOTICE 'Migrated user_sparring_views';
    ELSE
        RAISE NOTICE 'Table user_sparring_views does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 7. Migrate drill_saves (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'drill_saves'
    ) THEN
        INSERT INTO public.user_interactions (user_id, content_type, content_id, interaction_type, created_at)
        SELECT 
            user_id, 
            'drill' as content_type, 
            drill_id as content_id, 
            'save' as interaction_type, 
            created_at
        FROM public.drill_saves
        ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;
        
        RAISE NOTICE 'Migrated drill_saves';
    ELSE
        RAISE NOTICE 'Table drill_saves does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 8. Migrate sparring_saves (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sparring_saves'
    ) THEN
        INSERT INTO public.user_interactions (user_id, content_type, content_id, interaction_type, created_at)
        SELECT 
            user_id, 
            'sparring' as content_type, 
            sparring_id as content_id, 
            'save' as interaction_type, 
            created_at
        FROM public.sparring_saves
        ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;
        
        RAISE NOTICE 'Migrated sparring_saves';
    ELSE
        RAISE NOTICE 'Table sparring_saves does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 9. Migrate lesson_saves (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lesson_saves'
    ) THEN
        INSERT INTO public.user_interactions (user_id, content_type, content_id, interaction_type, created_at)
        SELECT 
            user_id, 
            'lesson' as content_type, 
            lesson_id as content_id, 
            'save' as interaction_type, 
            created_at
        FROM public.lesson_saves
        ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;
        
        RAISE NOTICE 'Migrated lesson_saves';
    ELSE
        RAISE NOTICE 'Table lesson_saves does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- Verification: Count migrated records
-- ============================================================================

DO $$
DECLARE
    v_total_count INTEGER;
    v_save_count INTEGER;
    v_like_count INTEGER;
    v_view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM public.user_interactions;
    SELECT COUNT(*) INTO v_save_count FROM public.user_interactions WHERE interaction_type = 'save';
    SELECT COUNT(*) INTO v_like_count FROM public.user_interactions WHERE interaction_type = 'like';
    SELECT COUNT(*) INTO v_view_count FROM public.user_interactions WHERE interaction_type = 'view';
    
    RAISE NOTICE '=== Migration Complete ===';
    RAISE NOTICE 'Total interactions migrated: %', v_total_count;
    RAISE NOTICE '  - Saves: %', v_save_count;
    RAISE NOTICE '  - Likes: %', v_like_count;
    RAISE NOTICE '  - Views: %', v_view_count;
    RAISE NOTICE '========================';
END $$;

-- ============================================================================
-- IMPORTANT: DO NOT DROP OLD TABLES YET
-- ============================================================================
-- Keep the old tables until you've verified the migration is successful
-- and the new API functions are working correctly in production.
-- 
-- To drop old tables later (AFTER VERIFICATION):
-- DROP TABLE IF EXISTS public.user_saved_courses CASCADE;
-- DROP TABLE IF EXISTS public.user_saved_routines CASCADE;
-- DROP TABLE IF EXISTS public.user_saved_lessons CASCADE;
-- DROP TABLE IF EXISTS public.user_course_likes CASCADE;
-- DROP TABLE IF EXISTS public.user_routine_views CASCADE;
-- DROP TABLE IF EXISTS public.user_sparring_views CASCADE;
-- DROP TABLE IF EXISTS public.drill_saves CASCADE;
-- DROP TABLE IF EXISTS public.sparring_saves CASCADE;
-- DROP TABLE IF EXISTS public.lesson_saves CASCADE;
-- ============================================================================
