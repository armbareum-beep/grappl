-- Add status column to routines table for content approval workflow
ALTER TABLE routines
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Update existing routines to 'approved' (they were created before approval system)
UPDATE routines SET status = 'approved' WHERE status IS NULL OR status = 'draft';

-- Add comment for documentation
COMMENT ON COLUMN routines.status IS 'Content status: draft, pending, approved, rejected';
