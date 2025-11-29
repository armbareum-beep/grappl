-- Function to calculate user's current training streak (consecutive days with training logs)
CREATE OR REPLACE FUNCTION get_user_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_streak INTEGER := 0;
    v_current_date DATE := CURRENT_DATE;
    v_check_date DATE;
BEGIN
    -- Start from yesterday (today doesn't count yet for streak)
    v_check_date := v_current_date - INTERVAL '1 day';
    
    -- Count consecutive days with training logs
    WHILE EXISTS (
        SELECT 1 
        FROM training_logs 
        WHERE user_id = p_user_id 
        AND date::date = v_check_date
    ) LOOP
        v_streak := v_streak + 1;
        v_check_date := v_check_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN v_streak;
END;
$$;
