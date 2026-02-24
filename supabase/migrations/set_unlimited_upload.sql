-- Remove file size limit (Set to Unlimited)
update storage.buckets
set file_size_limit = null,
    allowed_mime_types = '{video/*,image/*}'
where id = 'raw_videos';
