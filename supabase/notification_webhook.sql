-- Create a function to send webhook notifications
-- Requires pg_net extension to be enabled in Supabase
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION public.handle_new_notification_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  payload JSONB;
BEGIN
  -- Get webhook URL from a settings table or hardcode it (user should replace this)
  -- For now, we'll look for it in a hypothetical 'site_settings' or just provide a placeholder
  webhook_url := 'https://your-webhook-worker-url.com/api/notify'; -- REPLACE THIS WITH YOUR WORKER URL

  -- Construct payload
  payload := jsonb_build_object(
    'id', NEW.id,
    'user_id', NEW.user_id,
    'type', NEW.type,
    'title', NEW.title,
    'message', NEW.message,
    'link', NEW.link,
    'created_at', NEW.created_at
  );

  -- Send asynchronous HTTP POST request using pg_net
  -- This won't block the transaction
  PERFORM net.http_post(
    url := webhook_url,
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_notification_created_webhook ON public.notifications;
CREATE TRIGGER on_notification_created_webhook
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_notification_webhook();

COMMENT ON FUNCTION public.handle_new_notification_webhook() IS 'Sends a webhook notification to an external service when a new notification is created.';
