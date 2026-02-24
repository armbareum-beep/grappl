-- Create testimonials table
create table if not exists public.testimonials (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  belt text not null,
  comment text not null,
  rating integer default 5,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.testimonials enable row level security;

-- Create policies
create policy "Allow public read access"
  on public.testimonials for select
  using (true);

create policy "Allow admin insert"
  on public.testimonials for insert
  with check (auth.role() = 'authenticated'); -- Assuming admins are authenticated. Ideally check for specific admin role/claim if implemented.

create policy "Allow admin update"
  on public.testimonials for update
  using (auth.role() = 'authenticated');

create policy "Allow admin delete"
  on public.testimonials for delete
  using (auth.role() = 'authenticated');

-- Grant access to anon and authenticated
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;
