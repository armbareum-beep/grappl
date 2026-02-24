-- Fix Supabase Storage Upload Issues
-- This SQL will allow authenticated users to upload to raw_videos_v2 bucket

-- 1. Make bucket public (allows downloads without auth)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'raw_videos_v2';

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload to raw_videos_v2" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read raw_videos_v2" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to raw_videos_v2" ON storage.objects;
DROP POLICY IF EXISTS "Public can read raw_videos_v2" ON storage.objects;

-- 3. Allow authenticated users to INSERT (upload) files
CREATE POLICY "Authenticated users can upload to raw_videos_v2"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'raw_videos_v2');

-- 4. Allow authenticated users to SELECT (read) files
CREATE POLICY "Authenticated users can read raw_videos_v2"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'raw_videos_v2');

-- 5. Allow service_role to do everything (for backend)
CREATE POLICY "Service role full access to raw_videos_v2"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'raw_videos_v2')
WITH CHECK (bucket_id = 'raw_videos_v2');

-- 6. Allow public to read files (since bucket is public)
CREATE POLICY "Public can read raw_videos_v2"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'raw_videos_v2');
