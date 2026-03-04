-- Allow admins to insert manual payments and revenue_ledger records

-- 1. PAYMENTS TABLE - Admin can insert
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;

CREATE POLICY "Admins can insert payments"
    ON payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- 2. REVENUE_LEDGER TABLE - Admin can insert
DROP POLICY IF EXISTS "Admins can insert revenue_ledger" ON revenue_ledger;

CREATE POLICY "Admins can insert revenue_ledger"
    ON revenue_ledger FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- Grant insert permissions
GRANT INSERT ON payments TO authenticated;
GRANT INSERT ON revenue_ledger TO authenticated;
