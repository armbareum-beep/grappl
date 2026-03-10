-- Add brand_id to content tables to support organizer team filtering
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.event_brands(id) ON DELETE SET NULL;

ALTER TABLE public.routines 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.event_brands(id) ON DELETE SET NULL;

ALTER TABLE public.sparring_videos 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.event_brands(id) ON DELETE SET NULL;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_courses_brand_id ON public.courses(brand_id);
CREATE INDEX IF NOT EXISTS idx_routines_brand_id ON public.routines(brand_id);
CREATE INDEX IF NOT EXISTS idx_sparring_videos_brand_id ON public.sparring_videos(brand_id);
