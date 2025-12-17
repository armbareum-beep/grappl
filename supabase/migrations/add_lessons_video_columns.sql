-- Add thumbnail_url column to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add vimeo_url column if it doesn't exist
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS vimeo_url TEXT;

-- Add comment
COMMENT ON COLUMN lessons.thumbnail_url IS 'URL of the lesson thumbnail image from Vumbnail';
COMMENT ON COLUMN lessons.vimeo_url IS 'Vimeo video ID for the lesson';
