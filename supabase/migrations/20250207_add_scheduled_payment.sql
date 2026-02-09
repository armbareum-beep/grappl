-- Add scheduled_payment_id column for PortOne recurring payments
DO $$
BEGIN
    -- Add scheduled_payment_id to subscriptions table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'scheduled_payment_id') THEN
        ALTER TABLE subscriptions ADD COLUMN scheduled_payment_id TEXT;
    END IF;

    -- Add canceled_at column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'canceled_at') THEN
        ALTER TABLE subscriptions ADD COLUMN canceled_at TIMESTAMPTZ;
    END IF;

    -- Add amount column to store subscription amount for renewals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'amount') THEN
        ALTER TABLE subscriptions ADD COLUMN amount INTEGER;
    END IF;
END $$;

-- Create index for scheduled payment lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_scheduled_payment ON subscriptions(scheduled_payment_id);

-- Update existing monthly subscriptions to have amount if missing
UPDATE subscriptions
SET amount = CASE
    WHEN subscription_tier = 'premium' THEN 39000
    ELSE 29000
END
WHERE amount IS NULL AND plan_interval = 'month';

-- Create function to handle subscription expiration
CREATE OR REPLACE FUNCTION handle_subscription_expiration()
RETURNS void AS $$
BEGIN
    -- Mark 'canceling' subscriptions as 'canceled' when period ends
    UPDATE subscriptions
    SET status = 'canceled'
    WHERE status = 'canceling'
    AND current_period_end < NOW();

    -- Update users table for expired subscriptions
    UPDATE users u
    SET
        is_subscriber = false,
        subscription_tier = null
    FROM subscriptions s
    WHERE u.id = s.user_id
    AND s.status IN ('canceled', 'expired')
    AND u.subscription_end_date < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily check for expired subscriptions (if pg_cron is available)
-- Run at 00:05 every day
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'daily-subscription-expiration-check',
            '5 0 * * *',
            'SELECT handle_subscription_expiration()'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available, skipping cron job creation';
END $$;
