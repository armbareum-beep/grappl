-- Fix users table: Create trigger to auto-create user records
-- Run this in Supabase SQL Editor

-- 1. Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    false  -- Default to non-admin
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Manually insert existing auth users into public.users
INSERT INTO public.users (id, email, created_at, is_admin)
SELECT 
  id,
  email,
  created_at,
  false as is_admin
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);

-- 4. Set yourself as admin (REPLACE WITH YOUR EMAIL)
UPDATE public.users 
SET is_admin = true 
WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- 5. Verify the result
SELECT id, email, is_admin, created_at 
FROM public.users 
ORDER BY created_at DESC;
