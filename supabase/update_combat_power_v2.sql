-- Function to recalculate combat power based on enrollments and completions
CREATE OR REPLACE FUNCTION recalculate_user_combat_power(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_standing INTEGER := 0;
    v_guard INTEGER := 0;
    v_guard_pass INTEGER := 0;
    v_side INTEGER := 0;
    v_mount INTEGER := 0;
    v_back INTEGER := 0;
    
    -- Points configuration
    v_enroll_points INTEGER := 10; -- Points for just enrolling (Training)
    v_complete_points INTEGER := 20; -- EXTRA points for completion (Master)
BEGIN
    -- 1. Calculate points from Enrollments (user_courses)
    SELECT 
        COALESCE(SUM(CASE WHEN c.category = 'Standing' THEN v_enroll_points ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN c.category = 'Guard' THEN v_enroll_points ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN c.category = 'Guard Pass' THEN v_enroll_points ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN c.category = 'Side' THEN v_enroll_points ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN c.category = 'Mount' THEN v_enroll_points ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN c.category = 'Back' THEN v_enroll_points ELSE 0 END), 0)
    INTO v_standing, v_guard, v_guard_pass, v_side, v_mount, v_back
    FROM user_courses uc
    JOIN courses c ON uc.course_id = c.id
    WHERE uc.user_id = p_user_id;

    -- 2. Add points from Completions (user_course_completions)
    DECLARE
        v_c_standing INTEGER;
        v_c_guard INTEGER;
        v_c_guard_pass INTEGER;
        v_c_side INTEGER;
        v_c_mount INTEGER;
        v_c_back INTEGER;
    BEGIN
        SELECT 
            COALESCE(SUM(CASE WHEN c.category = 'Standing' THEN v_complete_points ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN c.category = 'Guard' THEN v_complete_points ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN c.category = 'Guard Pass' THEN v_complete_points ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN c.category = 'Side' THEN v_complete_points ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN c.category = 'Mount' THEN v_complete_points ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN c.category = 'Back' THEN v_complete_points ELSE 0 END), 0)
        INTO v_c_standing, v_c_guard, v_c_guard_pass, v_c_side, v_c_mount, v_c_back
        FROM user_course_completions ucc
        JOIN courses c ON ucc.course_id = c.id
        WHERE ucc.user_id = p_user_id;

        v_standing := v_standing + v_c_standing;
        v_guard := v_guard + v_c_guard;
        v_guard_pass := v_guard_pass + v_c_guard_pass;
        v_side := v_side + v_c_side;
        v_mount := v_mount + v_c_mount;
        v_back := v_back + v_c_back;
    END;

    -- 3. Update user_arena_stats
    INSERT INTO user_arena_stats (user_id, standing_power, guard_power, guard_pass_power, side_power, mount_power, back_power, updated_at)
    VALUES (p_user_id, v_standing, v_guard, v_guard_pass, v_side, v_mount, v_back, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET
        standing_power = EXCLUDED.standing_power,
        guard_power = EXCLUDED.guard_power,
        guard_pass_power = EXCLUDED.guard_pass_power,
        side_power = EXCLUDED.side_power,
        mount_power = EXCLUDED.mount_power,
        back_power = EXCLUDED.back_power,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger Function
CREATE OR REPLACE FUNCTION trigger_recalc_combat_power()
RETURNS TRIGGER AS $$
DECLARE
    v_uid UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_uid := OLD.user_id;
    ELSE
        v_uid := NEW.user_id;
    END IF;
    PERFORM recalculate_user_combat_power(v_uid);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS on_enrollment_combat_power ON user_courses;
CREATE TRIGGER on_enrollment_combat_power
AFTER INSERT OR DELETE ON user_courses
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_combat_power();

DROP TRIGGER IF EXISTS on_completion_combat_power ON user_course_completions;
CREATE TRIGGER on_completion_combat_power
AFTER INSERT OR DELETE ON user_course_completions
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_combat_power();
