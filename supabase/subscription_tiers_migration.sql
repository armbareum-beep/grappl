-- Subscription Tiers Migration
-- Adds support for Basic (courses only) and Premium (courses + routines) tiers
-- Safe to run multiple times - uses ALTER TABLE IF NOT EXISTS pattern

-- 1. Add subscription_tier column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN subscription_tier TEXT DEFAULT 'premium' 
        CHECK (subscription_tier IN ('basic', 'premium'));
        
        COMMENT ON COLUMN subscriptions.subscription_tier IS 
        'Subscription tier: basic (courses only) or premium (courses + routines)';
    END IF;
END $$;

-- 2. Add billing_period column (more explicit than plan_interval)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'billing_period'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN billing_period TEXT DEFAULT 'monthly' 
        CHECK (billing_period IN ('monthly', 'yearly'));
        
        COMMENT ON COLUMN subscriptions.billing_period IS 
        'Billing period: monthly or yearly';
    END IF;
END $$;

-- 3. Migrate existing plan_interval data to billing_period
UPDATE subscriptions 
SET billing_period = CASE 
    WHEN plan_interval = 'month' THEN 'monthly'
    WHEN plan_interval = 'year' THEN 'yearly'
    ELSE 'monthly'
END
WHERE billing_period IS NULL OR billing_period = 'monthly';

-- 4. Update existing subscriptions to premium tier (backward compatibility)
UPDATE subscriptions 
SET subscription_tier = 'premium' 
WHERE subscription_tier IS NULL;

-- 5. Create index for faster tier queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier 
ON subscriptions(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_tier 
ON subscriptions(user_id, subscription_tier, status);

-- 6. Function to check if user has premium subscription
CREATE OR REPLACE FUNCTION has_premium_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions
        WHERE user_id = p_user_id
        AND subscription_tier = 'premium'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to check if user has any active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions
        WHERE user_id = p_user_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get user's subscription tier
CREATE OR REPLACE FUNCTION get_subscription_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_tier TEXT;
BEGIN
    SELECT subscription_tier INTO v_tier
    FROM subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(v_tier, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update user_routine_purchases to respect subscription tier
-- Premium subscribers get all routines for free
CREATE OR REPLACE FUNCTION check_routine_access(p_user_id UUID, p_routine_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has premium subscription (unlimited routines)
    IF has_premium_subscription(p_user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user purchased this specific routine
    RETURN EXISTS (
        SELECT 1 FROM user_routine_purchases
        WHERE user_id = p_user_id
        AND routine_id = p_routine_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RLS Policy for routines based on subscription tier
DROP POLICY IF EXISTS "Users can view routines they have access to" ON routines;
CREATE POLICY "Users can view routines they have access to"
ON routines FOR SELECT
TO authenticated
USING (
    -- Everyone can see routine metadata
    true
);

-- 11. RLS Policy for routine drills (actual content)
DROP POLICY IF EXISTS "Users can view routine drills if they have access" ON routine_drills;
CREATE POLICY "Users can view routine drills if they have access"
ON routine_drills FOR SELECT
TO authenticated
USING (
    -- Premium subscribers or users who purchased the routine
    check_routine_access(auth.uid(), routine_id)
);

-- 12. Add pricing metadata table for different tiers
CREATE TABLE IF NOT EXISTS subscription_pricing (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tier TEXT NOT NULL CHECK (tier IN ('basic', 'premium')),
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    price INTEGER NOT NULL,
    currency TEXT DEFAULT 'KRW',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tier, billing_period)
);

-- 13. Insert current pricing
INSERT INTO subscription_pricing (tier, billing_period, price) VALUES
    ('basic', 'monthly', 29000),
    ('basic', 'yearly', 290000),
    ('premium', 'monthly', 39000),
    ('premium', 'yearly', 390000)
ON CONFLICT (tier, billing_period) 
DO UPDATE SET 
    price = EXCLUDED.price,
    updated_at = NOW();

-- 14. Enable RLS on pricing table
ALTER TABLE subscription_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view pricing"
ON subscription_pricing FOR SELECT
TO authenticated
USING (is_active = true);

-- 15. Function to get routine discount for basic subscribers
CREATE OR REPLACE FUNCTION get_routine_discount_percent(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_tier TEXT;
BEGIN
    v_tier := get_subscription_tier(p_user_id);
    
    -- Basic subscribers get 30% discount on routines
    IF v_tier = 'basic' THEN
        RETURN 30;
    END IF;
    
    -- Premium subscribers get 100% discount (free)
    IF v_tier = 'premium' THEN
        RETURN 100;
    END IF;
    
    -- Non-subscribers get no discount
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE subscription_pricing IS 'Stores pricing for different subscription tiers and billing periods';
COMMENT ON FUNCTION has_premium_subscription IS 'Returns true if user has an active premium subscription';
COMMENT ON FUNCTION check_routine_access IS 'Returns true if user can access a routine (premium sub or purchased)';
COMMENT ON FUNCTION get_routine_discount_percent IS 'Returns discount percentage for routine purchases based on subscription tier';
