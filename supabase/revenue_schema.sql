-- 1. Subscriptions Table (Tracks user subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  plan_interval TEXT CHECK (plan_interval IN ('month', 'year')),
  amount INTEGER,
  status TEXT, -- 'active', 'cancelled', 'past_due'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Revenue Ledger (Tracks deferred revenue - the 1/12th chunks)
-- This is the core of the "Accrual Basis" logic.
-- For a yearly sub, we insert 12 rows here.
CREATE TABLE IF NOT EXISTS revenue_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id),
  amount INTEGER, -- The chunk amount (e.g. 550000 / 12)
  recognition_date DATE, -- When this money is "earned" (e.g. 2024-01-01, 2024-02-01)
  status TEXT DEFAULT 'pending', -- 'pending', 'recognized', 'refunded'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Creator Payouts (Tracks monthly payouts to instructors)
CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id),
  amount INTEGER,
  payout_period_start DATE, -- e.g. 2024-01-01
  payout_period_end DATE,   -- e.g. 2024-01-31
  status TEXT DEFAULT 'draft', -- 'draft', 'processing', 'paid'
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE revenue_ledger IS 'Tracks revenue recognition chunks (e.g. 1/12th of yearly sub)';
COMMENT ON TABLE creator_payouts IS 'Records monthly payout amounts calculated for each creator';
