-- Event registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Participant info
  participant_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,

  -- Competition specific
  belt_level TEXT,
  weight_class TEXT,
  team_name TEXT,
  actual_weight DECIMAL(5,2),

  -- Notes
  participant_note TEXT,
  organizer_note TEXT,

  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'cancelled', 'refunded', 'waitlist')),
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'external_link', 'manual_cash', 'manual_transfer')),
  payment_confirmed_at TIMESTAMPTZ,
  confirmed_by_organizer BOOLEAN DEFAULT false,

  -- Weigh-in
  weigh_in_status TEXT DEFAULT 'pending' CHECK (weigh_in_status IN ('pending', 'passed', 'failed', 'no_show')),
  weigh_in_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_status ON public.event_registrations(payment_status);

-- Enable RLS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view registrations for events they organize
CREATE POLICY "Organizers can view event registrations" ON public.event_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_registrations.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Users can view their own registrations
CREATE POLICY "Users can view own registrations" ON public.event_registrations
  FOR SELECT USING (auth.uid() = user_id);

-- Organizers can insert registrations for their events
CREATE POLICY "Organizers can create registrations" ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_registrations.event_id
      AND events.organizer_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

-- Users can insert their own registrations
CREATE POLICY "Users can register for events" ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Organizers can update registrations for their events
CREATE POLICY "Organizers can update registrations" ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_registrations.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Organizers can delete registrations for their events
CREATE POLICY "Organizers can delete registrations" ON public.event_registrations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_registrations.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_event_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_registrations_updated_at();
