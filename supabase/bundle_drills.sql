-- Create Bundle Drills Joint Table
CREATE TABLE IF NOT EXISTS public.bundle_drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id UUID REFERENCES public.bundles(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES public.drills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bundle_id, drill_id)
);

-- Enable RLS
ALTER TABLE public.bundle_drills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view bundle drills" ON public.bundle_drills FOR SELECT USING (true);
CREATE POLICY "Creators and admins can manage bundle drills" ON public.bundle_drills FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.bundles WHERE id = bundle_id AND (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))))
    WITH CHECK (EXISTS (SELECT 1 FROM public.bundles WHERE id = bundle_id AND (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))));

-- Index
CREATE INDEX IF NOT EXISTS idx_bundle_drills_bundle ON public.bundle_drills(bundle_id);
