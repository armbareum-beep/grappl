-- Add payout_settings column if it doesn't exist
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS payout_settings JSONB DEFAULT '{"type": "individual"}'::jsonb;

-- Add stripe_account_id column if it doesn't exist (for future use)
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Enable RLS on creators table if not already enabled
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;

-- Allow creators to update their own profile (including payout settings)
-- Assumes creators.id matches auth.users.id
DROP POLICY IF EXISTS "Creators can update their own profile" ON creators;
CREATE POLICY "Creators can update their own profile"
    ON creators
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow creators to view their own profile (already covered by public read, but good for explicit access)
DROP POLICY IF EXISTS "Creators can view their own profile" ON creators;
CREATE POLICY "Creators can view their own profile"
    ON creators
    FOR SELECT
    USING (auth.uid() = id);
