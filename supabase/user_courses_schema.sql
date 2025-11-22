-- Create user_courses table (for purchased courses)
CREATE TABLE user_courses (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  price_paid INTEGER NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

-- Enable RLS
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own purchased courses"
  ON user_courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own course purchases"
  ON user_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX user_courses_user_id_idx ON user_courses(user_id);
CREATE INDEX user_courses_course_id_idx ON user_courses(course_id);
