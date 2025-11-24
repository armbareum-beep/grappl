-- ============================================================================
-- User Skills Schema
-- ============================================================================

-- 1. Skill Subcategories Table
CREATE TABLE IF NOT EXISTS skill_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Skills Table
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory_id UUID REFERENCES skill_subcategories(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('learning', 'mastered')) DEFAULT 'learning',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_skill_subcategories_user_id ON skill_subcategories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_course_id ON user_skills(course_id);

-- 4. RLS Policies

-- Enable RLS
ALTER TABLE skill_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

-- Skill Subcategories Policies
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

-- User Skills Policies
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

-- Public read access for Tournament/Profile views
DROP POLICY IF EXISTS "Users can view their own skills" ON user_skills;
CREATE POLICY "Public can view user skills"
  ON user_skills FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can view their own subcategories" ON skill_subcategories;
CREATE POLICY "Public can view skill subcategories"
  ON skill_subcategories FOR SELECT
  USING (true);
