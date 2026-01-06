-- Add category column to lessons table for technique roadmap categorization
-- This allows standalone lessons to be categorized by technique type

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN lessons.category IS 'Technique category for roadmap classification (e.g., Standing, Guard, Mount, etc.)';
