-- Skill Tree System Schema
-- User skills tracking and subcategories

-- Skill Subcategories Table (create first, as user_skills references it)
CREATE TABLE IF NOT EXISTS skill_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Standing', 'Guard', 'Guard Pass', 'Side', 'Mount', 'Back')),
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category, name)
);

-- User Skills Table
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Standing', 'Guard', 'Guard Pass', 'Side', 'Mount', 'Back')),
    course_id UUID REFERENCES courses(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('learning', 'mastered')) DEFAULT 'learning',
    subcategory_id UUID REFERENCES skill_subcategories(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_category ON user_skills(category);
CREATE INDEX IF NOT EXISTS idx_user_skills_course ON user_skills(course_id);
CREATE INDEX IF NOT EXISTS idx_skill_subcategories_user ON skill_subcategories(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_subcategories_category ON skill_subcategories(category);

-- RLS Policies
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skills"
    ON user_skills FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skills"
    ON user_skills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills"
    ON user_skills FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skills"
    ON user_skills FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own subcategories"
    ON skill_subcategories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subcategories"
    ON skill_subcategories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subcategories"
    ON skill_subcategories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subcategories"
    ON skill_subcategories FOR DELETE
    USING (auth.uid() = user_id);
