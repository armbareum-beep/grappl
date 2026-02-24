-- Optimize Bucket for Supabase Pro Plan
-- Set file size limit to 50GB (Pro Plan default max per file)
-- 50GB = 50 * 1024 * 1024 * 1024 = 53687091200 bytes

update storage.buckets
set file_size_limit = 53687091200
where id = 'raw_videos_v2';

-- Ensure image transformation is enabled (usually global setting, but good to have context)
-- Note: 'Enable image transformation' is done in the Dashboard UI, not SQL.
