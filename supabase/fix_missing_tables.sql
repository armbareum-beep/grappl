-- Fix missing tables for XP and Quests system

-- 1. Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    belt_level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    last_quest_reset TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create daily_quests table
CREATE TABLE IF NOT EXISTS daily_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_type TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    xp_reward INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    quest_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create xp_transactions table (referenced in api.ts)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source TEXT NOT NULL,
    source_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create add_xp function
CREATE OR REPLACE FUNCTION add_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT,
    p_source_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_current_xp INTEGER;
    v_total_xp INTEGER;
    v_belt_level INTEGER;
BEGIN
    -- Get current progress
    SELECT total_xp INTO v_total_xp
    FROM user_progress
    WHERE user_id = p_user_id;

    -- If no progress, create it
    IF v_total_xp IS NULL THEN
        INSERT INTO user_progress (user_id, belt_level, current_xp, total_xp)
        VALUES (p_user_id, 1, 0, 0)
        RETURNING total_xp INTO v_total_xp;
    END IF;

    -- Update total XP
    v_total_xp := v_total_xp + p_amount;

    -- Update user_progress
    UPDATE user_progress
    SET 
        total_xp = v_total_xp,
        current_xp = current_xp + p_amount, -- Simplified, logic in API handles level up calculation usually, but this keeps DB in sync
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO xp_transactions (user_id, amount, source, source_id)
    VALUES (p_user_id, p_amount, p_source, p_source_id);
END;
$$ LANGUAGE plpgsql;

-- 5. Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- user_progress
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
CREATE POLICY "Users can view their own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress;
CREATE POLICY "Users can update their own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress;
CREATE POLICY "Users can insert their own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- daily_quests
DROP POLICY IF EXISTS "Users can view their own quests" ON daily_quests;
CREATE POLICY "Users can view their own quests"
    ON daily_quests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quests" ON daily_quests;
CREATE POLICY "Users can update their own quests"
    ON daily_quests FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quests" ON daily_quests;
CREATE POLICY "Users can insert their own quests"
    ON daily_quests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- xp_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON xp_transactions;
CREATE POLICY "Users can view their own transactions"
    ON xp_transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON xp_transactions;
CREATE POLICY "Users can insert their own transactions"
    ON xp_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
