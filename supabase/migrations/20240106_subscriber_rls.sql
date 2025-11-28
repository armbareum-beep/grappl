-- Allow subscribers to read lessons
DROP POLICY IF EXISTS "Subscribers can read lessons" ON lessons;
CREATE POLICY "Subscribers can read lessons"
ON lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_subscriber = true
  )
);

-- Allow subscribers to read videos
DROP POLICY IF EXISTS "Subscribers can read videos" ON videos;
CREATE POLICY "Subscribers can read videos"
ON videos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_subscriber = true
  )
);
