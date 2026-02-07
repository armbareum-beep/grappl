-- ============================================================================
-- Create unified user_interactions table
-- ============================================================================
-- This table consolidates all user save/like/view interactions into one place
-- Replaces: user_saved_courses, user_saved_routines, user_saved_lessons,
--           user_course_likes, user_routine_views, user_sparring_views, etc.
-- ============================================================================

-- Drop existing table if re-running migration (WARNING: loses data)
-- Comment this out if you want to preserve existing data
DROP TABLE IF EXISTS public.user_interactions CASCADE;

CREATE TABLE public.user_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Polymorphic reference to content
    content_type TEXT NOT NULL CHECK (content_type IN ('drill', 'lesson', 'course', 'routine', 'sparring')),
    content_id UUID NOT NULL,
    
    -- Type of interaction
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('save', 'like', 'view')),
    
    -- Metadata (primarily for 'view' interactions)
    view_count INTEGER DEFAULT 1,
    last_interacted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one interaction type per content per user
    UNIQUE(user_id, content_type, content_id, interaction_type)
);

-- ============================================================================
-- Create indexes for optimal query performance
-- ============================================================================

-- User's all interactions
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id 
    ON public.user_interactions(user_id);

-- Find all interactions for specific content
CREATE INDEX IF NOT EXISTS idx_user_interactions_content 
    ON public.user_interactions(content_type, content_id);

-- User's interactions by type (e.g., all saves)
CREATE INDEX IF NOT EXISTS idx_user_interactions_type 
    ON public.user_interactions(user_id, interaction_type);

-- Recent interactions (for activity feeds)
CREATE INDEX IF NOT EXISTS idx_user_interactions_recent 
    ON public.user_interactions(user_id, last_interacted_at DESC);

-- Composite index for checking if user has specific interaction
CREATE INDEX IF NOT EXISTS idx_user_interactions_check
    ON public.user_interactions(user_id, content_type, content_id, interaction_type);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Users can view their own interactions
DROP POLICY IF EXISTS "Users can view own interactions" ON public.user_interactions;
CREATE POLICY "Users can view own interactions"
    ON public.user_interactions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own interactions
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.user_interactions;
CREATE POLICY "Users can insert own interactions"
    ON public.user_interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own interactions (e.g., increment view count)
DROP POLICY IF EXISTS "Users can update own interactions" ON public.user_interactions;
CREATE POLICY "Users can update own interactions"
    ON public.user_interactions FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own interactions
DROP POLICY IF EXISTS "Users can delete own interactions" ON public.user_interactions;
CREATE POLICY "Users can delete own interactions"
    ON public.user_interactions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- Helper function to toggle interaction
-- ============================================================================

CREATE OR REPLACE FUNCTION public.toggle_user_interaction(
    p_user_id UUID,
    p_content_type TEXT,
    p_content_id UUID,
    p_interaction_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check if interaction exists
    SELECT EXISTS (
        SELECT 1 FROM public.user_interactions
        WHERE user_id = p_user_id
        AND content_type = p_content_type
        AND content_id = p_content_id
        AND interaction_type = p_interaction_type
    ) INTO v_exists;

    IF v_exists THEN
        -- Remove interaction
        DELETE FROM public.user_interactions
        WHERE user_id = p_user_id
        AND content_type = p_content_type
        AND content_id = p_content_id
        AND interaction_type = p_interaction_type;
        
        RETURN FALSE; -- Interaction removed
    ELSE
        -- Add interaction
        INSERT INTO public.user_interactions (
            user_id, content_type, content_id, interaction_type
        ) VALUES (
            p_user_id, p_content_type, p_content_id, p_interaction_type
        );
        
        RETURN TRUE; -- Interaction added
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper function to record/update view
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_content_view(
    p_user_id UUID,
    p_content_type TEXT,
    p_content_id UUID
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_interactions (
        user_id, content_type, content_id, interaction_type, view_count, last_interacted_at
    ) VALUES (
        p_user_id, p_content_type, p_content_id, 'view', 1, NOW()
    )
    ON CONFLICT (user_id, content_type, content_id, interaction_type)
    DO UPDATE SET
        view_count = user_interactions.view_count + 1,
        last_interacted_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.user_interactions IS 'Unified table for all user interactions (save, like, view) with content';
COMMENT ON COLUMN public.user_interactions.content_type IS 'Type of content: drill, lesson, course, routine, sparring';
COMMENT ON COLUMN public.user_interactions.interaction_type IS 'Type of interaction: save, like, view';
COMMENT ON COLUMN public.user_interactions.view_count IS 'Number of times viewed (only for view interactions)';
