-- 1. Create user_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    total_points NUMERIC DEFAULT 0,
    log_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own stats
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
USING (auth.uid() = user_id);

-- 2. Function to update user points when a training log is created
CREATE OR REPLACE FUNCTION update_points_on_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Add 0.5 points for each training log
        INSERT INTO public.user_stats (user_id, total_points, log_count)
        VALUES (NEW.user_id, 0.5, 1)
        ON CONFLICT (user_id)
        DO UPDATE SET
            total_points = public.user_stats.total_points + 0.5,
            log_count = public.user_stats.log_count + 1,
            updated_at = NOW();
            
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Remove 0.5 points if log is deleted
        UPDATE public.user_stats
        SET 
            total_points = GREATEST(0, total_points - 0.5),
            log_count = GREATEST(0, log_count - 1),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for training logs
DROP TRIGGER IF EXISTS on_log_points ON public.training_logs;
CREATE TRIGGER on_log_points
AFTER INSERT OR DELETE ON public.training_logs
FOR EACH ROW EXECUTE FUNCTION update_points_on_log();
