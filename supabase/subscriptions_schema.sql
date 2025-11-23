-- Creator Subscriptions Table
CREATE TABLE IF NOT EXISTS public.creator_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, creator_id)
);

-- RLS Policies
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.creator_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- Users can subscribe (insert)
CREATE POLICY "Users can subscribe to creators" 
ON public.creator_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can unsubscribe (delete)
CREATE POLICY "Users can unsubscribe from creators" 
ON public.creator_subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- Function to update subscriber count
CREATE OR REPLACE FUNCTION update_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.creators
        SET subscriber_count = subscriber_count + 1
        WHERE id = NEW.creator_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.creators
        SET subscriber_count = GREATEST(0, subscriber_count - 1)
        WHERE id = OLD.creator_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for subscriber count
DROP TRIGGER IF EXISTS on_subscription_change ON public.creator_subscriptions;
CREATE TRIGGER on_subscription_change
AFTER INSERT OR DELETE ON public.creator_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_subscriber_count();

-- Function to notify subscribers when a new course is created
CREATE OR REPLACE FUNCTION notify_subscribers_on_new_course()
RETURNS TRIGGER AS $$
DECLARE
    subscriber_record RECORD;
    creator_name TEXT;
BEGIN
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
            '새로운 강좌 알림',
            creator_name || '님이 새 강좌 "' || NEW.title || '"를 개설했습니다.',
            '/course/' || NEW.id,
            false
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new course notification
DROP TRIGGER IF EXISTS on_new_course_notify ON public.courses;
CREATE TRIGGER on_new_course_notify
AFTER INSERT ON public.courses
FOR EACH ROW EXECUTE FUNCTION notify_subscribers_on_new_course();
