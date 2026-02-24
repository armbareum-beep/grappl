CREATE TABLE IF NOT EXISTS public.site_settings (
    id text PRIMARY KEY DEFAULT 'default',
    logos jsonb DEFAULT '{}',
    footer jsonb DEFAULT '{}',
    hero jsonb DEFAULT '{}',
    sections jsonb DEFAULT '{}',
    section_content jsonb DEFAULT '{}',
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for all
CREATE POLICY "Allow read access for all" ON public.site_settings
    FOR SELECT USING (true);

-- Allow upsert access for admins
CREATE POLICY "Allow upsert access for admins" ON public.site_settings
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)
    );

CREATE POLICY "Allow update access for admins" ON public.site_settings
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)
    ) WITH CHECK (
        auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)
    );

-- Insert default row if not exists
INSERT INTO public.site_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
