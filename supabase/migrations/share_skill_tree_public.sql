/*
  Make user_skill_trees publicly readable for sharing features.
  This allows anyone to view a skill tree if they have the ID, but only the owner can edit/delete.
  Run this SQL in Supabase SQL Editor.
*/

-- Drop existing select policy
drop policy if exists "Users can view own skill trees" on public.user_skill_trees;

-- Create new public select policy
create policy "Anyone can view skill trees" 
on public.user_skill_trees for select 
using (true);

-- Ensure other policies remain restrictive (Owner only)
-- (These typically don't need changing if they were set correctly, but re-stating for safety)
-- Users can insert own skill trees -> check (auth.uid() = user_id)
-- Users can update own skill trees -> using (auth.uid() = user_id)
-- Users can delete own skill trees -> using (auth.uid() = user_id)
