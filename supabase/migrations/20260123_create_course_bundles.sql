-- Create course_drill_bundles table for linking Drills to Courses
CREATE TABLE IF NOT EXISTS public.course_drill_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES public.drills(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, drill_id)
);

-- Enable RLS
ALTER TABLE public.course_drill_bundles ENABLE ROW LEVEL SECURITY;

-- Create policies for course_drill_bundles
CREATE POLICY "Public read access for course_drill_bundles"
    ON public.course_drill_bundles FOR SELECT
    USING (true);

CREATE POLICY "Creators can manage their course bundles"
    ON public.course_drill_bundles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE id = course_id 
            AND (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE id = course_id 
            AND (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))
        )
    );

-- Add related_items column to sparring_videos if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparring_videos' AND column_name = 'related_items') THEN
        ALTER TABLE public.sparring_videos ADD COLUMN related_items JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
