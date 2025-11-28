
-- Create a table to store webhook logs for debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT,
    status TEXT, -- 'success', 'error', 'received'
    payload JSONB,
    error_message TEXT
);

-- Enable RLS but allow service role (used by Edge Function) to insert
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert webhook logs"
ON webhook_logs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can select webhook logs"
ON webhook_logs
FOR SELECT
TO service_role
USING (true);

-- Allow authenticated users (admins) to view logs if needed
CREATE POLICY "Admins can view webhook logs"
ON webhook_logs
FOR SELECT
TO authenticated
USING (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));
