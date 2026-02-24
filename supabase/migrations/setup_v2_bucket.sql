-- Create new bucket 'raw_videos_v2' with UNLIMITED size
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'raw_videos_v2', 
    'raw_videos_v2', 
    true, 
    null, -- Explicitly NULL for unlimited
    '{video/*,image/*}'
)
on conflict (id) do update
set file_size_limit = null,
    allowed_mime_types = '{video/*,image/*}',
    public = true;

-- Setup RLS Policies for v2 bucket
drop policy if exists "Public Uploads v2" on storage.objects;
create policy "Public Uploads v2"
on storage.objects for insert
with check ( bucket_id = 'raw_videos_v2' );

drop policy if exists "Public Select v2" on storage.objects;
create policy "Public Select v2"
on storage.objects for select
using ( bucket_id = 'raw_videos_v2' );

drop policy if exists "Public Update v2" on storage.objects;
create policy "Public Update v2"
on storage.objects for update
using ( bucket_id = 'raw_videos_v2' );

drop policy if exists "Public Delete v2" on storage.objects;
create policy "Public Delete v2"
on storage.objects for delete
using ( bucket_id = 'raw_videos_v2' );
