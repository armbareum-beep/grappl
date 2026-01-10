-- Add deleted_at column to sparring_videos
ALTER TABLE sparring_videos 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Only Creator Dashboard should filter out deleted items
-- We will handle this in the application logic or create a view
-- For now, just adding the column is sufficient.

-- RLS Update (Optional: creators can't see deleted, but owners can?)
-- Actually, the simplest check is in the Application Layer for filtering.
