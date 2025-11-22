-- Add revenue share columns to creators table
ALTER TABLE creators
  ADD COLUMN direct_share numeric DEFAULT 0.8,
  ADD COLUMN subscription_share numeric DEFAULT 0.8;

-- Set specific shares for known creators (optional)
-- UPDATE creators SET direct_share = 0.8, subscription_share = 0.7 WHERE username IN ('나', 'grppl2');
