-- Add duration/length columns to sparring_videos
ALTER TABLE sparring_videos 
ADD COLUMN IF NOT EXISTS length TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add length column to drills (duration_minutes might already exist)
ALTER TABLE drills 
ADD COLUMN IF NOT EXISTS length TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Ensure lessons has duration_minutes (length already exists)
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
