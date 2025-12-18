-- Migration to support PayPal payments and subscriptions

-- 1. Update subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;

-- 2. Create payments table if it doesn't exist (previously might have been created manually)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    amount INTEGER, -- In smallest unit or actual amount? Stripe uses cents, for PayPal we'll store as cents-equivalent (amount * 100) or decimal.
    currency TEXT DEFAULT 'USD',
    status TEXT, -- 'completed', 'pending', 'failed'
    payment_method TEXT, -- 'stripe', 'paypal'
    stripe_payment_intent_id TEXT,
    stripe_subscription_id TEXT,
    paypal_order_id TEXT,
    paypal_subscription_id TEXT,
    mode TEXT, -- 'course', 'routine', 'bundle', 'feedback', 'subscription'
    target_id TEXT, -- The ID of the item purchased
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update users table for PayPal sub ID
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order ON payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_sub ON subscriptions(paypal_subscription_id);
