-- Course Completion Tracking
CREATE TABLE IF NOT EXISTS user_course_completions (
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    course_id UUID REFERENCES courses(id) NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id)
);

-- User Arena Stats (Combat Power)
CREATE TABLE IF NOT EXISTS user_arena_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    standing_power INTEGER DEFAULT 0,
    guard_power INTEGER DEFAULT 0,
    guard_pass_power INTEGER DEFAULT 0,
    side_power INTEGER DEFAULT 0,
    mount_power INTEGER DEFAULT 0,
    back_power INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_course_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_arena_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own completions" ON user_course_completions;
CREATE POLICY "Users can view own completions" ON user_course_completions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own stats" ON user_arena_stats;
CREATE POLICY "Users can view own stats" ON user_arena_stats FOR SELECT USING (auth.uid() = user_id);

-- Function to check completion and grant rewards
CREATE OR REPLACE FUNCTION check_and_grant_course_completion(p_user_id UUID, p_course_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_lessons INTEGER;
    v_completed_lessons INTEGER;
    v_course_category TEXT;
    v_is_completed BOOLEAN;
    v_already_awarded BOOLEAN;
    v_xp_reward INTEGER := 50;
    v_stat_reward INTEGER := 2;
BEGIN
    -- 1. Check if already awarded
    SELECT EXISTS (SELECT 1 FROM user_course_completions WHERE user_id = p_user_id AND course_id = p_course_id)
    INTO v_already_awarded;

    IF v_already_awarded THEN
        RETURN jsonb_build_object('completed', true, 'newly_awarded', false);
    END IF;

    -- 2. Calculate progress
    -- Get total lessons
    SELECT COUNT(*) INTO v_total_lessons FROM lessons WHERE course_id = p_course_id;
    
    IF v_total_lessons = 0 THEN
        RETURN jsonb_build_object('completed', false);
    END IF;

    -- Get completed lessons (where completed = true)
    SELECT COUNT(*) INTO v_completed_lessons 
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    WHERE lp.user_id = p_user_id 
    AND l.course_id = p_course_id
    AND lp.completed = true;

    -- Check if >= 90%
    IF (v_completed_lessons::FLOAT / v_total_lessons::FLOAT) >= 0.9 THEN
        -- Mark as completed
        INSERT INTO user_course_completions (user_id, course_id) VALUES (p_user_id, p_course_id);

        -- Get category
        SELECT category INTO v_course_category FROM courses WHERE id = p_course_id;

        -- Update Arena Stats
        INSERT INTO user_arena_stats (user_id, standing_power, guard_power, guard_pass_power, side_power, mount_power, back_power)
        VALUES (p_user_id, 0, 0, 0, 0, 0, 0)
        ON CONFLICT (user_id) DO NOTHING;

        IF v_course_category = 'Standing' THEN
            UPDATE user_arena_stats SET standing_power = standing_power + v_stat_reward WHERE user_id = p_user_id;
        ELSIF v_course_category = 'Guard' THEN
            UPDATE user_arena_stats SET guard_power = guard_power + v_stat_reward WHERE user_id = p_user_id;
        ELSIF v_course_category = 'Guard Pass' THEN
            UPDATE user_arena_stats SET guard_pass_power = guard_pass_power + v_stat_reward WHERE user_id = p_user_id;
        ELSIF v_course_category = 'Side' THEN
            UPDATE user_arena_stats SET side_power = side_power + v_stat_reward WHERE user_id = p_user_id;
        ELSIF v_course_category = 'Mount' THEN
            UPDATE user_arena_stats SET mount_power = mount_power + v_stat_reward WHERE user_id = p_user_id;
        ELSIF v_course_category = 'Back' THEN
            UPDATE user_arena_stats SET back_power = back_power + v_stat_reward WHERE user_id = p_user_id;
        END IF;

        -- Update XP (Directly update user_progress)
        UPDATE user_progress 
        SET current_xp = current_xp + v_xp_reward,
            total_xp = total_xp + v_xp_reward,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        RETURN jsonb_build_object(
            'completed', true, 
            'newly_awarded', true, 
            'xp_gained', v_xp_reward, 
            'stat_gained', v_stat_reward, 
            'category', v_course_category
        );
    ELSE
        RETURN jsonb_build_object('completed', false, 'progress', v_completed_lessons::FLOAT / v_total_lessons::FLOAT);
    END IF;
END;
$$ LANGUAGE plpgsql;
