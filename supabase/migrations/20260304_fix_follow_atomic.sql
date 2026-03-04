-- ==========================================================================
-- Fix follow toggle and subscriber count
--
-- Problems fixed:
-- 1. CHECK constraints on user_interactions excluded 'creator'/'follow',
--    causing insert to fail when toggling creator follow.
-- 2. toggle_user_interaction RPC was non-atomic (2 round trips, race condition).
--    Replaced with INSERT ... ON CONFLICT DO NOTHING pattern.
-- 3. subscriber_count was updated by a separate trigger that is NOT SECURITY
--    DEFINER, causing it to silently fail when called from the SECURITY DEFINER
--    RPC. Moved the count update inside the RPC itself.
-- 4. Removed the trigger entirely to avoid double-counting.
-- 5. Repairs any existing negative subscriber_count values.
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


-- 2. Drop old 4-param signature that required a user_id argument.
DROP FUNCTION IF EXISTS public.toggle_user_interaction(UUID, TEXT, UUID, TEXT);

-- 3. Atomic toggle RPC that also updates subscriber_count inline.
--    SECURITY DEFINER ensures the UPDATE on creators always has permission,
--    regardless of RLS or the calling role. All three operations (INSERT/DELETE
--    on user_interactions + UPDATE on creators) happen in a single transaction.
CREATE OR REPLACE FUNCTION public.toggle_user_interaction(
    p_content_type     TEXT,
    p_content_id       UUID,
    p_interaction_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id     UUID := auth.uid();
    v_was_inserted BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Attempt INSERT. On UNIQUE conflict the row already exists — skip silently.
    INSERT INTO public.user_interactions (user_id, content_type, content_id, interaction_type)
    VALUES (v_user_id, p_content_type, p_content_id, p_interaction_type)
    ON CONFLICT (user_id, content_type, content_id, interaction_type) DO NOTHING;

    v_was_inserted := FOUND;

    IF NOT v_was_inserted THEN
        -- Row already existed → delete it (unfollow / unlike / unsave)
        DELETE FROM public.user_interactions
        WHERE user_id          = v_user_id
          AND content_type     = p_content_type
          AND content_id       = p_content_id
          AND interaction_type = p_interaction_type;
    END IF;

    -- For creator follows: update subscriber_count in the same transaction.
    -- Doing this inline (rather than via trigger) guarantees the UPDATE runs
    -- with SECURITY DEFINER privileges and is never skipped.
    IF p_content_type = 'creator' AND p_interaction_type = 'follow' THEN
        IF v_was_inserted THEN
            UPDATE public.creators
               SET subscriber_count = subscriber_count + 1
             WHERE id = p_content_id;
        ELSE
            -- GREATEST(0, ...) prevents the count from going negative
            UPDATE public.creators
               SET subscriber_count = GREATEST(0, subscriber_count - 1)
             WHERE id = p_content_id;
        END IF;
    END IF;

    RETURN v_was_inserted;  -- TRUE = followed/liked/saved, FALSE = removed
END;
$$;


-- 4. Drop the old trigger and its function.
--    The count update now lives inside the RPC above; keeping both would
--    double-count every follow/unfollow.
DROP TRIGGER IF EXISTS on_creator_follow_change ON public.user_interactions;
DROP FUNCTION IF EXISTS public.update_creator_subscriber_count();

-- Remove the stale trigger from creator_follows if that table still exists
DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_follow_change ON public.creator_follows;
EXCEPTION
    WHEN undefined_table THEN NULL;  -- creator_follows already dropped, ignore
END
$$;


-- 5. Repair any subscriber_count values that went negative from prior drift
UPDATE public.creators
SET subscriber_count = (
    SELECT COUNT(*)::INTEGER
    FROM public.user_interactions
    WHERE content_type     = 'creator'
      AND interaction_type = 'follow'
      AND content_id       = creators.id
)
WHERE subscriber_count < 0;
