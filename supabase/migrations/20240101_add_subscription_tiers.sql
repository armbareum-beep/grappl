-- Add subscription_tier to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'premium'));

-- Add subscription_end_date to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Add subscription_tier to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'premium'));
