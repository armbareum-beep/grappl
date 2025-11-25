-- ============================================================================
-- GRAPPL MASTER SCHEMA - COMPLETE DATABASE SETUP
-- This file contains ALL schemas needed for the application
-- Safe to run multiple times (uses IF NOT EXISTS and ON CONFLICT)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TECHNIQUE MASTERY SYSTEM (NEW - 2024-11-25)
-- ============================================================================

-- Technique Master List
CREATE TABLE IF NOT EXISTS techniques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL CHECK (category IN ('Standing', 'Guard', 'Guard Pass', 'Side', 'Mount', 'Back')),
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    
    -- Combat Impact Weights (0.0 - 1.0)
    impact_standing DECIMAL(3,2) DEFAULT 0.0,
    impact_guard DECIMAL(3,2) DEFAULT 0.0,
    impact_pass DECIMAL(3,2) DEFAULT 0.0,
    impact_submission DECIMAL(3,2) DEFAULT 0.0,
    
    -- Related content
    recommended_course_ids UUID[],
    recommended_drill_ids UUID[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, name)
);

CREATE INDEX IF NOT EXISTS idx_techniques_category ON techniques(category);

-- User Technique Mastery Progress
CREATE TABLE IF NOT EXISTS user_technique_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    technique_id UUID REFERENCES techniques(id) NOT NULL,
    
    mastery_level INTEGER DEFAULT 1 CHECK (mastery_level >= 1 AND mastery_level <= 6),
    mastery_xp INTEGER DEFAULT 0,
    progress_percent DECIMAL(5,2) DEFAULT 0.0,
    
    total_success_count INTEGER DEFAULT 0,
    total_attempt_count INTEGER DEFAULT 0,
    last_success_date DATE,
    last_practice_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, technique_id)
);

CREATE INDEX IF NOT EXISTS idx_user_technique_mastery_user ON user_technique_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_technique_mastery_technique ON user_technique_mastery(technique_id);
CREATE INDEX IF NOT EXISTS idx_user_technique_mastery_level ON user_technique_mastery(mastery_level DESC);

-- Technique XP Transactions
CREATE TABLE IF NOT EXISTS technique_xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    technique_id UUID REFERENCES techniques(id) NOT NULL,
    
    xp_amount INTEGER NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'course_lesson', 'routine_completion', 'drill_practice',
        'sparring_success', 'sparring_attempt', 'training_log',
        'feed_post', 'instructor_endorsement', 'manual'
    )),
    source_id UUID,
    
    old_level INTEGER,
    new_level INTEGER,
    old_xp INTEGER,
    new_xp INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_technique_xp_user ON technique_xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_technique_xp_technique ON technique_xp_transactions(technique_id);
CREATE INDEX IF NOT EXISTS idx_technique_xp_created ON technique_xp_transactions(created_at DESC);

-- Technique Relations
CREATE TABLE IF NOT EXISTS technique_course_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technique_id UUID REFERENCES techniques(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(technique_id, course_id)
);

CREATE TABLE IF NOT EXISTS technique_drill_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technique_id UUID REFERENCES techniques(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(technique_id, drill_id)
);

CREATE TABLE IF NOT EXISTS technique_routine_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technique_id UUID REFERENCES techniques(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(technique_id, routine_id)
);

-- User Technique Goals
CREATE TABLE IF NOT EXISTS user_technique_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    technique_id UUID REFERENCES techniques(id) NOT NULL,
    target_level INTEGER CHECK (target_level >= 1 AND target_level <= 6),
    target_month DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, technique_id, target_month)
);

