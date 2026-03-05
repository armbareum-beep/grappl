-- Trigger function to notify admins when a routine is created/updated with pending status
CREATE OR REPLACE FUNCTION notify_admins_on_routine_pending()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
BEGIN
    -- Only trigger when status becomes 'pending'
    IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
        -- Loop through all admins
        FOR admin_record IN
            SELECT id FROM public.users WHERE is_admin = true
        LOOP
            -- Insert notification for each admin
            INSERT INTO public.notifications (user_id, type, title, message, link, is_read)
            VALUES (
                admin_record.id,
                'support_ticket',
                '새로운 콘텐츠 승인 요청',
                '새로운 루틴 "' || COALESCE(NEW.title, '제목 없음') || '"이(가) 승인 대기 중입니다.',
                '/admin/content-approval',
                false
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS on_routine_pending_notify_insert ON public.routines;
CREATE TRIGGER on_routine_pending_notify_insert
AFTER INSERT ON public.routines
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_admins_on_routine_pending();

-- Create trigger for UPDATE (when status changes to pending)
DROP TRIGGER IF EXISTS on_routine_pending_notify_update ON public.routines;
CREATE TRIGGER on_routine_pending_notify_update
AFTER UPDATE ON public.routines
FOR EACH ROW
WHEN (NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending')
EXECUTE FUNCTION notify_admins_on_routine_pending();
