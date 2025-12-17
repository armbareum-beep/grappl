-- Make course_id nullable in lessons table
-- This allows lessons to be created independently without being assigned to a course

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE lessons 
DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;

-- Step 2: Make course_id nullable
ALTER TABLE lessons 
ALTER COLUMN course_id DROP NOT NULL;

-- Step 3: Recreate the foreign key constraint (now allowing NULL)
ALTER TABLE lessons 
ADD CONSTRAINT lessons_course_id_fkey 
FOREIGN KEY (course_id) 
REFERENCES courses(id) 
ON DELETE SET NULL;

-- Add a comment to document this change
COMMENT ON COLUMN lessons.course_id IS 'Course ID - can be null for standalone lessons that haven''t been assigned to a course yet';
