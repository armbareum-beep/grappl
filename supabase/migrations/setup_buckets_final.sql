-- 1. Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'raw_videos', 
    'raw_videos', 
    true, 
    null, -- Unlimited size
    '{video/*,image/*}'
)
on conflict (id) do update
set file_size_limit = null,
    allowed_mime_types = '{video/*,image/*}',
    public = true;

-- 2. Ensure RLS Policies exist (Drop first to avoid conflicts if they exist but are broken)

drop policy if exists "Public Uploads" on storage.objects;
create policy "Public Uploads"
on storage.objects for insert
with check ( bucket_id = 'raw_videos' );

drop policy if exists "Public Select" on storage.objects;
create policy "Public Select"
on storage.objects for select
using ( bucket_id = 'raw_videos' );

drop policy if exists "Public Update" on storage.objects;
create policy "Public Update"
on storage.objects for update
using ( bucket_id = 'raw_videos' );

drop policy if exists "Public Delete" on storage.objects;
create policy "Public Delete"
on storage.objects for delete
using ( bucket_id = 'raw_videos' );

-- 3. Grant usage just in case
grant all on schema storage to postgres, anon, authenticated, service_role;
grant all on all tables in schema storage to postgres, anon, authenticated, service_role;
