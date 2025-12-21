-- Function to notify admins when a new ticket is created
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
            '/admin/support', -- Link to admin support page
            false, 
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function after insertion
DROP TRIGGER IF EXISTS on_ticket_created ON public.support_tickets;
CREATE TRIGGER on_ticket_created
    AFTER INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_ticket();
