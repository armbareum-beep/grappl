-- 1. 전투력 재계산 함수 (SECURITY DEFINER 추가)
CREATE OR REPLACE FUNCTION recalculate_user_combat_power(p_user_id UUID)
RETURNS VOID 
SECURITY DEFINER -- 중요: 관리자 권한으로 실행
SET search_path = public
AS $$
DECLARE
    v_standing INTEGER := 0;
    v_guard INTEGER := 0;
    v_guard_pass INTEGER := 0;
    v_side INTEGER := 0;
    v_mount INTEGER := 0;
    v_back INTEGER := 0;
    
    -- 점수 설정
    v_enroll_points INTEGER := 10;
    v_complete_points INTEGER := 20;
BEGIN
    -- 1. 수련 중 점수 계산
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

    -- 2. 마스터 점수 추가
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

    -- 3. user_arena_stats 테이블 업데이트
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

-- 2. 트리거 함수도 SECURITY DEFINER 추가
CREATE OR REPLACE FUNCTION trigger_recalc_combat_power()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
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

-- 3. 기존 데이터 강제 재계산 (한 번 실행)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM auth.users LOOP
        PERFORM recalculate_user_combat_power(r.id);
    END LOOP;
END;
$$;
