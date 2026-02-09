-- ========================================
-- CRITICAL: Add RLS to payment-related tables
-- (Safe to re-run - drops existing policies first)
-- ========================================

-- 1. PAYMENTS TABLE
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Service role can manage payments" ON payments;

CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments"
    ON payments FOR ALL
    USING (auth.role() = 'service_role');

GRANT SELECT ON payments TO authenticated;
GRANT ALL ON payments TO service_role;

-- 2. SUBSCRIPTIONS TABLE
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions FOR ALL
    USING (auth.role() = 'service_role');

GRANT SELECT ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role;

-- 3. REVENUE_LEDGER TABLE (Admin only)
ALTER TABLE revenue_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage revenue_ledger" ON revenue_ledger;
DROP POLICY IF EXISTS "Admins can view revenue_ledger" ON revenue_ledger;

CREATE POLICY "Service role can manage revenue_ledger"
    ON revenue_ledger FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view revenue_ledger"
    ON revenue_ledger FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

GRANT SELECT ON revenue_ledger TO authenticated;
GRANT ALL ON revenue_ledger TO service_role;

-- 4. CREATOR_PAYOUTS TABLE (Creators can see their own)
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own payouts" ON creator_payouts;
DROP POLICY IF EXISTS "Admins can view all payouts" ON creator_payouts;
DROP POLICY IF EXISTS "Service role can manage payouts" ON creator_payouts;

CREATE POLICY "Creators can view own payouts"
    ON creator_payouts FOR SELECT
    USING (creator_id = auth.uid());

CREATE POLICY "Admins can view all payouts"
    ON creator_payouts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

CREATE POLICY "Service role can manage payouts"
    ON creator_payouts FOR ALL
    USING (auth.role() = 'service_role');

GRANT SELECT ON creator_payouts TO authenticated;
GRANT ALL ON creator_payouts TO service_role;
