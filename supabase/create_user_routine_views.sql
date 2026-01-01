-- Tracker for user routine views
create table if not exists public.user_routine_views (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    routine_id uuid references public.drill_routines(id) on delete cascade not null,
    view_count integer default 1,
    last_watched_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, routine_id)
);

-- RLS
alter table public.user_routine_views enable row level security;

create policy "Users can view their own routine history"
    on public.user_routine_views for select
    using (auth.uid() = user_id);

create policy "Users can insert/update their own routine history"
    on public.user_routine_views for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Index for faster recent activity queries
create index if not exists user_routine_views_user_id_last_watched_idx 
    on public.user_routine_views(user_id, last_watched_at desc);
