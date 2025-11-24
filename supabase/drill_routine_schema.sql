-- Drill & Routine System Schema
-- Instagram-style grid for drill routines with purchase system

-- Drills table (individual drill videos)
CREATE TABLE IF NOT EXISTS drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    vimeo_url TEXT,
    thumbnail_url TEXT,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    duration_minutes INTEGER,
    category TEXT, -- 'Guard', 'Pass', 'Back', 'Sweep', 'Submission', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routines table (collection of drills for sale)
CREATE TABLE IF NOT EXISTS routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    price INTEGER NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    category TEXT,
    total_duration_minutes INTEGER,
    drill_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for routine-drill relationship
CREATE TABLE IF NOT EXISTS routine_drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    UNIQUE(routine_id, drill_id)
);

-- User routine purchases
CREATE TABLE IF NOT EXISTS user_routine_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    routine_id UUID REFERENCES routines(id) NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'direct', -- 'direct' or 'course_bundle'
    course_id UUID REFERENCES courses(id), -- if from course bundle
    UNIQUE(user_id, routine_id)
);

-- Course-routine bundles (courses can include free routines)
CREATE TABLE IF NOT EXISTS course_routine_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, routine_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drills_creator ON drills(creator_id);
CREATE INDEX IF NOT EXISTS idx_drills_category ON drills(category);
CREATE INDEX IF NOT EXISTS idx_routines_creator ON routines(creator_id);
CREATE INDEX IF NOT EXISTS idx_routines_category ON routines(category);
CREATE INDEX IF NOT EXISTS idx_routine_drills_routine ON routine_drills(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_drills_drill ON routine_drills(drill_id);
CREATE INDEX IF NOT EXISTS idx_user_routine_purchases_user ON user_routine_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_routine_purchases_routine ON user_routine_purchases(routine_id);
CREATE INDEX IF NOT EXISTS idx_course_routine_bundles_course ON course_routine_bundles(course_id);

-- Function to update routine drill count and duration
CREATE OR REPLACE FUNCTION update_routine_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE routines
    SET drill_count = (
        SELECT COUNT(*)
        FROM routine_drills
        WHERE routine_id = NEW.routine_id
    ),
    total_duration_minutes = (
        SELECT COALESCE(SUM(d.duration_minutes), 0)
        FROM routine_drills rd
        JOIN drills d ON d.id = rd.drill_id
        WHERE rd.routine_id = NEW.routine_id
    )
    WHERE id = NEW.routine_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_routine_stats
AFTER INSERT OR DELETE ON routine_drills
FOR EACH ROW
EXECUTE FUNCTION update_routine_stats();

-- Function to auto-grant routines when course is purchased
CREATE OR REPLACE FUNCTION grant_course_routines()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert routine purchases for all routines bundled with the course
    INSERT INTO user_routine_purchases (user_id, routine_id, source, course_id)
    SELECT NEW.user_id, crb.routine_id, 'course_bundle', NEW.course_id
    FROM course_routine_bundles crb
    WHERE crb.course_id = NEW.course_id
    ON CONFLICT (user_id, routine_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grant_course_routines
AFTER INSERT ON user_course_purchases
FOR EACH ROW
EXECUTE FUNCTION grant_course_routines();

-- RLS Policies
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routine_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_routine_bundles ENABLE ROW LEVEL SECURITY;

-- Drills: Creators can manage their own, everyone can view
CREATE POLICY "Creators can manage their own drills"
    ON drills FOR ALL
    USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view drills"
    ON drills FOR SELECT
    TO authenticated
    USING (true);

-- Routines: Creators can manage their own, everyone can view
CREATE POLICY "Creators can manage their own routines"
    ON routines FOR ALL
    USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view routines"
    ON routines FOR SELECT
    TO authenticated
    USING (true);

-- Routine drills: Creators can manage
CREATE POLICY "Creators can manage routine drills"
    ON routine_drills FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_drills.routine_id
            AND routines.creator_id = auth.uid()
        )
    );

CREATE POLICY "Everyone can view routine drills"
    ON routine_drills FOR SELECT
    TO authenticated
    USING (true);

-- User routine purchases: Users can view their own
CREATE POLICY "Users can view their own routine purchases"
    ON user_routine_purchases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase routines"
    ON user_routine_purchases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Course routine bundles: Creators can manage
CREATE POLICY "Creators can manage course routine bundles"
    ON course_routine_bundles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = course_routine_bundles.course_id
            AND courses.creator_id = auth.uid()
        )
    );

CREATE POLICY "Everyone can view course routine bundles"
    ON course_routine_bundles FOR SELECT
    TO authenticated
    USING (true);
