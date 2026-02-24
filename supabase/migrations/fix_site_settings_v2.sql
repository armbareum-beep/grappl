-- Rename column if it exists as sectioncontent
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='sectioncontent') THEN
    ALTER TABLE public.site_settings RENAME COLUMN sectioncontent TO section_content;
  END IF;
END $$;

-- Create security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

-- Drop existing policies to recreate them clearly
DROP POLICY IF EXISTS "Allow read access for all" ON public.site_settings;
DROP POLICY IF EXISTS "Allow upsert access for admins" ON public.site_settings;
DROP POLICY IF EXISTS "Allow update access for admins" ON public.site_settings;

-- Re-enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 1. Read access for everyone (public site needs to load settings)
CREATE POLICY "Allow read access for all" ON public.site_settings
    FOR SELECT USING (true);

-- 2. Insert/Update for admins only using secure function
CREATE POLICY "Allow all access for admins" ON public.site_settings
    FOR ALL
    USING (check_is_admin())
    WITH CHECK (check_is_admin());
