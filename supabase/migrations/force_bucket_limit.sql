-- Attempt to override Global Free Tier Limit by setting explicit Bucket Limit
-- NULL might fall back to Global (50MB), so we set it to 3GB explicitly.

update storage.buckets
set file_size_limit = 3221225472 -- 3GB (3 * 1024 * 1024 * 1024)
where id = 'raw_videos_v2';
