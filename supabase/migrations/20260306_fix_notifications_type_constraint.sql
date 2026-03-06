-- Fix notifications type constraint to allow all notification types
-- The constraint is too restrictive and blocks new notification types like 'content_approved', 'creator_new_content', etc.

-- Drop the restrictive type check constraint if it exists
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

-- Also check for any inline CHECK on the type column and try to drop it
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT con.conname
        FROM pg_catalog.pg_constraint con
        INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
        AND rel.relname = 'notifications'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) LIKE '%type%'
    LOOP
        EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_rec.conname);
    END LOOP;
END $$;
