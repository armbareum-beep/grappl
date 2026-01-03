-- Recommended Feed Algorithm (Gravity Score)
-- Formula: (Likes*2 + Comments*3) / (Hours_Since_Creation + 2)^1.5

CREATE OR REPLACE FUNCTION get_recommended_feed(page_num INT, page_size INT)
RETURNS SETOF training_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_offset INT;
BEGIN
  start_offset := (page_num - 1) * page_size;

  RETURN QUERY
  SELECT *
  FROM training_logs
  WHERE is_public = true
  ORDER BY 
    (
      (COALESCE(likes, 0) * 2 + COALESCE(comments, 0) * 3) 
      / 
      POWER(
        (EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) + 2, 
        1.5
      )
    ) DESC
  LIMIT page_size
  OFFSET start_offset;
END;
$$;
