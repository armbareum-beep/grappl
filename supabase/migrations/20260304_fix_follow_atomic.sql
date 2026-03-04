-- ==========================================================================
-- Fix follow toggle and subscriber count
--
-- Problems fixed:
-- 1. CHECK constraints on user_interactions excluded 'creator'/'follow',
--    causing insert to fail when toggling creator follow.
-- 2. toggle_user_interaction RPC was non-atomic (2 round trips, race condition).
--    Replaced with INSERT ... ON CONFLICT DO NOTHING pattern.
-- 3. update_creator_subscriber_count trigger could produce negative counts.
--    Fixed with GREATEST(0, ...) guard.
-- 4. Repairs any existing negative subscriber_count values.
-- ==========================================================================


-- 1. Fix CHECK constraints to include 'creator' and 'follow' (idempotent)
ALTER TABLE public.user_interactions
  DROP CONSTRAINT IF EXISTS user_interactions_content_type_check;
ALTER TABLE public.user_interactions
  ADD CONSTRAINT user_interactions_content_type_check
  CHECK (content_type IN ('drill', 'lesson', 'course', 'routine', 'sparring', 'creator'));

ALTER TABLE public.user_interactions
  DROP CONSTRAINT IF EXISTS user_interactions_interaction_type_check;
ALTER TABLE public.user_interactions
  ADD CONSTRAINT user_interactions_interaction_type_check
  CHECK (interaction_type IN ('save', 'like', 'view', 'follow'));


-- 2. Replace toggle_user_interaction with an atomic INSERT-or-DELETE version.
--    Uses auth.uid() directly so the caller never needs to pass a user_id,
--    and the function is safe even if called concurrently.

-- Drop old signature (UUID, TEXT, UUID, TEXT) that is no longer used.
DROP FUNCTION IF EXISTS public.toggle_user_interaction(UUID, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.toggle_user_interaction(
    p_content_type    TEXT,
    p_content_id      UUID,
    p_interaction_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Try to insert. If the unique row already exists, skip (DO NOTHING).
    INSERT INTO public.user_interactions (user_id, content_type, content_id, interaction_type)
    VALUES (v_user_id, p_content_type, p_content_id, p_interaction_type)
    ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;

    IF FOUND THEN
        -- Row was newly inserted → interaction is now active
        RETURN TRUE;
    ELSE
        -- Row already existed → remove it (toggle off)
        DELETE FROM public.user_interactions
        WHERE user_id         = v_user_id
          AND content_type    = p_content_type
          AND content_id      = p_content_id
          AND interaction_type = p_interaction_type;
        RETURN FALSE;
    END IF;
END;
$$;


-- 3. Fix subscriber_count trigger: GREATEST(0, ...) prevents negative values.
--    Re-create the function and trigger idempotently.

CREATE OR REPLACE FUNCTION public.update_creator_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT'
        AND NEW.content_type    = 'creator'
        AND NEW.interaction_type = 'follow'
    THEN
        UPDATE public.creators
        SET subscriber_count = subscriber_count + 1
        WHERE id = NEW.content_id;

    ELSIF TG_OP = 'DELETE'
        AND OLD.content_type    = 'creator'
        AND OLD.interaction_type = 'follow'
    THEN
        -- GREATEST(0, ...) ensures the count never goes below zero
        UPDATE public.creators
        SET subscriber_count = GREATEST(0, subscriber_count - 1)
        WHERE id = OLD.content_id;
    END IF;

    RETURN NULL;
END;
$$;

-- Ensure trigger exists on user_interactions (drop first to handle re-runs)
DROP TRIGGER IF EXISTS on_creator_follow_change ON public.user_interactions;
CREATE TRIGGER on_creator_follow_change
AFTER INSERT OR DELETE ON public.user_interactions
FOR EACH ROW EXECUTE FUNCTION public.update_creator_subscriber_count();

-- Remove the stale trigger from creator_follows if that table still exists
DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_follow_change ON public.creator_follows;
EXCEPTION
    WHEN undefined_table THEN NULL;  -- creator_follows already dropped, ignore
END
$$;


-- 4. Repair any negative subscriber_count values caused by prior drift
UPDATE public.creators
SET subscriber_count = (
    SELECT COUNT(*)::INTEGER
    FROM public.user_interactions
    WHERE content_type    = 'creator'
      AND interaction_type = 'follow'
      AND content_id       = creators.id
)
WHERE subscriber_count < 0;
