-- Create sparring_videos table
create table if not exists sparring_videos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  creator_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  video_url text, -- Can be Vimeo ID or full URL
  thumbnail_url text,
  related_items jsonb default '[]'::jsonb, -- Array of { type: 'drill' | 'lesson', id: string, title: string }
  views integer default 0,
  likes integer default 0
);

-- Enable Row Level Security
alter table sparring_videos enable row level security;

-- Create Policies
-- 1. Public can view all sparring videos
create policy "Public can view all sparring videos"
  on sparring_videos for select
  using ( true );

-- 2. Creators can insert their own videos
create policy "Creators can insert their own videos"
  on sparring_videos for insert
  with check ( auth.uid() = creator_id );

-- 3. Creators can update their own videos
create policy "Creators can update their own videos"
  on sparring_videos for update
  using ( auth.uid() = creator_id );

-- 4. Creators can delete their own videos
create policy "Creators can delete their own videos"
  on sparring_videos for delete
  using ( auth.uid() = creator_id );

-- Add indexes for performance
create index if not exists sparring_videos_creator_id_idx on sparring_videos(creator_id);
create index if not exists sparring_videos_created_at_idx on sparring_videos(created_at desc);
