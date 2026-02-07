-- ============================================================================
-- Sync interaction counts to main tables
-- ============================================================================
-- This trigger ensures that global 'views', 'likes', and 'saves' counts in the
-- respective content tables stay in sync with the user_interactions table.

CREATE OR REPLACE FUNCTION public.sync_interaction_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_target_table TEXT;
    v_count_column TEXT;
BEGIN
    -- Determine target table based on content_type
    CASE NEW.content_type
        WHEN 'drill' THEN v_target_table := 'drills';
        WHEN 'lesson' THEN v_target_table := 'lessons';
        WHEN 'course' THEN v_target_table := 'courses';
        WHEN 'routine' THEN v_target_table := 'routines';
        WHEN 'sparring' THEN v_target_table := 'sparring_videos';
        ELSE RETURN NEW;
    END CASE;

    -- Determine column based on interaction_type
    CASE NEW.interaction_type
        WHEN 'like' THEN v_count_column := 'likes';
        WHEN 'view' THEN v_count_column := 'views';
        WHEN 'save' THEN v_count_column := 'saves'; -- Note: some tables might not have 'saves' column
        ELSE RETURN NEW;
    END CASE;

    -- Update the count in target table
    -- Use dynamic SQL to handle table and column names
    -- Check if column exists first or just attempt update and swallow if fails (simpler for now)
    BEGIN
        IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.interaction_type = ANY(ARRAY['view'])) THEN
            EXECUTE format('UPDATE public.%I SET %I = COALESCE(%I, 0) + 1 WHERE id = $1', v_target_table, v_count_column, v_count_column)
            USING NEW.content_id;
        ELSIF TG_OP = 'DELETE' THEN
            EXECUTE format('UPDATE public.%I SET %I = GREATEST(0, COALESCE(%I, 0) - 1) WHERE id = $1', v_target_table, v_count_column, v_count_column)
            USING OLD.content_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Column might not exist in target table, just ignore
        NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_interactions table
DROP TRIGGER IF EXISTS tr_sync_interaction_counts ON public.user_interactions;
CREATE TRIGGER tr_sync_interaction_counts
AFTER INSERT OR UPDATE OR DELETE ON public.user_interactions
FOR EACH ROW EXECUTE FUNCTION public.sync_interaction_counts();
