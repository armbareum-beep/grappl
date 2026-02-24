-- Increase file size limit to 2GB (2 * 1024 * 1024 * 1024 bytes)
update storage.buckets
set file_size_limit = 2147483648,
    allowed_mime_types = '{video/*,image/*}'
where id = 'raw_videos';
