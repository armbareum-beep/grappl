-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Make sure user_id is the primary key (or add a composite key if needed)
-- This block attempts to add a primary key if one doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'user_progress'::regclass 
        AND contype = 'p'
    ) THEN
        ALTER TABLE user_progress ADD PRIMARY KEY (user_id);
    END IF;
END $$;

-- Grant access to authenticated users
GRANT ALL ON user_progress TO authenticated;
GRANT ALL ON user_progress TO service_role;
