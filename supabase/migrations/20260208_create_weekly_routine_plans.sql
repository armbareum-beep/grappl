-- Create weekly_routine_plans table
CREATE TABLE IF NOT EXISTS public.weekly_routine_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT false,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    thumbnail_url TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.weekly_routine_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_routine_plans' AND policyname = 'Users can view own weekly routines') THEN
        CREATE POLICY "Users can view own weekly routines" ON public.weekly_routine_plans
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_routine_plans' AND policyname = 'Users can insert own weekly routines') THEN
        CREATE POLICY "Users can insert own weekly routines" ON public.weekly_routine_plans
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_routine_plans' AND policyname = 'Users can update own weekly routines') THEN
        CREATE POLICY "Users can update own weekly routines" ON public.weekly_routine_plans
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_routine_plans' AND policyname = 'Users can delete own weekly routines') THEN
        CREATE POLICY "Users can delete own weekly routines" ON public.weekly_routine_plans
            FOR DELETE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_routine_plans' AND policyname = 'Anyone can view public weekly routines') THEN
        CREATE POLICY "Anyone can view public weekly routines" ON public.weekly_routine_plans
            FOR SELECT USING (is_public = true);
    END IF;
END $$;
