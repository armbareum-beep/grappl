-- Admin User Management Functions

-- Function to get all users (bypass RLS for admins)
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  is_subscriber boolean,
  is_admin boolean,
  created_at timestamptz,
  is_creator boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the requesting user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.is_subscriber,
    u.is_admin,
    u.created_at,
    EXISTS (SELECT 1 FROM public.creators c WHERE c.id = u.id AND c.approved = true) as is_creator
  FROM 
    public.users u
  ORDER BY 
    u.created_at DESC;
END;
$$;

-- Function to promote a user to creator
CREATE OR REPLACE FUNCTION promote_to_creator(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_name text;
  v_user_email text;
BEGIN
  -- Check if the requesting user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Get user details
  SELECT name, email INTO v_user_name, v_user_email
  FROM public.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if already exists in creators
  IF EXISTS (SELECT 1 FROM public.creators WHERE id = target_user_id) THEN
    -- Update existing record
    UPDATE public.creators
    SET approved = true
    WHERE id = target_user_id;
  ELSE
    -- Insert new record
    INSERT INTO public.creators (id, name, bio, profile_image, subscriber_count, approved)
    VALUES (
      target_user_id, 
      v_user_name, 
      'New Creator', 
      'https://via.placeholder.com/150', -- Default placeholder
      0, 
      true
    );
  END IF;
END;
$$;
