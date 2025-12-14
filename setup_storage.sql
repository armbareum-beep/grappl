-- Enable Storage
insert into storage.buckets (id, name, public)
values ('raw_videos', 'raw_videos', true)
on conflict (id) do nothing;

-- Policy: Allow public uploads (for now, to ensure speed/ease. Can restrict to auth later)
create policy "Public Uploads"
on storage.objects for insert
with check ( bucket_id = 'raw_videos' );

-- Policy: Allow public downloads (so backend can fetch it)
create policy "Public Select"
on storage.objects for select
using ( bucket_id = 'raw_videos' );

-- Policy: Allow update/delete (for cleanup)
create policy "Public Update"
on storage.objects for update
using ( bucket_id = 'raw_videos' );

create policy "Public Delete"
on storage.objects for delete
using ( bucket_id = 'raw_videos' );
