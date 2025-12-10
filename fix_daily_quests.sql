
-- Create daily_quests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quest_type TEXT NOT NULL,
    target_count INTEGER NOT NULL DEFAULT 1,
    current_count INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 10,
    completed BOOLEAN NOT NULL DEFAULT false,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own daily quests" ON public.daily_quests;
CREATE POLICY "Users can view their own daily quests"
    ON public.daily_quests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily quests" ON public.daily_quests;
CREATE POLICY "Users can insert their own daily quests"
    ON public.daily_quests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily quests" ON public.daily_quests;
CREATE POLICY "Users can update their own daily quests"
    ON public.daily_quests FOR UPDATE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.daily_quests TO postgres;
GRANT ALL ON public.daily_quests TO anon;
GRANT ALL ON public.daily_quests TO authenticated;
GRANT ALL ON public.daily_quests TO service_role;
