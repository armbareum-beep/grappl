-- Add duration columns to ensure consistency across lessons, drills, and sparring_videos

-- 1. Lessons: add duration_minutes (lessons already has length)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='duration_minutes') THEN
        ALTER TABLE lessons ADD COLUMN duration_minutes INTEGER;
    END IF;
END $$;

-- 2. Drills: add length (drills already has duration_minutes)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drills' AND column_name='length') THEN
        ALTER TABLE drills ADD COLUMN length TEXT;
    END IF;
END $$;

-- 3. Sparring Videos: add both
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sparring_videos' AND column_name='length') THEN
        ALTER TABLE sparring_videos ADD COLUMN length TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sparring_videos' AND column_name='duration_minutes') THEN
        ALTER TABLE sparring_videos ADD COLUMN duration_minutes INTEGER;
    END IF;
END $$;

-- Update existing records in lessons (migration path if length exists)
-- This is just schema setup, actual data sync will be done via script
