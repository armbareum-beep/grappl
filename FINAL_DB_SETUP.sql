-- ==========================================
-- FINAL DATABASE SETUP SCRIPT
-- Run this in Supabase SQL Editor to fix all issues
-- ==========================================

-- 1. Make course_id nullable in lessons table (for standalone lessons)
ALTER TABLE lessons 
DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;

ALTER TABLE lessons 
ALTER COLUMN course_id DROP NOT NULL;

-- Re-add constraint with SET NULL on delete
ALTER TABLE lessons 
ADD CONSTRAINT lessons_course_id_fkey 
FOREIGN KEY (course_id) 
REFERENCES courses(id) 
ON DELETE SET NULL;

-- 2. Add missing video columns to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS vimeo_url TEXT;

-- 3. Add creator_id to lessons table (optional but recommended for easier authenticaton)
-- For now we rely on the implementation that filters by course ownership, 
-- but adding this would allow "Select * from lessons where creator_id = X"
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id);

-- 4. Grant permissions (just in case)
GRANT ALL ON lessons TO authenticated;
GRANT ALL ON lessons TO service_role;

-- Comments
COMMENT ON COLUMN lessons.course_id IS 'Can be NULL for standalone lessons';
COMMENT ON COLUMN lessons.vimeo_url IS 'Vimeo Video ID';
COMMENT ON COLUMN lessons.thumbnail_url IS 'Thumbnail URL from Vumbnail';
