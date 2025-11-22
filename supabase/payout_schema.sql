-- Add Stripe Connect fields to creators table
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS payout_settings JSONB DEFAULT '{"type": "individual"}'::jsonb;

-- Comment on columns
COMMENT ON COLUMN creators.stripe_account_id IS 'Stripe Connect Account ID (acct_...)';
COMMENT ON COLUMN creators.payout_settings IS 'Payout configuration (e.g. business type, tax info)';
