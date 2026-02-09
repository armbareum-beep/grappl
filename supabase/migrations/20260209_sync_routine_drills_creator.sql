-- ============================================================================
-- Sync routine drills creator when routine creator changes
-- ============================================================================
-- When a routine's creator is changed, automatically update all associated
-- drills to have the same creator

-- Function to sync drill creators when routine creator changes
CREATE OR REPLACE FUNCTION sync_routine_drills_creator()
RETURNS TRIGGER AS $$
BEGIN
    -- When routine creator changes, update all associated drills
    IF NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
        UPDATE drills
        SET creator_id = NEW.creator_id
        WHERE id IN (
            SELECT drill_id
            FROM routine_drills
            WHERE routine_id = NEW.id
        );

        RAISE NOTICE 'Updated % drills to creator %',
            (SELECT COUNT(*) FROM routine_drills WHERE routine_id = NEW.id),
            NEW.creator_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on routines table
DROP TRIGGER IF EXISTS sync_routine_creator_to_drills ON routines;

CREATE TRIGGER sync_routine_creator_to_drills
AFTER UPDATE ON routines
FOR EACH ROW
WHEN (NEW.creator_id IS DISTINCT FROM OLD.creator_id)
EXECUTE FUNCTION sync_routine_drills_creator();

-- ============================================================================
-- Fix existing data: sync all routine drills to match their routine creator
-- ============================================================================

UPDATE drills d
SET creator_id = r.creator_id
FROM routine_drills rd
JOIN routines r ON r.id = rd.routine_id
WHERE d.id = rd.drill_id
AND d.creator_id != r.creator_id;

-- Show summary of fixed drills
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fixed_count
    FROM drills d
    JOIN routine_drills rd ON d.id = rd.drill_id
    JOIN routines r ON r.id = rd.routine_id
    WHERE d.creator_id = r.creator_id;

    RAISE NOTICE '✅ Synced drills with their routine creators. Total drills in routines: %', fixed_count;
END $$;