-- ============================================================================
-- TECHNIQUE MASTERY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_technique_xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    CASE level
        WHEN 1 THEN RETURN 0;
        WHEN 2 THEN RETURN 100;
        WHEN 3 THEN RETURN 300;
        WHEN 4 THEN RETURN 600;
        WHEN 5 THEN RETURN 1000;
        WHEN 6 THEN RETURN 1500;
        ELSE RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_mastery_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF xp >= 1500 THEN RETURN 6;
    ELSIF xp >= 1000 THEN RETURN 5;
    ELSIF xp >= 600 THEN RETURN 4;
    ELSIF xp >= 300 THEN RETURN 3;
    ELSIF xp >= 100 THEN RETURN 2;
    ELSE RETURN 1;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_mastery_progress(xp INTEGER, level INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    current_level_xp INTEGER;
    next_level_xp INTEGER;
    progress DECIMAL;
BEGIN
    current_level_xp := get_technique_xp_for_level(level);
    
    IF level >= 6 THEN
        RETURN 100.0;
    END IF;
    
    next_level_xp := get_technique_xp_for_level(level + 1);
    
    IF next_level_xp = current_level_xp THEN
        RETURN 0.0;
    END IF;
    
    progress := ((xp - current_level_xp)::DECIMAL / (next_level_xp - current_level_xp)::DECIMAL) * 100.0;
    RETURN LEAST(100.0, GREATEST(0.0, progress));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION award_technique_xp(
    p_user_id UUID,
    p_technique_id UUID,
    p_xp_amount INTEGER,
    p_source_type TEXT,
    p_source_id UUID DEFAULT NULL,
    p_is_success BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
    leveled_up BOOLEAN,
    old_level INTEGER,
    new_level INTEGER,
    new_xp INTEGER,
    combat_stats_updated JSONB
) AS $$
DECLARE
    v_old_xp INTEGER;
    v_new_xp INTEGER;
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_progress DECIMAL;
    v_technique RECORD;
    v_combat_impact JSONB;
BEGIN
    SELECT * INTO v_technique FROM techniques WHERE id = p_technique_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Technique not found';
    END IF;
    
    INSERT INTO user_technique_mastery (user_id, technique_id, mastery_xp, mastery_level)
    VALUES (p_user_id, p_technique_id, 0, 1)
    ON CONFLICT (user_id, technique_id) DO NOTHING;
    
    SELECT mastery_xp, mastery_level
    INTO v_old_xp, v_old_level
    FROM user_technique_mastery
    WHERE user_id = p_user_id AND technique_id = p_technique_id;
    
    v_new_xp := v_old_xp + p_xp_amount;
    v_new_level := calculate_mastery_level(v_new_xp);
    v_progress := calculate_mastery_progress(v_new_xp, v_new_level);
    
    UPDATE user_technique_mastery
    SET 
        mastery_xp = v_new_xp,
        mastery_level = v_new_level,
        progress_percent = v_progress,
        total_attempt_count = total_attempt_count + 1,
        total_success_count = CASE WHEN p_is_success THEN total_success_count + 1 ELSE total_success_count END,
        last_success_date = CASE WHEN p_is_success THEN CURRENT_DATE ELSE last_success_date END,
        last_practice_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = p_user_id AND technique_id = p_technique_id;
    
    INSERT INTO technique_xp_transactions (
        user_id, technique_id, xp_amount, source_type, source_id,
        old_level, new_level, old_xp, new_xp
    ) VALUES (
        p_user_id, p_technique_id, p_xp_amount, p_source_type, p_source_id,
        v_old_level, v_new_level, v_old_xp, v_new_xp
    );
    
    v_combat_impact := jsonb_build_object(
        'standing', (p_xp_amount * v_technique.impact_standing)::INTEGER,
        'guard', (p_xp_amount * v_technique.impact_guard)::INTEGER,
        'pass', (p_xp_amount * v_technique.impact_pass)::INTEGER,
        'submission', (p_xp_amount * v_technique.impact_submission)::INTEGER
    );
    
    RETURN QUERY SELECT 
        (v_new_level > v_old_level) as leveled_up,
        v_old_level,
        v_new_level,
        v_new_xp,
        v_combat_impact;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_technique_summary(p_user_id UUID)
RETURNS TABLE(
    category TEXT,
    total_techniques BIGINT,
    mastered_techniques BIGINT,
    avg_mastery_level DECIMAL,
    total_xp BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.category,
        COUNT(*)::BIGINT as total_techniques,
        COUNT(*) FILTER (WHERE utm.mastery_level >= 5)::BIGINT as mastered_techniques,
        AVG(utm.mastery_level)::DECIMAL as avg_mastery_level,
        SUM(utm.mastery_xp)::BIGINT as total_xp
    FROM user_technique_mastery utm
    JOIN techniques t ON t.id = utm.technique_id
    WHERE utm.user_id = p_user_id
    GROUP BY t.category;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES FOR TECHNIQUE MASTERY
-- ============================================================================

ALTER TABLE techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_technique_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE technique_xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE technique_course_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE technique_drill_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE technique_routine_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_technique_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view techniques" ON techniques;
CREATE POLICY "Anyone can view techniques"
    ON techniques FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can view their own mastery" ON user_technique_mastery;
CREATE POLICY "Users can view their own mastery"
    ON user_technique_mastery FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own XP transactions" ON technique_xp_transactions;
CREATE POLICY "Users can view their own XP transactions"
    ON technique_xp_transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view technique-course links" ON technique_course_links;
CREATE POLICY "Anyone can view technique-course links"
    ON technique_course_links FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Anyone can view technique-drill links" ON technique_drill_links;
CREATE POLICY "Anyone can view technique-drill links"
    ON technique_drill_links FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Anyone can view technique-routine links" ON technique_routine_links;
CREATE POLICY "Anyone can view technique-routine links"
    ON technique_routine_links FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can manage their own goals" ON user_technique_goals;
CREATE POLICY "Users can manage their own goals"
    ON user_technique_goals FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA: BJJ TECHNIQUES
-- ============================================================================

INSERT INTO techniques (category, name, name_en, difficulty, impact_standing, impact_guard, impact_pass, impact_submission) VALUES
-- Standing
('Standing', '싱글 레그 테이크다운', 'Single Leg Takedown', 'Beginner', 1.0, 0.0, 0.0, 0.0),
('Standing', '더블 레그 테이크다운', 'Double Leg Takedown', 'Beginner', 1.0, 0.0, 0.0, 0.0),
('Standing', '풀 가드', 'Pull Guard', 'Beginner', 0.8, 0.2, 0.0, 0.0),

-- Guard
('Guard', '트라이앵글 초크', 'Triangle Choke', 'Intermediate', 0.0, 0.5, 0.0, 0.5),
('Guard', '암바', 'Armbar from Guard', 'Intermediate', 0.0, 0.5, 0.0, 0.5),
('Guard', '스윕 (시저 스윕)', 'Scissor Sweep', 'Beginner', 0.0, 0.7, 0.3, 0.0),
('Guard', '데라히바 가드', 'De La Riva Guard', 'Advanced', 0.0, 0.9, 0.1, 0.0),

-- Guard Pass
('Guard Pass', '토리안도 패스', 'Toreando Pass', 'Intermediate', 0.0, 0.0, 1.0, 0.0),
('Guard Pass', '니 슬라이스 패스', 'Knee Slice Pass', 'Beginner', 0.0, 0.0, 1.0, 0.0),
('Guard Pass', '레그 드래그', 'Leg Drag', 'Advanced', 0.0, 0.0, 1.0, 0.0),

-- Side
('Side', '사이드 컨트롤 유지', 'Side Control Maintenance', 'Beginner', 0.0, 0.0, 0.5, 0.5),
('Side', '키무라', 'Kimura from Side', 'Intermediate', 0.0, 0.0, 0.3, 0.7),
('Side', '아메리카나', 'Americana', 'Beginner', 0.0, 0.0, 0.3, 0.7),

-- Mount
('Mount', '마운트 유지', 'Mount Maintenance', 'Beginner', 0.0, 0.0, 0.5, 0.5),
('Mount', '크로스 칼라 초크', 'Cross Collar Choke', 'Intermediate', 0.0, 0.0, 0.2, 0.8),
('Mount', '암바 (마운트)', 'Armbar from Mount', 'Intermediate', 0.0, 0.0, 0.2, 0.8),

-- Back
('Back', '백 컨트롤 유지', 'Back Control Maintenance', 'Intermediate', 0.0, 0.0, 0.3, 0.7),
('Back', '리어 네이키드 초크', 'Rear Naked Choke', 'Beginner', 0.0, 0.0, 0.1, 0.9),
('Back', '보우 앤 애로우 초크', 'Bow and Arrow Choke', 'Advanced', 0.0, 0.0, 0.1, 0.9)
ON CONFLICT (category, name) DO NOTHING;

-- ============================================================================
-- COMPLETE! 
-- ============================================================================
-- This schema is now ready for both Dev and Production environments.
-- Run this file in Supabase SQL Editor to set up the technique mastery system.
-- ============================================================================
