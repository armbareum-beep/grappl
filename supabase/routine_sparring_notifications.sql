-- Function to notify subscribers when a new routine is created (paid only)
CREATE OR REPLACE FUNCTION notify_subscribers_on_new_routine()
RETURNS TRIGGER AS $$
DECLARE
    subscriber_record RECORD;
    creator_name TEXT;
BEGIN
    -- Only send notification if the routine is paid (price > 0)
    IF NEW.price <= 0 THEN
        RETURN NEW;
    END IF;

    -- Get creator name
    SELECT name INTO creator_name FROM public.creators WHERE id = NEW.creator_id;

    -- Loop through all subscribers of the creator
    FOR subscriber_record IN
        SELECT user_id FROM public.creator_subscriptions WHERE creator_id = NEW.creator_id
    LOOP
        -- Insert notification
        INSERT INTO public.notifications (user_id, type, title, message, link, is_read)
        VALUES (
            subscriber_record.user_id,
            'info',
            '새로운 루틴 알림',
            creator_name || '님이 새 루틴 "' || NEW.title || '"을 개설했습니다.',
            '/routine/' || NEW.id,
            false
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new routine notification
DROP TRIGGER IF EXISTS on_new_routine_notify ON public.routines;
CREATE TRIGGER on_new_routine_notify
AFTER INSERT ON public.routines
FOR EACH ROW EXECUTE FUNCTION notify_subscribers_on_new_routine();

-- Function to notify subscribers when a new sparring video is uploaded (paid only)
CREATE OR REPLACE FUNCTION notify_subscribers_on_new_sparring()
RETURNS TRIGGER AS $$
DECLARE
    subscriber_record RECORD;
    creator_name TEXT;
BEGIN
    -- Only send notification if the sparring video is paid (price > 0)
    IF NEW.price <= 0 THEN
        RETURN NEW;
    END IF;

    -- Get creator name
    SELECT name INTO creator_name FROM public.creators WHERE id = NEW.creator_id;

    -- Loop through all subscribers of the creator
    FOR subscriber_record IN
        SELECT user_id FROM public.creator_subscriptions WHERE creator_id = NEW.creator_id
    LOOP
        -- Insert notification
        INSERT INTO public.notifications (user_id, type, title, message, link, is_read)
        VALUES (
            subscriber_record.user_id,
            'info',
            '새로운 스파링 영상 알림',
            creator_name || '님이 새 스파링 영상 "' || NEW.title || '"을 업로드했습니다.',
            '/sparring',
            false
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new sparring video notification
DROP TRIGGER IF EXISTS on_new_sparring_notify ON public.sparring_videos;
CREATE TRIGGER on_new_sparring_notify
AFTER INSERT ON public.sparring_videos
FOR EACH ROW EXECUTE FUNCTION notify_subscribers_on_new_sparring();
