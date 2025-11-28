-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own creator status" ON creators;
DROP POLICY IF EXISTS "Public can read approved creators" ON creators;

-- Allow users to read their own creator status
CREATE POLICY "Users can read own creator status"
ON creators FOR SELECT
USING (auth.uid() = id);

-- Allow public to read approved creators
CREATE POLICY "Public can read approved creators"
ON creators FOR SELECT
USING (approved = true);
