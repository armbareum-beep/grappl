-- Function to safely increment routine views
CREATE OR REPLACE FUNCTION increment_routine_views(p_routine_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE routines
  SET views = views + 1
  WHERE id = p_routine_id;
END;
$$;

-- Grant execute permission to public/authenticated users
GRANT EXECUTE ON FUNCTION increment_routine_views(UUID) TO anon, authenticated, service_role;
