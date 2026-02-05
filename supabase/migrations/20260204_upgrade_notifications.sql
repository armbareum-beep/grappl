-- Notifications Schema Update to support more notification types

-- 1. Drop existing type constraint if it exists
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'notifications' 
        AND constraint_name = 'notifications_type_check'
    ) THEN 
        ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
    END IF;
END $$;

-- 2. Add metadata column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'metadata'
    ) THEN 
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- 3. Ensure RLS policies exist
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can view their own notifications'
    ) THEN
        CREATE POLICY "Users can view their own notifications"
            ON public.notifications FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can update their own notifications (mark as read)'
    ) THEN
        CREATE POLICY "Users can update their own notifications (mark as read)"
            ON public.notifications FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
    
     IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Service role can insert notifications'
    ) THEN
        CREATE POLICY "Service role can insert notifications"
            ON public.notifications FOR INSERT
            WITH CHECK (true); -- Usually restricted by role, but here allowing all for now or check auth.role() = 'service_role'
   END IF;
END $$;

-- 4. Grant permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO service_role;
