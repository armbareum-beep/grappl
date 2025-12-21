-- 1. Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for guests
    user_name TEXT,
    user_email TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    admin_response TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES auth.users(id)
);

-- 2. Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Allow anyone (including anon/guests) to create a ticket
CREATE POLICY "Anyone can create tickets" 
ON public.support_tickets FOR INSERT 
TO public, anon 
WITH CHECK (true);

-- Allow users to view their own tickets
CREATE POLICY "Users can view own tickets" 
ON public.support_tickets FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow admins to view all tickets (Assuming is_admin = true in users table)
CREATE POLICY "Admins can view all tickets" 
ON public.support_tickets FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.is_admin = true
    )
);

-- Allow admins to update tickets (for responding)
CREATE POLICY "Admins can update tickets" 
ON public.support_tickets FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.is_admin = true
    )
);

-- 4. Re-create the Notification Function & Trigger
-- (Included here to ensure it works after table creation)

CREATE OR REPLACE FUNCTION notify_admin_on_ticket()
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
            'info', 
            '새로운 1:1 문의 접수', 
            '새로운 문의가 도착했습니다: ' || NEW.subject, 
            '/admin/support',
            false, 
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_created ON public.support_tickets;
CREATE TRIGGER on_ticket_created
    AFTER INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_ticket();
