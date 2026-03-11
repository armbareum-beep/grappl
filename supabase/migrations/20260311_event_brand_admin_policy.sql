-- Allow admins full access to event_brands
CREATE POLICY "Admins can manage all event_brands"
  ON event_brands
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow admins full access to gym_member_verifications
CREATE POLICY "Admins can manage all gym_member_verifications"
  ON gym_member_verifications
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );
