
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'billing_key') THEN 
        ALTER TABLE subscriptions ADD COLUMN billing_key TEXT; 
    END IF; 
END $$;
