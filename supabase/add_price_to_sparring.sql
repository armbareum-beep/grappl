-- Add price column to sparring_videos table
ALTER TABLE sparring_videos ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;

-- Add category and uniform_type if they don't exist (for consistency with drills)
ALTER TABLE sparring_videos ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE sparring_videos ADD COLUMN IF NOT EXISTS uniform_type TEXT;

-- Create index for price for efficient filtering
CREATE INDEX IF NOT EXISTS sparring_videos_price_idx ON sparring_videos(price);
