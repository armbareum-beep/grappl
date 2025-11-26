-- Daily Quests System
-- Create more diverse and practical daily quests

-- Function to generate daily quests for a user
CREATE OR REPLACE FUNCTION generate_daily_quests(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Delete old quests (older than today)
    DELETE FROM daily_quests 
    WHERE user_id = p_user_id 
    AND DATE(created_at) < v_today;

    -- Check if quests already exist for today
    IF EXISTS (
        SELECT 1 FROM daily_quests 
        WHERE user_id = p_user_id 
        AND DATE(created_at) = v_today
    ) THEN
        RETURN;
    END IF;

    -- Insert 6 daily quests
    INSERT INTO daily_quests (user_id, quest_type, target_count, xp_reward, created_at)
    VALUES
        -- Core training activities
        (p_user_id, 'watch_lesson', 1, 10, NOW()),
        (p_user_id, 'write_log', 1, 20, NOW()),
        (p_user_id, 'complete_drill', 1, 30, NOW()),
        
        -- Engagement activities
        (p_user_id, 'sparring_review', 1, 30, NOW()),
        (p_user_id, 'complete_routine', 1, 50, NOW()),
        
        -- Weekly special
        (p_user_id, 'tournament', 1, 50, NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate quests on login
CREATE OR REPLACE FUNCTION auto_generate_daily_quests()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM generate_daily_quests(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate quests when user progress is accessed
-- (This ensures quests are created when user logs in)
CREATE OR REPLACE TRIGGER trigger_auto_generate_quests
AFTER INSERT OR UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION auto_generate_daily_quests();

-- Manually generate quests for existing users
DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN SELECT DISTINCT user_id FROM user_progress
    LOOP
        PERFORM generate_daily_quests(v_user.user_id);
    END LOOP;
END $$;
