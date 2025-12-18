-- Migration to support PayPal and Portone payments
-- 단계별로 실행하세요

-- ========================================
-- STEP 1: Update subscriptions table
-- ========================================
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
ADD COLUMN IF NOT EXISTS portone_payment_id TEXT;

-- ========================================
-- STEP 2: Create payments table
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    amount INTEGER,
    currency TEXT DEFAULT 'USD',
    status TEXT,
    payment_method TEXT,
    paypal_order_id TEXT,
    paypal_subscription_id TEXT,
    portone_payment_id TEXT,
    mode TEXT,
    target_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STEP 3: Update users table
-- ========================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS portone_subscription_id TEXT;

-- ========================================
-- STEP 4: Create indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order ON payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_portone ON payments(portone_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_sub ON subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_portone_payment ON subscriptions(portone_payment_id);
