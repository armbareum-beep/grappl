-- Enable User Sync Trigger (Auth -> Public)
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Create the Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', new.email), 
    new.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Backfill missing users (for any created before trigger)
INSERT INTO public.users (id, email, name, created_at)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 4. Reload Cache
NOTIFY pgrst, 'reload config';
