-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Schedule the job
-- Run at 00:00 on the 1st day of every month
-- content: Calculate for the PREVIOUS month
SELECT cron.schedule(
    'monthly-subscription-settlement', -- Job name
    '0 0 1 * *',                       -- Schedule (Midnight on 1st of month)
    $$SELECT calculate_monthly_subscription_distribution((now() - interval '1 month')::date)$$
);

-- Note: To check jobs: SELECT * FROM cron.job;
-- To unschedule: SELECT cron.unschedule('monthly-subscription-settlement');
