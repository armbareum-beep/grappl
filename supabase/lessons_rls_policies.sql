-- Add RLS policies for lessons table to allow creators to manage their lessons

-- Creators can insert lessons for their own courses
CREATE POLICY "Creators can insert lessons for their courses"
ON lessons FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_id
    AND courses.creator_id = auth.uid()
  )
);

-- Creators can update lessons for their own courses
CREATE POLICY "Creators can update their lessons"
ON lessons FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_id
    AND courses.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_id
    AND courses.creator_id = auth.uid()
  )
);

-- Creators can delete lessons for their own courses
CREATE POLICY "Creators can delete their lessons"
ON lessons FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_id
    AND courses.creator_id = auth.uid()
  )
);
