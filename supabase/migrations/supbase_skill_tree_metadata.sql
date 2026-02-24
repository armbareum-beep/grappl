-- Add metadata columns to user_skill_trees table
ALTER TABLE user_skill_trees 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS difficulty TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_skill_tree_views(tree_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_skill_trees
  SET view_count = view_count + 1
  WHERE id = tree_id;
END;
$$ LANGUAGE plpgsql;

-- Check if bucket exists, if not create 'skill-tree-thumbnails'
INSERT INTO storage.buckets (id, name, public)
VALUES ('skill-tree-thumbnails', 'skill-tree-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload thumbnails
CREATE POLICY "Allow authenticated users to upload skill tree thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'skill-tree-thumbnails');

-- Policy to allow public to view thumbnails
CREATE POLICY "Allow public to view skill tree thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'skill-tree-thumbnails');
