-- Backfill existing users into users table
INSERT INTO public.users (id, name, avatar_url)
SELECT 
    id,
    COALESCE(
        raw_user_meta_data->>'name',
        raw_user_meta_data->>'full_name',
        split_part(email, '@', 1),
        'User'
    ) as name,
    raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
    name = COALESCE(EXCLUDED.name, users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
