-- 1. Bundles Table
CREATE TABLE IF NOT EXISTS public.bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES public.users(id), -- Changed from creators(id) to support admins
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bundle Courses Joint Table
CREATE TABLE IF NOT EXISTS public.bundle_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id UUID REFERENCES public.bundles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bundle_id, course_id)
);

-- 3. Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    creator_id UUID REFERENCES public.users(id), -- Changed from creators(id) to support admins
    discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')),
    value NUMERIC NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Bundles (Ownership)
CREATE TABLE IF NOT EXISTS public.user_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES public.bundles(id) ON DELETE CASCADE,
    price_paid NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bundle_id)
);

-- Enable RLS
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bundles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Bundles: Everyone can view, admin/creator can manage
CREATE POLICY "Everyone can view bundles" ON public.bundles FOR SELECT USING (true);
CREATE POLICY "Creators and admins can manage bundles" ON public.bundles FOR ALL 
    USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Bundle Courses: Everyone can view, admin/creator can manage (simplified to bundle owner)
CREATE POLICY "Everyone can view bundle courses" ON public.bundle_courses FOR SELECT USING (true);
CREATE POLICY "Creators and admins can manage bundle courses" ON public.bundle_courses FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.bundles WHERE id = bundle_id AND (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))))
    WITH CHECK (EXISTS (SELECT 1 FROM public.bundles WHERE id = bundle_id AND (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))));

-- Coupons: Everyone can view (to validate), admin/creator can manage
CREATE POLICY "Everyone can view coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Creators and admins can manage coupons" ON public.coupons FOR ALL 
    USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- User Bundles: Users can view their own
CREATE POLICY "Users can view their own bundles" ON public.user_bundles FOR SELECT 
    USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all user bundles" ON public.user_bundles FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "System can record bundle purchases" ON public.user_bundles FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bundles_creator ON public.bundles(creator_id);
CREATE INDEX IF NOT EXISTS idx_bundle_courses_bundle ON public.bundle_courses(bundle_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_user_bundles_user ON public.user_bundles(user_id);
