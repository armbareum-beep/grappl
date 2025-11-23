-- Create notifications table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('info', 'success', 'warning', 'error')) default 'info',
  title text not null,
  message text not null,
  link text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications (mark as read)"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Function to create a notification (for use by other functions/triggers)
create or replace function public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text default 'info',
  p_link text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, title, message, type, link)
  values (p_user_id, p_title, p_message, p_type, p_link)
  returning id into v_id;
  return v_id;
end;
$$;
