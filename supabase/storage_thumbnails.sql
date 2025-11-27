-- Create storage bucket for course thumbnails
-- Note: Run this in Supabase Dashboard > Storage, not SQL Editor
-- Or use the Supabase Dashboard UI to create the bucket

-- If you need to create via SQL, use this simpler approach:
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies are managed differently in Supabase
-- Go to: Supabase Dashboard > Storage > course-thumbnails > Policies
-- Then add these policies via the UI:

-- Policy 1: Public Access (SELECT)
-- Name: Public Access
-- Allowed operation: SELECT
-- Policy definition: true

-- Policy 2: Authenticated users can upload (INSERT)
-- Name: Authenticated users can upload
-- Allowed operation: INSERT  
-- Policy definition: (bucket_id = 'course-thumbnails') AND (auth.role() = 'authenticated')

-- Policy 3: Authenticated users can update (UPDATE)
-- Name: Authenticated users can update
-- Allowed operation: UPDATE
-- Policy definition: (bucket_id = 'course-thumbnails') AND (auth.role() = 'authenticated')

-- Policy 4: Authenticated users can delete (DELETE)
-- Name: Authenticated users can delete
-- Allowed operation: DELETE
-- Policy definition: (bucket_id = 'course-thumbnails') AND (auth.role() = 'authenticated')
