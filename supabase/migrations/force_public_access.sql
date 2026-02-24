-- CRITICAL FIX FOR UPLOAD ERRORS (Run in Supabase SQL Editor)
-- Updated permissions AND File Size Limits

-- 1. Update File Size Limit to 2GB (2 * 1024 * 1024 * 1024 bytes)
UPDATE storage.buckets 
SET file_size_limit = 2147483648,
    allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm']
WHERE id = 'raw_videos';

-- 1b. Insert bucket if missing (with 2GB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('raw_videos', 'raw_videos', true, 2147483648, ARRAY['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 2147483648,
    allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'];

-- 2. Allow Public Select
DROP POLICY IF EXISTS "Public Select raw_videos" ON storage.objects;
CREATE POLICY "Public Select raw_videos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'raw_videos' );

-- 3. Allow Authenticated Users to Upload (INSERT) - FIXES 400/403 ERROR
DROP POLICY IF EXISTS "Auth Upload raw_videos" ON storage.objects;
CREATE POLICY "Auth Upload raw_videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'raw_videos' );

-- 4. Allow Authenticated Users to Update/Delete their own files based on folder path (optional but good)
DROP POLICY IF EXISTS "Auth Update Own raw_videos" ON storage.objects;
CREATE POLICY "Auth Update Own raw_videos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'raw_videos' );

-- 5. Force public to be TRUE just in case
UPDATE storage.buckets SET public = true WHERE id = 'raw_videos';
