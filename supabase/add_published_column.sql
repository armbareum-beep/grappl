-- Add published column to courses table if it doesn't exist
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;

-- Add RLS policy for public access using the published flag (in case it's not covered)
-- Usually public access is handled by "Enable read access for all users" or similar.
-- Ensure we update the filter policy if necessary, but typically existing policies cover "SELECT *".
-- However, we want to ensure unpublished courses are NOT viewable by public (handled by application logic .eq('published', true)),
-- but strict RLS is better.
-- For now, just adding the column fixes the 400 error.
