-- 1. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id),
    target_id UUID NOT NULL, -- ID of the reported item (post, comment, etc.)
    target_type TEXT NOT NULL, -- 'post', 'comment', 'user', 'drill'
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Allow authenticated users to create reports
CREATE POLICY "Users can create reports" 
ON public.reports FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = reporter_id);

-- Allow admins to view all reports
CREATE POLICY "Admins can view all reports" 
ON public.reports FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.is_admin = true
    )
);

-- Allow admins to update reports
CREATE POLICY "Admins can update reports" 
ON public.reports FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.is_admin = true
    )
);

-- 4. Create Notification Function & Trigger for Reports

CREATE OR REPLACE FUNCTION notify_admin_on_report()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
BEGIN
    -- Loop through all users who are admins
    FOR admin_record IN 
        SELECT id FROM public.users WHERE is_admin = true
    LOOP
        -- Insert notification for each admin
        INSERT INTO public.notifications 
        (user_id, type, title, message, link, is_read, created_at)
        VALUES 
        (
            admin_record.id, 
            'warning', -- Use 'warning' type for reports
            '신고 접수 알림', 
            '새로운 신고가 접수되었습니다. (사유: ' || NEW.reason || ')', 
            '/admin/reports', -- Link to admin reports page (to be created if not exists)
            false, 
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_created ON public.reports;
CREATE TRIGGER on_report_created
    AFTER INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_report();
