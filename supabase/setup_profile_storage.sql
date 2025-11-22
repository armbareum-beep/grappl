-- Setup Supabase Storage for Profile Images
-- Run this in Supabase SQL Editor

-- 1. Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload their own images
CREATE POLICY "Users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Allow users to update their own images
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Allow users to delete their own images
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Allow public read access to all profile images
CREATE POLICY "Public profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'profile-images';
