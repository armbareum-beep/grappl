-- Add related_lesson_id column to drills table for Instagram-style related content link
ALTER TABLE drills
ADD COLUMN IF NOT EXISTS related_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drills_related_lesson_id ON drills(related_lesson_id);

-- Comment for documentation
COMMENT ON COLUMN drills.related_lesson_id IS 'Optional reference to a related lesson that appears as a thumbnail in the drill reel UI';
