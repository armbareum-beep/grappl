-- Create courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  thumbnail_url TEXT,
  price INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_number INTEGER NOT NULL,
  vimeo_url TEXT,
  length TEXT,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public courses read access"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Public lessons read access"
  ON lessons FOR SELECT
  USING (true);

-- Create index for better performance
CREATE INDEX lessons_course_id_idx ON lessons(course_id);
CREATE INDEX lessons_lesson_number_idx ON lessons(lesson_number);
