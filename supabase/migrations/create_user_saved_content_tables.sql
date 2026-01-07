-- Create user_saved_courses table
CREATE TABLE IF NOT EXISTS public.user_saved_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_saved_courses_user_id ON public.user_saved_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_courses_course_id ON public.user_saved_courses(course_id);

-- Enable RLS
ALTER TABLE public.user_saved_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own saved courses
CREATE POLICY "Users can view own saved courses" ON public.user_saved_courses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved courses" ON public.user_saved_courses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved courses" ON public.user_saved_courses
    FOR DELETE USING (auth.uid() = user_id);

-- Create user_saved_routines table
CREATE TABLE IF NOT EXISTS public.user_saved_routines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, routine_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_saved_routines_user_id ON public.user_saved_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_routines_routine_id ON public.user_saved_routines(routine_id);

-- Enable RLS
ALTER TABLE public.user_saved_routines ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own saved routines
CREATE POLICY "Users can view own saved routines" ON public.user_saved_routines
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved routines" ON public.user_saved_routines
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved routines" ON public.user_saved_routines
    FOR DELETE USING (auth.uid() = user_id);

-- Create user_saved_lessons table
CREATE TABLE IF NOT EXISTS public.user_saved_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_saved_lessons_user_id ON public.user_saved_lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_lessons_lesson_id ON public.user_saved_lessons(lesson_id);

-- Enable RLS
ALTER TABLE public.user_saved_lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own saved lessons
CREATE POLICY "Users can view own saved lessons" ON public.user_saved_lessons
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved lessons" ON public.user_saved_lessons
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved lessons" ON public.user_saved_lessons
    FOR DELETE USING (auth.uid() = user_id);
