
-- Add is_published to sparring_videos
ALTER TABLE sparring_videos ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Policy Update (Optional but good practice)
-- Ensure public only sees published ones? 
-- The Watch.tsx will filter, but RLS is safer.
-- User said: "Videos in Reels should only show..."
-- If I change RLS, it might break the Creator Dashboard (which needs to see unpublished ones).
-- So I will Keep RLS as "Public can view all" but rely on App logic to filter, 
-- OR update RLS to "Public can view published only" + "Creator can view own".

-- Let's update policy for safety, but make sure Creator can still see their own.
DROP POLICY IF EXISTS "Public can view all sparring videos" ON sparring_videos;

CREATE POLICY "Public can view published sparring videos"
  ON sparring_videos FOR SELECT
  USING ( is_published = true OR auth.uid() = creator_id );

-- Update existing data: Set all current videos to TRUE (assuming they are legacy published)
-- OR set to FALSE?
-- User says "Don't show just uploaded".
-- Users existing feed has content. If I hide all, feed is empty.
-- I'll default existing to TRUE.
UPDATE sparring_videos SET is_published = true;
