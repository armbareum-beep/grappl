-- Add approved column to creators table for admin approval
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Only approved creators can create courses
-- Update existing creators to approved (for migration)
UPDATE creators SET approved = true WHERE approved IS NULL OR approved = false;
